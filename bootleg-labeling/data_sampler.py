import random, ujson
from collections import Counter
from tqdm import tqdm

class Sampler:
    def extract_metadata(self, file):
        """ Will be called on files of Wikipedia documents to extract any metadata for sampling """
        raise NotImplementedError()

    def merge_metadata(self, list_of_metadata, already_merged=None):
        """ Will merge lists of outputs from extract_metadata """
        raise NotImplementedError()

    def finalize_metadata(self, merged_metadata):
        """ This will take output of merge_metadata and do final postprocessing and storing """
        raise NotImplementedError()

    def keep_sentence(self, line):
        """ Decides whether or not to keep the sentence in the sample or not """
        raise NotImplementedError()


class DocSampler(Sampler):
    def __init__(self, perc):
        self.perc = perc
        self.doc_qids_to_keep = None

    def extract_metadata(self, file):
        num_lines = sum(1 for _ in open(file))

        doc_qids = set()
        anchor_qids = Counter()

        with open(file) as in_f:
            for doc in tqdm(in_f, total=num_lines, desc=f"Processing {file}"):
                doc = ujson.loads(doc)
                if str(doc["qid"]) != "-1":
                    doc_qids.add(doc["qid"])
                    for sentence in doc["sentences"]:
                        aliases = sentence["aliases"]
                        qids = sentence["qids"]
                        golds = sentence.get("golds", [True]*len(aliases))
                        for i, (al, q, gld) in enumerate(zip(aliases, qids, golds)):
                            if gld:
                                anchor_qids[q] += 1
        return (doc_qids, anchor_qids)

    def merge_metadata(self, metadata, already_merged=None):
        if already_merged is None:
            already_merged = (set(), Counter())
        already_merged[0].update(metadata[0])
        already_merged[1].update(metadata[1])
        return already_merged

    def finalize_metadata(self, merged_metadata):
        doc_qids, qid_cnts = merged_metadata
        tails = set(q for q in qid_cnts if qid_cnts[q] < 11)
        torso = set(q for q in qid_cnts if 10 < qid_cnts[q] < 1001)
        head = set(q for q in qid_cnts if 1000 < qid_cnts[q])
        # k = int(self.perc * len(merged_metadata))
        # k = max(1, k)
        # self.doc_qids_to_keep = set(random.sample(list(merged_metadata), k=k))
        self.doc_qids_to_keep = {random.sample(tails, k=1)[0],
                                 random.sample(torso, k=1)[0],
                                 random.sample(head, k=1)[0]}
        return

    def keep_sentence(self, line):
        return line["doc_qid"] in self.doc_qids_to_keep and line["doc_sent_idx"] < 11
