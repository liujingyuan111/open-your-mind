"""Export the prompt library to the Desktop for external review/editing.

Usage: python tools/export_library.py [out_dir]   (default: Desktop)
Writes: 开个脑洞-题库.json (drop-in replacement for data/library-pack.json)
        开个脑洞-题库.md   (editing rules + full tables, for humans or other AIs)
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "library-pack.json"
OUT_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(os.environ.get("USERPROFILE", str(Path.home()))) / "Desktop"

pack = json.loads(SRC.read_text(encoding="utf-8"))
prompts, twists = pack["prompts"], pack["twists"]

(OUT_DIR / "开个脑洞-题库.json").write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

RULES = """# 《开个脑洞》题库 · 编辑用导出稿

> 用途：交给其他 AI 或人工完善词条。改完后按下方 JSON 结构回填，`开个脑洞-题库.json` 可直接替换仓库
> `data/library-pack.json`（替换前建议先跑 `python tools/validate_pack.py data/library-pack.json` 校验）。

## 结构规则（违反会导致校验失败）

- 顶层结构：`{"version": 1, "prompts": [...], "twists": [...]}`，不允许其他字段。
- 每道题（prompt）字段：`id, mode_id, answer, aliases, category, difficulty, forbidden_terms, source_note, rights_note, review_status`。
  - `id`：小写字母/数字/连字符，如 `movie-v-05`，全库唯一（不能与指令 id 重复）。
  - `mode_id`：`verbal`（口头描述）或 `charades`（动作表演）。
  - `answer`：1–32 个字符；同一模式内，答案与所有别名（忽略大小写/空格/全半角）不得互相重复。
  - `aliases`：别名数组，可为空。
  - `category`：题包名（电影/电视剧/动漫/书籍/游戏/网络梗/动物/职业/运动/场景，可新增题包，但每个题包两种模式都要有题）。
  - `difficulty`：`easy` / `medium` / `hard`。
  - `forbidden_terms`：口头描述至少 1 个；**禁止词不得完整包含答案或别名**；动作表演必须为空数组 `[]`。
  - `review_status`：`draft`（不进牌堆）/ `playtest` / `approved`。
- 每条脑洞指令（twist）字段：`id, title, instruction, compatible_modes, difficulty, review_status`；
  `compatible_modes` 为 `["verbal"]`、`["charades"]` 或两者。
- 动作表演题必须是"能用肢体演出来"的内容；作品名挑有标志性动作/角色的。
- 权利边界：作品名称/流行语仅作口头指称，不收录台词、歌词、图片；`source_note`/`rights_note` 参照现有词条写法。

## 题目（共 {n_prompts} 道）
"""

def fmt_aliases(p):
    return "、".join(p["aliases"]) if p["aliases"] else "—"

lines = [RULES.replace("{n_prompts}", str(len(prompts)))]
categories = []
for p in prompts:
    if p["category"] not in categories:
        categories.append(p["category"])
for cat in categories:
    lines.append(f"\n### {cat}\n")
    lines.append("| ID | 模式 | 答案 | 别名 | 难度 | 禁止词 |")
    lines.append("|---|---|---|---|---|---|")
    for p in [x for x in prompts if x["category"] == cat]:
        mode = "口头" if p["mode_id"] == "verbal" else "表演"
        forbid = "、".join(p["forbidden_terms"]) if p["forbidden_terms"] else "—"
        lines.append(f"| {p['id']} | {mode} | {p['answer']} | {fmt_aliases(p)} | {p['difficulty']} | {forbid} |")

lines.append(f"\n## 脑洞指令（共 {len(twists)} 条）\n")
lines.append("| ID | 标题 | 指令 | 适用模式 | 难度 |")
lines.append("|---|---|---|---|---|")
for t in twists:
    modes = "、".join("口头" if m == "verbal" else "表演" for m in t["compatible_modes"])
    lines.append(f"| {t['id']} | {t['title']} | {t['instruction']} | {modes} | {t['difficulty']} |")

(OUT_DIR / "开个脑洞-题库.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"wrote {OUT_DIR / '开个脑洞-题库.json'}")
print(f"wrote {OUT_DIR / '开个脑洞-题库.md'}")
