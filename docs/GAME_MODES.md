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
