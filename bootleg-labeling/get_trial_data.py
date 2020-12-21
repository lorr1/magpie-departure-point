import argparse
import multiprocessing
import os, pickle, shutil, time, ujson
from datetime import datetime
from collections import defaultdict
import glob, random
from tqdm import tqdm
from data_sampler import DocSampler
from mention_extraction import MentionExtractor

def get_arg_parser():
    parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    # Data and runs
    parser.add_argument('--data_dir', type=str, default='/lfs/raiders8/0/lorr1/data/wiki_dump/alias_filtered_sentences', help='Where files loaded')
    parser.add_argument('--out_dir', type=str, default='/dfs/scratch0/lorr1/magpie-departure-point/bootleg-labeling/data', help='Where files saved')
    parser.add_argument('--subfolder', type=str, default='final')
    parser.add_argument('--alias2cands', type=str, default='/dfs/scratch0/lorr1/bootleg/bootleg-internal/tutorial_data/data/wiki_entity_data/entity_mappings/alias2qids.json')
    parser.add_argument('--qid2title', type=str, default='/dfs/scratch0/lorr1/bootleg/bootleg-internal/tutorial_data/data/wiki_entity_data/entity_mappings/qid2title.json')
    parser.add_argument('--qid2desc', type=str, default='/lfs/raiders8/0/lorr1/qid2desc.json')
    parser.add_argument('--sampler', type=str, default='Doc', choices=['Doc'])
    parser.add_argument('--sample_perc', type=float, default=0.0005)
    parser.add_argument('--seed', type=int, default=1234)
    parser.add_argument('--strip', action='store_true', help='If set, will strip punctuation of aliases.')
    parser.add_argument('--lower', action='store_true', help='If set, will lower case aliases.')
    parser.add_argument('--test', action='store_true', help='If set, will only generate for one file.')
    parser.add_argument('--overwrite', action='store_true', help='Overwrite stored mention dump.')
    parser.add_argument('--processes', type=int, default=int(50))
    return parser

#==================================================
# EXTRACTING METADATA
#==================================================

def extract_metadata_init(sampler):
    global sampler_global
    sampler_global = sampler

def extract_metadata(args, sampler, in_files):
    all_process_args = [tuple([i + 1,
                               len(in_files),
                               args,
                               in_files[i],
                               ]) for i in range(len(in_files))]
    pool = multiprocessing.Pool(processes=args.processes, initializer=extract_metadata_init, initargs=[sampler])
    merged_metadata = None
    st = time.time()
    for metadata in pool.imap_unordered(extract_metadata_hlp, all_process_args, chunksize=1):
        merged_metadata = sampler.merge_metadata(metadata, merged_metadata)
    print(f"Extracted {len(merged_metadata)} merged metadata in {time.time() - st}s")
    pool.close()
    print(f"Finalizing metdata")
    sampler.finalize_metadata(merged_metadata)
    print(f"Done")
    return

def extract_metadata_hlp(all_args):
    i, total, args, in_filepath = all_args
    metadata = sampler_global.extract_metadata(in_filepath)
    return metadata

#==================================================
# SAMPLING DATA
#==================================================
def sample_data_init(sampler):
    global sampler_global
    sampler_global = sampler

def sample_data(args, sampler, in_files):
    # Directory for saving dumped data
    temp_dir = "_temp_trial_data"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)

    all_process_args = [tuple([i + 1,
                               len(in_files),
                               args,
                               in_files[i],
                               os.path.join(temp_dir, os.path.basename(in_files[i]))
                               ]) for i in range(len(in_files))]
    pool = multiprocessing.Pool(processes=args.processes, initializer=sample_data_init, initargs=[sampler])
    st = time.time()
    for _ in pool.imap_unordered(sample_data_hlp, all_process_args, chunksize=1):
        pass
    pool.close()

    all_sentences = []
    for i in range(len(in_files)):
        saved_data_file = os.path.join(temp_dir, os.path.basename(in_files[i]))
        print(f"Reading in data from {saved_data_file}")
        with open(saved_data_file) as in_f:
            for line in in_f:
                all_sentences.append(ujson.loads(line))
    print(f"Extracted {len(all_sentences)} lines in {time.time() - st}s")
    shutil.rmtree(temp_dir)
    return all_sentences

def sample_data_hlp(all_args):
    i, total, args, in_filepath, out_filepath = all_args
    total_lines = sum(1 for _ in open(in_filepath))
    random.seed(args.seed)
    with open(in_filepath) as in_f, open(out_filepath, "w") as out_f:
        for doc in tqdm(in_f, total=total_lines, desc=f"Processing {in_filepath}"):
            doc = ujson.loads(doc)
            doc_sents_to_keep = []
            for sent in doc["sentences"]:
                sent["doc_qid"] = doc["qid"]
                sent["doc_title"] = doc["title"]
                if sampler_global.keep_sentence(sent):
                    doc_sents_to_keep.append(sent)
            for kept_sent in doc_sents_to_keep:
                out_f.write(ujson.dumps(kept_sent) + "\n")
    return

#==================================================
# DUMPING DATA
#==================================================
def dump_data_init(mention_dump_dir):
    global mention_extractor_global
    mention_extractor_global = MentionExtractor.load(mention_dump_dir)

def dump_data(args, mention_dump_dir, qid2title, qid2desc, list_of_kept_sentences):
    # Make sure sentences are in order
    list_of_kept_sentences = sorted(list_of_kept_sentences, key = lambda x: [x["doc_title"], x["doc_sent_idx"]])
    # Do mention extraction in parallel
    print(f"Creating pool with {args.processes} processes")
    pool = multiprocessing.Pool(processes=args.processes, initializer=dump_data_init, initargs=[mention_dump_dir])
    print(f"Done creating pool")
    st = time.time()
    mention_aliases_spans = []
    total_args = len(list_of_kept_sentences)
    for res in tqdm(pool.imap(dump_data_hlp, list_of_kept_sentences, chunksize=1), total=total_args, desc="Extracting mentions"):
        mention_aliases_spans.append(res)
    pool.close()
    print(f"Finished mention extraction in {time.time() - st}s")

    # Add the Not in List candidate
    random.seed(args.seed)
    mention_extractor = MentionExtractor.load(mention_dump_dir)
    out_file = os.path.join(args.out_data_dir, "04_trials.js")
    mentions = []
    sent_idx = 0
    window_offset = 0
    max_context_window = 3
    end_context_len = max_context_window
    start_context_len = 0
    unique_sents = {}
    for line_idx, mention_pair in tqdm(enumerate(mention_aliases_spans), desc="Dumping mentions"):
        # Ensure uniqueness
        line = list_of_kept_sentences[line_idx]
        if line["doc_title"] not in unique_sents:
            unique_sents[line["doc_title"]] = set()
        assert line["doc_sent_idx"] not in unique_sents[line["doc_title"]], line
        unique_sents[line["doc_title"]].add(line["doc_sent_idx"])

        # Gather aliases and spans for a 5 line window, making sure spans are consistent within this block and the rest of the doc
        sentence_window = [x["sentence"] for x in list_of_kept_sentences[line_idx-start_context_len:line_idx+end_context_len]]
        all_aliases, all_spans = zip(*mention_aliases_spans[line_idx-start_context_len:line_idx+end_context_len])
        all_spans_adjusted = [all_spans[0]]
        for i in range(1, len(all_spans)):
            offset = len(sentence_window[i-1].split())
            all_spans_adjusted.append([[sp[0]+offset+window_offset, sp[1]+offset+window_offset] for sp in all_spans[i]])
        print(sentence_window, all_spans, all_spans_adjusted)
        for al_idx, (alias, span) in enumerate(zip(all_aliases[start_context_len], all_spans_adjusted[start_context_len])):
            # Shuffle the candidate lists to not add bias toward selecting the first entity
            cands = mention_extractor.get_candidates(alias)
            random.shuffle(cands)
            res = {
                "doc_qid": line["doc_qid"],
                "doc_title": line["doc_title"],
                "doc_sent_idx": line["doc_sent_idx"],
                "alias": alias,
                "candidates": cands,
                "candidate_titles": [qid2title.get(q, "") for q in cands],
                "candidate_descriptions": [qid2desc.get(q, "") for q in cands],
                "span_l": span[0],
                "span_r": span[1],
                "sent_idx": sent_idx,
                "alias_idx": al_idx,
                "guid_idx": f"{sent_idx}_{al_idx}",
                "sentence": " ".join(sentence_window),
                "all_aliases": flatten(all_aliases),
                "all_spans": flatten(all_spans_adjusted)
            }
            mentions.append(res)
        sent_idx += 1
        if start_context_len < int(max_context_window/2):
            start_context_len += 1
            end_context_len -= 1
        else:
            window_offset += len(line["sentence"].split())+1
    flattened_data = {"mentions": mentions}

    with open(out_file, "w") as out_f:
        out_f.write("const ned_info = " + ujson.dumps(flattened_data, indent=4))
    return

def dump_data_hlp(line):
    return mention_extractor_global.extract_mentions(line["sentence"])

def flatten(t):
    return [item for sublist in t for item in sublist]

def main():
    gl_start = time.time()
    multiprocessing.set_start_method("spawn")
    args = get_arg_parser().parse_args()
    print(ujson.dumps(vars(args), indent=4))
    random.seed(args.seed)

    args.out_data_dir = os.path.join(args.out_dir, args.subfolder)

    if os.path.exists(args.out_data_dir):
        print(f"Removing {args.out_data_dir}")
        shutil.rmtree(args.out_data_dir)
    os.makedirs(args.out_data_dir)

    print(f"Loading data from {args.data_dir}...")
    files = glob.glob(f"{args.data_dir}/*.jsonl")
    if args.test:
        files = files[:1]
    if len(files) <= 0:
        print(f"Didn't find any files at {args.data_dir}")
        return
    print(f"Found {len(files)} files")

    print(f"Creating sampler")
    if args.sampler == "Doc":
        sampler = DocSampler(args.sample_perc)
    else:
        raise NotImplementedError()
    print("Starting to extract metadata")
    # Samplers work in 2 steps - extract metadata, sample lines
    #==============================================
    # EXTRACT AND CREATE METADATA
    #==============================================

    # Save state in case of crash
    temp_file = "_temp/sampler_post_extract.pkl"
    extract_metadata(args, sampler, files)
    os.makedirs(os.path.dirname(temp_file), exist_ok=True)
    with open(temp_file, "wb") as out_f:
        pickle.dump(sampler, out_f)

    # with open(temp_file, "rb") as in_f:
    #     sampler = pickle.load(in_f)
    
    #==============================================
    # SAMPLE FROM FILES
    #==============================================
    list_of_kept_sentences = sample_data(args, sampler, files)
    if len(list_of_kept_sentences) <= 0:
        print(f"You have no sentences after sampling")
        return
    # Final step is to format data for the views in _magpie
    #==============================================
    # DUMP RESULTS
    #==============================================

    mention_dump_dir = os.path.join(args.out_dir, f"_saved_mention_extractor_{os.path.splitext(os.path.basename(args.alias2cands))[0]}")
    print(f"Loading qid2title from {args.qid2title}")
    with open(args.qid2title) as in_f:
        qid2title = ujson.load(in_f)
    if not os.path.exists(mention_dump_dir) or args.overwrite:
        os.makedirs(mention_dump_dir, exist_ok=True)
        print(f"Building mention extractor for {mention_dump_dir}")
        mention_extractor = MentionExtractor(max_alias_len=5, max_candidates=9, alias2qids=args.alias2cands, qid2title=qid2title)
        mention_extractor.dump(mention_dump_dir)
    print(f"Loading qid2desc from {args.qid2desc}")
    with open(args.qid2desc) as in_f:
        qid2desc = ujson.load(in_f)
    dump_data(args, mention_dump_dir, qid2title, qid2desc, list_of_kept_sentences)

    print(f"Finished in {time.time()-gl_start}s. Data saved in {os.path.join(args.out_data_dir, '04_trials.js')}")




if __name__ == '__main__':
    main()
