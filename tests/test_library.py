import json
import unittest

from tools.validate_pack import ROOT, validate

CATEGORIES = ["电影", "电视剧", "动漫", "书籍", "游戏", "网络梗", "动物", "职业", "运动", "场景"]


class LibraryPackTests(unittest.TestCase):
    def setUp(self):
        self.pack = json.loads((ROOT / "data" / "library-pack.json").read_text(encoding="utf-8"))

    def test_valid(self):
        self.assertEqual(validate(self.pack, enforce_counts=False), [])

    def test_every_category_covers_both_modes(self):
        seen = {(p["category"], p["mode_id"]) for p in self.pack["prompts"] if p["review_status"] != "draft"}
        for category in CATEGORIES:
            for mode in ("verbal", "charades"):
                self.assertIn((category, mode), seen, f"{category} 缺少 {mode} 题")

    def test_difficulty_spread(self):
        levels = {p["difficulty"] for p in self.pack["prompts"]}
        self.assertEqual(levels, {"easy", "medium", "hard"})


if __name__ == "__main__":
    unittest.main()
