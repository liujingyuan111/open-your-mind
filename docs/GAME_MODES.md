# 游戏模式与题包设计

## 模式 vs 题包
模式改变玩家角色、信息可见性、线索方式、回合流程和胜负规则；题包只是可抽取内容分类。电影、电视剧、游戏、书籍、网络梗、综合物品是题包，不应各自复制一套玩法 UI。

## 首轮模式

### 01 口头描述
- 描述者看到答案及禁止词/提示；其他人看不到答案。
- 描述者用语言解释目标，队友猜。
- 可启用脑洞指令卡，例如新闻主播、房产中介、反派视角。
- 操作：猜对、跳过；超时由系统结束回合。

### 02 动作表演
- 表演者看到答案；猜题玩家看不到。
- 只能使用肢体动作；禁止说话、写字或展示手机内容。
- UI 明确展示“不能说话，只能表演”。
- 与口头描述共用回合布局。

## 后续模式候选
- 反向描述：猜题者看不到答案，其他玩家轮流提供一个词/线索。
- 卧底猜词：玩家分别拿到相似词，轮流描述并投票。

## 题包
电影、电视剧、游戏、书籍、网络梗、综合物品、动物、地点、职业等。题包不决定界面结构，只决定题目筛选、分类标签和可选封面。

## 数据结构建议
Prompt: id, answer, aliases[], category, difficulty, forbidden_terms[], content_tags[], source_note, rights_note, review_status。
Mode: mode_id, name, accent_color, icon_asset, pattern_asset, rule_title, rule_description, answer_visibility, input_method, timer_seconds, actions[]。
Twist: id, title, instruction, compatible_modes[], difficulty, review_status。

## 首轮配置
- verbal：口头描述；红色强调；剪纸话筒图标；描述答案，队友猜。
- charades：动作表演；黄色强调；剪纸手势图标；不能说话，只能表演。

模式配置引用资产和规则；题库不存 UI 图片。

## 首测题包与复核

内容入口为 `data/initial-pack.json`，结构约束见 `data/pack.schema.json`。每题只属于一个模式。别名供主持人判断同义回答，长情境题只需猜中核心动作和情境。队友可以换一种说法。当前 30 题及 8 条指令均标记为 `playtest`，待朋友局试玩。草稿 `draft` 不进入抽题池。

| 模式 | 短（1–4 字） | 中（5–9 字） | 长（10–32 字） | 简单 / 中等 / 困难 |
| --- | ---: | ---: | ---: | --- |
| 口头描述 | 8 | 2 | 5 | 6 / 6 / 3 |
| 动作表演 | 6 | 3 | 6 | 6 / 6 / 3 |

口头题覆盖常见物品与相近概念，例如「回声」需要描述现象，两枚禁止词限制最直接的线索。动作题可以徒手完成。复杂题通过连续动作增加难度，例如跑回合照队伍。长短分布用于同时观察读题时间和排版。每种模式有四条相容的指令，指令和题目独立抽取。

在仓库根目录运行以下命令。校验器先按 JSON Schema 检查结构，再检查重复 ID、同模式别名冲突、禁止词泄题、首测题量和指令可用性。现场能否猜中仍需试玩。

```sh
python -m pip install -r requirements-test.txt
python tools/validate_pack.py
python -m unittest discover -s tests -p test_pack.py
```
