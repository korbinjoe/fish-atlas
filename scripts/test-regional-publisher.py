"""Regression checks for preservation of earlier editorial imports."""
import runpy
import unittest
from pathlib import Path

merge = runpy.run_path(str(Path(__file__).with_name("publish-regional-batches.py")))["merge_catalog"]


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


if __name__ == "__main__":
    unittest.main()
