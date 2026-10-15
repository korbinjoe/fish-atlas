"""Regression checks for preservation of earlier editorial imports."""
import copy
import runpy
import unittest
from pathlib import Path

publisher = runpy.run_path(str(Path(__file__).with_name("publish-regional-batches.py")))
merge = publisher["merge_catalog"]
validate_distribution = publisher["validate_distribution"]
merge_native = publisher["merge_distribution_additions"]
normalize_name = publisher["normalize_profile_name"]


class ChineseDisplayNameTests(unittest.TestCase):
    def test_script_repair_preserves_source_aliases_and_species_identity(self):
        source = {"id": "example", "scientific": "Example fish", "name": "黃鰭刺鰕虎魚",
                  "photo": {"path": "/media/source.jpg"}, "aliases": ["Source English name"]}
        result = normalize_name(source)
        self.assertEqual(result["name"], "黄鳍刺鰕虎鱼")
        self.assertIn(source["name"], result["aliases"])
        self.assertEqual(result["scientific"], source["scientific"])
        self.assertEqual(result["photo"], source["photo"])
        self.assertEqual(source["name"], "黃鰭刺鰕虎魚")
        self.assertEqual(normalize_name(result), result)

    def test_wrong_species_name_does_not_survive_as_a_search_alias(self):
        result = normalize_name({"scientific": "Moxostoma macrolepidotum", "name": "马斯科吸口鱼",
                                 "aliases": ["馬斯科吸口魚", "Shorthead redhorse"]})
        self.assertEqual(result["name"], "大鳞吸口鱼")
        self.assertEqual(result["aliases"], ["Shorthead redhorse"])

    def test_standard_bmp_spelling_stays_stable_after_repeated_imports(self):
        result = normalize_name({"scientific": "Ictalurus punctatus", "name": "斑点叉尾𫚔"})
        self.assertEqual(result["name"], "斑点叉尾鮰")
        self.assertIn("斑点叉尾𫚔", result["aliases"])
        self.assertEqual(normalize_name(result), result)


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

    def test_restricted_display_points_need_both_coordinates_and_source(self):
        record = copy.deepcopy(self.record)
        link = record["links"][0]
        link.update({"displayCoordinates": [-72.32, -41.64],
                     "displayCoordinateSourceUrl": "https://paper.example/native-site",
                     "displayCoordinateNote": "A shared display anchor on the documented lower river."})
        validate_distribution("alpha", record, "Alpha first", {"river-alpha"})
        for field in ("displayCoordinates", "displayCoordinateSourceUrl", "displayCoordinateNote"):
            incomplete = copy.deepcopy(record)
            incomplete["links"][0].pop(field)
            with self.assertRaises(ValueError):
                validate_distribution("alpha", incomplete, "Alpha first", {"river-alpha"})

    def test_invalid_display_coordinates_are_rejected(self):
        for coordinates in ([1], [1, 100], [200, 1], [float("nan"), 1], [True, 1]):
            record = copy.deepcopy(self.record)
            record["links"][0].update({"displayCoordinates": coordinates,
                                       "displayCoordinateSourceUrl": "https://paper.example/native-site",
                                       "displayCoordinateNote": "Native reach."})
            with self.assertRaises(ValueError):
                validate_distribution("alpha", record, "Alpha first", {"river-alpha"})

    def test_independent_native_batches_preserve_each_others_links(self):
        first_link = {**self.record["links"][0], "locationId": "river-beta"}
        second_link = {**self.record["links"][0], "locationId": "river-gamma"}
        first = merge_native(self.record, {"links": [first_link], "reviewNotes": ["Reviewed beta."]})
        second = merge_native(first, {"links": [second_link], "reviewNotes": ["Reviewed gamma."]})
        self.assertEqual([link["locationId"] for link in second["links"]], ["river-alpha", "river-beta", "river-gamma"])
        self.assertEqual(second["sourceUrl"], self.record["sourceUrl"])
        self.assertEqual(len(self.record["links"]), 1)
        self.assertEqual(merge_native(second, {"links": [second_link]}), second)

    def test_native_additions_cannot_silently_rewrite_old_sources(self):
        conflict = {**self.record["links"][0], "sourceUrl": "https://other.example/range"}
        with self.assertRaises(ValueError):
            merge_native(self.record, {"links": [conflict]})
        with self.assertRaises(ValueError):
            merge_native(self.record, {"links": [self.record["links"][0]], "rangeText": "New unreviewed concept."})


if __name__ == "__main__":
    unittest.main()
