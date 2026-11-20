import json
import unittest

from tools.validate_pack import DEFAULT, validate


class InitialPackTests(unittest.TestCase):
    def setUp(self):
        self.pack = json.loads(DEFAULT.read_text(encoding="utf-8"))
        self.first = self.pack["prompts"][0]

    def test_complete_pack(self):
        self.assertEqual(validate(self.pack), [])

    def test_required_fields_and_bounds(self):
        for field, value in [("rights_note", "  "), ("answer", "字" * 33), ("review_status", "ok")]:
            with self.subTest(field=field):
                self.assertTrue(validate({**self.pack, "prompts": [{**self.first, field: value}]}))
        del self.first["aliases"]
        self.assertTrue(validate(self.pack))

    def test_duplicate_ids_and_aliases(self):
        self.first["aliases"].append(" 回形针 ")
        self.pack["twists"][0]["id"] = self.first["id"]
        self.assertEqual(len(validate(self.pack)), 2)

    def test_forbidden_leaks_and_wrong_mode(self):
        self.first["forbidden_terms"] = ["这是一把雨伞"]
        self.assertIn("禁止词包含", validate(self.pack)[0])
        self.pack["prompts"][-1]["forbidden_terms"] = ["不能说"]
        self.assertTrue(validate(self.pack))

    def test_playable_counts_and_twist_compatibility(self):
        self.first["review_status"] = "draft"
        for t in self.pack["twists"]:
            t["compatible_modes"] = ["charades"]
        self.assertEqual(len(validate(self.pack)), 2)
