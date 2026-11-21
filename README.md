# 开个脑洞 · Open Your Mind

> 一款以脑洞表达为核心的微信多人聚会游戏。

**当前阶段：猜词回合单机试玩。** 同一个 Vue 组件可运行于网页和微信小程序。

## 运行本地回合

在当前分支的仓库根目录安装依赖并启动网页预览，浏览器打开终端显示的地址。

```sh
npm ci
npm run dev
```

打开后选择「口头描述」或「动作表演」，将手机交给持机玩家，点「开始回合」。每轮 60 秒，猜对得 1 分，跳过不扣分，题池耗尽或时间到会结算。进行中切换玩法会先询问是否清空本轮。猜题者只读布局可用 `/#/pages/round/index?role=guesser` 查看。

```sh
npm test
npm run build:h5
npm run build:mp-weixin
```

将 `dist/build/mp-weixin` 导入微信开发者工具，可本地打开小程序。构建不需要线上 AppID。网页发布目录为 `dist/build/h5`。

题卡和指令默认来自扩充题库 `data/library-pack.json`（10 个题包 80 题、12 条指令），`?pack=initial` 可回到首测包 `data/initial-pack.json`（30 题）。校验步骤见 [题库说明](docs/GAME_MODES.md#首测题包与复核)。页面通过 `src/game/local-round.mjs` 的 `snapshot` 和 `dispatch` 读取状态、提交带轮次和题目 ID 的操作，回合组件只消费视角对应的数据。当前本地包包含整套测试题；真实联机时需改接服务端按身份下发的快照，计时、授权和计分由服务端裁定。

[回合准备截图](docs/screenshots/round-ready.png) · [口头描述截图](docs/screenshots/round-verbal.png) · [动作长题与最后 10 秒](docs/screenshots/round-last-call.png)

## 产品方向
- 核心体验：朋友通过微信进入同一房间，轮流描述/表演，让其他玩家猜词。
- 差异化假设：题目卡 + 脑洞指令卡，让同一题在不同局产生不同表达挑战。
- 首屏范围：先把猜词回合页做好，不铺完整大厅和所有页面。
- 主视觉：「手账便签」（2026-11-21 评审 PR #8 后选定）。候选 A（spy-titles）保留为历史参照，见 PR #6。

## 视觉方向
桌面手账气质：方格本底、横线任务卡、和纸胶带、黄色便利贴脑洞指令、荧光笔标题、红笔圈注倒计时、涂鸦线条图标。冻结规则（色板、材质、组件、验收）见 [视觉合同](design/VISUAL_CONTRACT_SKETCH.md)。候选 A 的 spy-titles 转译合同保留在 [design/VISUAL_CONTRACT.md](design/VISUAL_CONTRACT.md)，仅作历史参照。

## 批量素材原则
**题目和指令是数据，不是一题一张图。** 题目文字由小程序动态排版；图形素材来自经过审定的母版、纸边/纹理/印章/图形组件和模式配置。只为少量专题封面制作独立插画。

## 仓库导航
- `AGENTS.md` — 所有 AI/开发者协作规则
- `docs/PRODUCT_PLAN.md` — 产品规划与差异化假设
- `docs/GAME_MODES.md` — 模式与题包边界、玩法规则
- `docs/ASSET_PIPELINE.md` — 批量素材生产线
- `design/VISUAL_CONTRACT_SKETCH.md` — 手账便签视觉合同（现行）
- `design/VISUAL_CONTRACT.md` — spy-titles 风格转译合同（候选 A，历史参照）
- `design/MODE_ASSETS.json` — 模式素材配置
- `docs/ROUND_SCREEN_SPEC.md` — 猜词回合页规格
- `ROADMAP.md` — 版本路线图

## 验证策略
先做「口头描述」和「动作表演」两种玩法，各 15 道测试题，共用同一套回合组件。验证布局、规则切换、长题目排版和真实聚会可玩性，再扩展更多模式。

## 状态说明
产品方案和素材流水线仍在规划与验证阶段。未完成的代码、测试、微信审核和联机能力不会标记为已完成。
