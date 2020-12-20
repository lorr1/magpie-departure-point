import os, sys, ujson, glob, argparse
from tqdm import tqdm

def get_arg_parser():
    parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    # Data and runs
    parser.add_argument('--in_dir', type=str, default='/lfs/raiders8/0/lorr1/wikidata/processed_batches/description', help='Where description folder')
    parser.add_argument('--qid2title', type=str, default='/lfs/raiders8/0/lorr1/data/wiki_dump/alias_filtered_sentences/entity_db/entity_mappings/qid2title.json', help='Where description folder')
    parser.add_argument('--out_file', type=str, default='/lfs/raiders8/0/lorr1/qid2desc.json', help='Where file is saved')
    return parser


def main():
    parser = get_arg_parser()
    args = parser.parse_args()

    with open(args.qid2title) as in_f:
        filter_qids = set(ujson.load(in_f).keys())
    print(f"Found {len(filter_qids)} qids to filter")

    in_files = glob.glob(os.path.join(args.in_dir, "*"))
    print(f"Processing {len(in_files)}")

    qid2desc = {}
    for file in tqdm(in_files):
        with open(file) as in_f:
            for line in in_f:
                line = ujson.loads(line)
                if line["qid"] in filter_qids:
                    qid2desc[line["qid"]] = line["description"]

    with open(args.out_file, "w") as out_f:
        ujson.dump(qid2desc, out_f)


if __name__ == '__main__':
    main()
