from tqdm import tqdm
import marisa_trie, string, os, ujson
from collections import defaultdict
import spacy, nltk, unicodedata
from bootleg_data_prep.utils.classes.record_trie_collection import RecordTrieCollection
nlp = spacy.load("en_core_web_sm", disable=['parser', 'ner'])

ALIAS2QID = "alias2qid"

def get_lnrm(s, strip, lower):
    """Convert a string to its lnrm form
    We form the lower-cased normalized version l(s) of a string s by canonicalizing
    its UTF-8 characters, eliminating diacritics, lower-casing the UTF-8 and
    throwing out all ASCII-range characters that are not alpha-numeric.
    from http://nlp.stanford.edu/pubs/subctackbp.pdf Section 2.3
    Args:
        input string
    Returns:
        the lnrm form of the string
    """
    if not strip and not lower:
        return s
    lnrm = str(s)
    if lower:
        lnrm = lnrm.lower()
    if strip:
        lnrm = unicodedata.normalize('NFD', lnrm)
        lnrm = ''.join([x for x in lnrm if (not unicodedata.combining(x)
                                            and x.isalnum() or x == ' ')]).strip()
    # will remove if there are any duplicate white spaces e.g. "the  alias    is here"
    lnrm = " ".join(lnrm.split())
    return lnrm

def get_new_to_old_dict(split_sentence):
    old_w = 0
    new_w = 0
    new_to_old = defaultdict(list)
    while old_w < len(split_sentence):
        old_word = split_sentence[old_w]
        tokenized_word = nlp(old_word)
        new_w_ids = list(range(new_w, new_w + len(tokenized_word)))
        for i in new_w_ids:
            new_to_old[i] = old_w
        new_w = new_w + len(tokenized_word)
        old_w += 1
    new_to_old[new_w] = old_w
    new_to_old = dict(new_to_old)
    return new_to_old

def get_all_aliases(alis2qids_f, cut_off):
    # Load alias2qids
    alias2qids = {}
    print(f"Loading candidate mapping from {alis2qids_f} with cut off of {cut_off}")
    with open(alis2qids_f) as in_f:
        alias2qidcands = ujson.load(in_f)

    for al in tqdm(alias2qidcands):
        alias2qids[al] = [c[0] for c in sorted(alias2qidcands[al], key=lambda x: x[1], reverse=True)][:cut_off]
    print(f"Loaded candidate mapping with {len(alias2qids)} aliases.")
    return alias2qids

class MentionExtractor:
    def __init__(self, max_alias_len, max_candidates, alias2qids=None, qid2title=None, tri_collection=None):
        # Overall max candidates we allow any alias - we sample max_candidates from this amount
        cut_off = 50

        if alias2qids is None and qid2title is None:
            assert tri_collection is not None, f"You must provide either alias2qids and qid2title or a tri_collection"
        if tri_collection is None:
            assert alias2qids is not None and qid2title is not None, f"You must provide either alias2qids and qid2title or a tri_collection"

        if tri_collection is None:
            # Load alias2qid
            if type(alias2qids) is str:
                assert os.path.exists(alias2qids), f"You provided {alias2qids} as a string but it's not a path that exists"
                alias2qids = get_all_aliases(alias2qids, cut_off)
            elif type(alias2qids) is dict:
                alias2onlyqids = {}
                print("Loading candidate mapping from dict")
                for al in tqdm(alias2qids):
                    alias2onlyqids[al] = [c[0] for c in sorted(alias2qids[al], key=lambda x: x[1], reverse=True)][:cut_off]
                alias2qids = alias2onlyqids
            else:
                print(f"We do not support input type of {type(alias2qids)}. Only dict or string path.")

            if type(qid2title) is str:
                assert os.path.exists(qid2title), f"You provided {qid2title} as a string but it's not a path that exists"
                with open(qid2title) as in_f:
                    qid2title = ujson.load(in_f)
            elif type(qid2title) is not dict:
                print(f"We do not support input type of {type(qid2title)}. Only dict or string path.")

            # This maps our keys that we use in the helper functions below to the right tri in tri collection.
            # The values are specific strings as outlines in the record trie collection class
            fmt_types = {ALIAS2QID: "qid_cand"}
            max_values = {ALIAS2QID: cut_off}
            input_dicts = {ALIAS2QID: alias2qids}

            print(f"Max Values {max_values}")
            self.tri_collection = RecordTrieCollection(load_dir=None, input_dicts=input_dicts, vocabulary=qid2title,
                                                                fmt_types=fmt_types, max_values=max_values)
        else:
            self.tri_collection = tri_collection

        self.max_alias_len = max_alias_len
        self.max_candidates = max_candidates

    def dump(self, dump_dir):
        constants_file = os.path.join(dump_dir, "constants.json")
        with open(constants_file, "w") as out_f:
            ujson.dump({"max_alias_len": self.max_alias_len, "max_candidates": self.max_candidates}, out_f)
        self.tri_collection.dump(save_dir=dump_dir)
        return

    @classmethod
    def load(cls, dump_dir):
        constants_file = os.path.join(dump_dir, "constants.json")
        with open(constants_file) as in_f:
            constants = ujson.load(in_f)
        max_alias_len = constants["max_alias_len"]
        max_candidates = constants["max_candidates"]
        tri_collection = RecordTrieCollection(load_dir=dump_dir)
        return cls(max_alias_len, max_candidates, tri_collection=tri_collection)

    def get_candidates(self, alias):
        return self.tri_collection.get_value(ALIAS2QID, alias)

    def does_alias_exist(self, alias):
        return self.tri_collection.is_key_in_trie(ALIAS2QID, alias)

    def extract_mentions(self, sentence):
        PUNC = string.punctuation
        plural = set(["s", "'s"])
        table = str.maketrans(dict.fromkeys(PUNC))  # OR {key: None for key in string.punctuation}
        used_aliases = []
        doc = nlp(sentence)
        split_sent = sentence.split()
        new_to_old_span = get_new_to_old_dict(split_sent)
        # find largest aliases first
        for n in tqdm(range(self.max_alias_len + 1, 0, -1)):
            grams = nltk.ngrams(doc, n)
            j_st = -1
            j_end = n - 1
            for gram_words in grams:
                j_st += 1
                j_end += 1
                j_st_adjusted = new_to_old_span[j_st]
                j_end_adjusted = new_to_old_span[j_end]
                is_subword = j_st_adjusted == j_end_adjusted
                if j_st > 0:
                    is_subword = is_subword | (j_st_adjusted == new_to_old_span[j_st - 1])
                # j_end is exclusive and should be a new word from the previous j_end-1
                is_subword = is_subword | (j_end_adjusted == new_to_old_span[j_end - 1])
                if is_subword:
                    continue
                if len(gram_words) == 1 and gram_words[0].pos_ == "PROPN":
                    if j_st > 0 and doc[j_st - 1].pos_ == "PROPN":
                        continue
                    # End spans are exclusive so no +1
                    if j_end < len(doc) and doc[j_end].pos_ == "PROPN":
                        continue

                # We don't want punctuation words to be used at the beginning/end
                if len(gram_words[0].text.translate(table).strip()) == 0 or len(gram_words[-1].text.translate(table).strip()) == 0 \
                        or gram_words[-1].text in plural or gram_words[0].text in plural:
                    continue
                assert j_st_adjusted != j_end_adjusted
                joined_gram = " ".join(split_sent[j_st_adjusted:j_end_adjusted])
                # If 's in alias, make sure we remove the space and try that alias, too
                joined_gram_merged_plural = joined_gram.replace(" 's", "'s")
                gram_attempt = get_lnrm(joined_gram, strip=True, lower=True)
                gram_attempt_merged_plural = get_lnrm(joined_gram_merged_plural, strip=True, lower=True)
                # Remove numbers
                if gram_attempt.isnumeric():
                    continue
                final_gram = None
                if self.does_alias_exist(gram_attempt):
                    final_gram = gram_attempt
                elif self.does_alias_exist(gram_attempt_merged_plural):
                    final_gram = gram_attempt_merged_plural

                if final_gram is not None:
                    keep = True
                    # We start from the largest n-grams and go down in size. This prevents us from adding an alias that is a subset of another.
                    # For example: "Tell me about the mother on how I met you mother" will find "the mother" as alias and "mother". We want to
                    # only take "the mother" and not "mother" as it's likely more descriptive of the real entity.
                    for u_al in used_aliases:
                        u_j_st = u_al[1]
                        u_j_end = u_al[2]
                        if j_st_adjusted < u_j_end and j_end_adjusted > u_j_st:
                            keep = False
                            break
                    if not keep:
                        continue
                    used_aliases.append(tuple([final_gram, j_st_adjusted, j_end_adjusted]))
        # sort based on span order
        aliases_for_sorting = sorted(used_aliases, key=lambda elem: [elem[1], elem[2]])
        used_aliases = [a[0] for a in aliases_for_sorting]
        spans = [[a[1], a[2]] for a in aliases_for_sorting]
        assert all([sp[1] <= len(doc) for sp in spans]), f"{spans} {sentence}"
        return used_aliases, spans