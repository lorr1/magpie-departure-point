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
    parser.add_argument('--data_dir', type=str, default='/dfs/scratch0/lorr1/magpie-departure-point/bootleg-labeling/gold', help='Where files loaded')
    parser.add_argument('--out_dir', type=str, default='/dfs/scratch0/lorr1/magpie-departure-point/bootleg-labeling/gold', help='Where files saved')
    parser.add_argument('--subfolder', type=str, default='processed')
    parser.add_argument('--alias2cands', type=str, default='/dfs/scratch0/lorr1/bootleg/bootleg-internal/tutorial_data/data/wiki_entity_data/entity_mappings/alias2qids.json')
    parser.add_argument('--qid2title', type=str, default='/dfs/scratch0/lorr1/bootleg/bootleg-internal/tutorial_data/data/wiki_entity_data/entity_mappings/qid2title.json')
    parser.add_argument('--qid2desc', type=str, default='/lfs/raiders8/0/lorr1/qid2desc.json')
    parser.add_argument('--seed', type=int, default=1234)
    parser.add_argument('--overwrite', action='store_true', help='Overwrite stored mention dump.')
    return parser

#==================================================
# DUMPING DATA
#==================================================
def dump_data(args, mention_dump_dir, qid2title, qid2desc, all_sentences):
    # Make sure sentences are in order
    all_sentences = sorted(all_sentences, key = lambda x: [x["doc_title"], x["doc_sent_idx"]])
    mention_aliases_spans = []
    for sent in all_sentences:
        mention_aliases_spans.append([sent["aliases"], sent["qids"], sent["spans"]])

    # Add the Not in List candidate
    random.seed(args.seed)
    mention_extractor = MentionExtractor.load(mention_dump_dir)
    out_file = os.path.join(args.out_data_dir, "04_trials_gold.js")
    unique_sents = {}
    all_data = []
    sent_idx_offset = 0
    cur_doc = all_sentences[0]["doc_title"]
    list_of_sentences, mention_aliases = [], []
    for i, sent in enumerate(all_sentences):
        if sent["doc_title"] == cur_doc:
            list_of_sentences.append(sent)
            mention_aliases.append(mention_aliases_spans[i])
        else:
            # FOR GOLD DATA, WE ONLY WANT 6 SENTENCES
            res = single_doc_data(sent_idx_offset, list_of_sentences[:10], mention_aliases[:10], mention_extractor, qid2desc, qid2title, unique_sents)
            sent_idx_offset += len(list_of_sentences[:10])
            all_data.append({
                "doc_title": cur_doc,
                "doc_qid": sent["doc_qid"],
                "doc_text": " ".join(map(lambda x: x["sentence"], list_of_sentences[:10])),
                "mentions": res
            })
            cur_doc = sent["doc_title"]
            list_of_sentences, mention_aliases = [], []
    # Run last doc
    res = single_doc_data(sent_idx_offset, list_of_sentences[:10], mention_aliases[:10], mention_extractor, qid2desc, qid2title, unique_sents)
    all_data.append({
        "doc_title": cur_doc,
        "doc_qid": sent["doc_qid"],
        "doc_text": " ".join(map(lambda x: x["sentence"], list_of_sentences[:10])),
        "mentions": res
    })

    with open(out_file, "w") as out_f:
        out_f.write("\n\nconst ned_info_gld = " + ujson.dumps(all_data, indent=4))
    return

def single_doc_data(sent_idx_offset, list_of_kept_sentences, mention_aliases_spans, mention_extractor, qid2desc, qid2title, unique_sents):
    mentions = []
    global_alias_idx = 0
    sent_idx = sent_idx_offset
    max_context_window = 4
    end_context_len = max_context_window
    start_context_len = 0
    for line_idx, mention_pair in tqdm(enumerate(mention_aliases_spans), desc="Dumping mentions"):
        # Ensure uniqueness
        line = list_of_kept_sentences[line_idx]
        if line["doc_title"] not in unique_sents:
            unique_sents[line["doc_title"]] = set()
        assert line["doc_sent_idx"] not in unique_sents[line["doc_title"]], line
        unique_sents[line["doc_title"]].add(line["doc_sent_idx"])

        # Gather aliases and spans for a 5 line window, making sure spans are consistent within this block and the rest of the doc
        sentence_window = [x["sentence"] for x in list_of_kept_sentences[line_idx - start_context_len:line_idx + end_context_len]]
        all_aliases, all_qids, all_spans = zip(*mention_aliases_spans[line_idx - start_context_len:line_idx + end_context_len])
        all_spans_adjusted = []
        offset = 0
        for i in range(0, len(all_spans)):
            if i > 0:
                offset += len(sentence_window[i - 1].split())
            all_spans_adjusted.append([[sp[0] + offset, sp[1] + offset] for sp in all_spans[i]])
        for al_idx, (alias, qid, span) in enumerate(zip(all_aliases[start_context_len], all_qids[start_context_len], all_spans_adjusted[start_context_len])):
            # Shuffle the candidate lists to not add bias toward selecting the first entity
            alias_idx_offset = 0
            for sub_al_list in all_aliases[0:start_context_len]:
                alias_idx_offset += len(sub_al_list)

            cands = mention_extractor.get_candidates(alias)
            random.shuffle(cands)
            res = {
                "doc_qid": line["doc_qid"],
                "doc_title": line["doc_title"],
                "doc_sent_idx": line["doc_sent_idx"],
                "alias": alias,
                "pop_qid": qid,
                "candidates": cands,
                "candidate_titles": [qid2title.get(q, "") for q in cands],
                "candidate_descriptions": [qid2desc.get(q, "") for q in cands],
                "span_l": span[0],
                "span_r": span[1],
                "sent_idx": sent_idx,
                "sent_alias_idx": al_idx,
                "alias_idx": al_idx + alias_idx_offset,
                "guid_idx": f"{sent_idx}_{global_alias_idx}",
                "sentence": " ".join(sentence_window),
                "all_aliases": flatten(all_aliases),
                "all_spans": flatten(all_spans_adjusted)
            }
            mentions.append(res)
            global_alias_idx += 1
        sent_idx += 1
        if start_context_len < max_context_window - 1:
            start_context_len += 1
            end_context_len -= 1
        else:
            start_context_len = 0
            end_context_len = max_context_window
    return mentions

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
        mention_extractor = MentionExtractor(max_alias_len=5, max_candidates=27, alias2qids=args.alias2cands, qid2title=qid2title)
        mention_extractor.dump(mention_dump_dir)
    mention_extractor = MentionExtractor.load(mention_dump_dir)

    print(f"Loading qid2desc from {args.qid2desc}")
    with open(args.qid2desc) as in_f:
        qid2desc = ujson.load(in_f)
    # Loading up sentences

    print(f"Loading data from {args.data_dir}...")
    files = glob.glob(f"{args.data_dir}/*.jsonl")
    if len(files) <= 0:
        print(f"Didn't find any files at {args.data_dir}")
        return

    print(f"Found {len(files)} files")
    all_sentences = []
    for f in files:
        with open(f) as in_f:
            for line in in_f:
                doc = ujson.loads(line)
                for sent in doc["sentences"]:
                    sent["doc_qid"] = doc["qid"]
                    sent["doc_title"] = doc["title"]
                    new_aliases, new_spans, new_qids = [], [], []
                    for i in range(len(sent["aliases"])):
                        if sent["label_type"][i] != "Pronoun" and mention_extractor.does_alias_exist(sent["aliases"][i]):
                            new_aliases.append(sent["aliases"][i])
                            new_spans.append(sent["spans"][i])
                            new_qids.append(sent["qids"][i])
                    if len(new_aliases) > 0:
                        sent["aliases"] = new_aliases
                        sent["qids"] = new_qids
                        sent["spans"] = new_spans
                        all_sentences.append(sent)
    print(f"Extracted {len(all_sentences)} sentences")
    dump_data(args, mention_dump_dir, qid2title, qid2desc, all_sentences)

    print(f"Finished in {time.time()-gl_start}s. Data saved in {os.path.join(args.out_data_dir, '04_trials_gold.js')}")




if __name__ == '__main__':
    main()
