"""Validate the initial playtest pack. Run from any directory."""
import argparse
import json
import sys
import unicodedata
from collections import Counter
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / "data/initial-pack.json"
SCHEMA = ROOT / "data/pack.schema.json"


def normalized(word):
    return "".join(unicodedata.normalize("NFKC", word).casefold().split())


def validate(pack, enforce_counts=True):
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    errors = [f"{e.json_path}: {e.message}" for e in Draft202012Validator(schema).iter_errors(pack)]
    if errors:
        return errors
    ids = set()
    guesses = {}
    counts = Counter()
    for record in [*pack["prompts"], *pack["twists"]]:
        key = record["id"]
        if key in ids:
            errors.append(f"{key}: ID 重复")
        ids.add(key)
    for p in pack["prompts"]:
        key, mode = p["id"], p["mode_id"]
        if p["review_status"] != "draft":
            counts[mode] += 1
        names = [normalized(n) for n in [p["answer"], *p["aliases"]]]
        for name in names:
            if (mode, name) in guesses:
                errors.append(f"{key}: 答案或别名与 {guesses[mode, name]} 重复")
            guesses[mode, name] = key
        for word in map(normalized, p["forbidden_terms"]):
            if any(name in word for name in names):
                errors.append(f"{key}: 禁止词包含答案或别名")
    if enforce_counts and (len(pack["prompts"]) != 30 or counts != {"verbal": 15, "charades": 15}):
        errors.append(f"首测需要两种模式各 15 道可玩题，实际为 {dict(counts)}")
    for mode in ("verbal", "charades"):
        if not any(mode in t["compatible_modes"] and t["review_status"] != "draft" for t in pack["twists"]):
            errors.append(f"{mode}: 缺少可用的兼容指令")
    return errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pack", nargs="?", type=Path, default=DEFAULT)
    args = parser.parse_args()
    try:
        pack = json.loads(args.pack.read_text(encoding="utf-8"))
        # 数量门槛只对首测包生效；扩展题库只校验结构、去重和指令兼容性
        problems = validate(pack, enforce_counts=args.pack.resolve() == DEFAULT)
    except (ValueError, OSError) as error:
        problems = [str(error)]
    if problems:
        sys.exit("\n".join(problems))
    playable = sum(1 for p in pack["prompts"] if p["review_status"] != "draft")
    print(f"通过：{args.pack.name} 共 {len(pack['prompts'])} 题（可玩 {playable}），{len(pack['twists'])} 条脑洞指令。")
