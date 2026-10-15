"""Regression checks for preservation of earlier editorial imports."""
import copy
import runpy
import unittest
from pathlib import Path

publisher = runpy.run_path(str(Path(__file__).with_name("publish-regional-batches.py")))
merge = publisher["merge_catalog"]
validate_distribution = publisher["validate_distribution"]


class IncrementalCatalogTests(unittest.TestCase):
    def test_existing_curated_and_photo_taxa_survive_repeated_batches(self):
        previous = [
            {"key": 1, "scientific": "Alpha first", "family": "Alphaidae", "vernacular": "Reviewed name", "reviewCandidate": True, "curatedId": "alpha"},
            {"key": 2, "scientific": "Beta second", "family": "Betaidae", "vernacular": "", "reviewCandidate": False},
        ]
        additions = [
            {"key": 2, "scientific": "Beta second", "family": "Betaidae", "vernacular": "Source name", "reviewCandidate": True},
            {"key": 3, "scientific": "Gamma third", "family": "Gammaidae", "vernacular": "New name", "reviewCandidate": True},
        ]
        result = merge(previous, additions)
        self.assertEqual(result[0], previous[0])
        self.assertEqual(result[1]["vernacular"], "Source name")
        self.assertTrue(result[1]["reviewCandidate"])
        self.assertEqual(merge(result, additions), result)
        self.assertEqual(previous[1]["vernacular"], "")

    def test_conflicting_names_and_keys_are_rejected(self):
        previous = [{"key": 1, "scientific": "Alpha first", "family": "Alphaidae", "vernacular": "", "reviewCandidate": True}]
        for patch in ({**previous[0], "key": 2}, {**previous[0], "scientific": "Beta second"}, {**previous[0], "family": "Betaidae"}):
            with self.assertRaises(ValueError):
                merge(previous, [patch])


class DistributionProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.record = {"scientific": "Alpha first", "acceptedScientific": "Alpha first",
                       "sourceUrl": "https://museum.example/native-range", "snapshot": "2026-10-15",
                       "rangeText": "Native to the named river.", "rangeRef": None, "unlocatedReason": "",
                       "links": [{"locationId": "river-alpha", "evidence": "Named native drainage.",
                                  "sourceUrl": "https://museum.example/native-range", "ecosystemCode": None}]}

    def test_primary_sources_can_have_no_fishbase_reference_or_ecosystem(self):
        validate_distribution("alpha", self.record, "Alpha first", {"river-alpha"})

    def test_missing_provenance_is_rejected_before_publishing(self):
        for field in ("snapshot", "rangeRef", "unlocatedReason"):
            record = copy.deepcopy(self.record)
            record.pop(field)
            with self.assertRaises(ValueError):
                validate_distribution("alpha", record, "Alpha first", {"river-alpha"})
        record = copy.deepcopy(self.record)
        record["links"][0].pop("ecosystemCode")
        with self.assertRaises(ValueError):
            validate_distribution("alpha", record, "Alpha first", {"river-alpha"})


if __name__ == "__main__":
    unittest.main()
