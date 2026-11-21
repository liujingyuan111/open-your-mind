# 猜词回合屏 A/B 主题（B 已选定）

对应 AGENTS.md 视觉复核任务：同一猜词回合页、同一题目数据、同一套操作，比较两个方向。
**2026-11-21 用户评审 PR #8 后选定 B「手账便签」为正式主风格**，冻结规则见 design/VISUAL_CONTRACT_SKETCH.md；
`sketch` 现为默认主题，`spy-light` 保留作对照。

## 两个主题

| 主题 | 定位 | 做法 |
|---|---|---|
| `spy-light`（A'） | 候选 A 减轻全屏主题包装 | 只有任务卡保留完整 spy-titles 语言（手剪边、切缝、纸影、纸纹、模式强调色墨块、奶油色大字）；页底、刊头、指令条、按钮改为浅色安静界面，无全屏纹理和对角构图 |
| `sketch`（B） | 手账便签 | 方格本底、横线任务卡配和纸胶带、荧光笔标题/分类、红笔圈倒计时、便利贴脑洞指令和按钮；模式差异只换荧光笔/便利贴颜色和涂鸦图标，操作组件完全统一 |

两版共用：同一组件树（`src/components/RoundScreen.vue`）、同一 `local-round` 状态机、同一题库与脑洞指令、
跳过/猜对按钮的位置大小含义、60 秒时长、ready→playing→last_call→feedback→finished 全部状态。

B 的实现约束（来自 style-exploration 的教训）：只有装饰层（胶带、涂鸦）旋转，文字层一律不旋转；
每屏一个模式强调色 + 红色红笔，不堆砌颜色。

## 配置驱动

- 模式按主题提供局部图形与强调色：`design/MODE_ASSETS.json` 的 `modes[].theme_assets.sketch`
  （`icon_asset` 涂鸦图标、`accent` 荧光笔色）。A' 继续用 `accent_role` 取四墨色板。
- 涂鸦图标 `doodle-microphone.svg`、`doodle-gesture.svg` 为手绘风格原创占位，见 design/ROUND_PROTOTYPE_ASSETS.md。
- 主题不影响题目数据与权限边界；猜题者视角两个主题都不显示答案。

## 预览与复现

```
npm install
python tools/fetch_fonts.py      # 下载站酷快乐体（OFL）到 assets/fonts/（不进仓库）
npm test
npm run build:h5
python tools/preview_ab.py       # 截图到 docs/screenshots/ab/
npm run build:mp-weixin          # 产物在 dist/build/mp-weixin，用微信开发者工具导入
```

页面参数（H5 哈希路由同样适用）：

- `?theme=spy-light|sketch` 选主题，默认 `sketch`
- `?pack=library|initial` 选题库，默认 `library`（扩充题库 80 题）；`initial` 为首测 30 题
- `?seed=` 固定洗牌顺序。首测包用 `?pack=initial&seed=65` 时两模式第一张都是 15 字长答案；
  扩充题库用 `?seed=7`（口头描述首张为电影题包）和 `?seed=21`（动作表演首张为「泰坦尼克号」）
- `?role=guesser` 猜题者视角

## 已验证

- `npm test`：8/8 通过（含新增的同种子同牌序测试、theme_assets 图标/色值解析测试）。
- `npm run build:h5` / `npm run build:mp-weixin`：均构建成功；mp-weixin 产物 26 文件约 113 KB。
- `tools/preview_ab.py` 实际运行并检查截图：两主题 × {ready, 15 字长答案口头描述, 15 字长答案动作表演, 剩余 6 秒}，
  长答案完整可读，剩 8 秒进入高注意状态（A' 红字、B 红圈加粗），操作按钮位置不变。
  截图：docs/screenshots/ab/。

## 未验证与风险

- 微信开发者工具 / 真机尚未运行：手账主题的快乐体在小程序端回退系统字体
  （@font-face 仅 H5 生效）；生产字体方案沿用 style-exploration 结论——按题库子集化 + `wx.loadFontFace` CDN 加载，未定。
- B 的红笔圈、波浪删除线、八值 border-radius 在 Skyline 渲染器的支持未逐一验证。
- 红笔圈与“最后 10 秒”标签轻微相交，按手绘圈注意感保留；如评审认为干扰可收紧。
- 本 PR 不冻结主风格；B 是待验证方向，A' 也不代表候选 A 已修改（PR #6 基线不动）。
