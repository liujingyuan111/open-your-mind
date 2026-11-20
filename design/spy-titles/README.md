# design/spy-titles · 猜词回合屏视觉提案

DESIGN-01 的交付目录。风格参照为 spy-titles（60s Spy Title Sequence），全部素材均为独立制作。

**先看**：`export/overview.png`（六帧总览），然后是 `export/asset-sheet.png`（图标在三种底色、200px 与 72px 下的效果）。

| 交付项 | 文件 |
|---|---|
| 1. 视觉解析（原约束 vs 转译） | `VISUAL_ANALYSIS.md` |
| 2. 回合屏提案（两种模式 + 长答案 + 最后 10 秒 + 32 字压力测试 + 猜词者视角） | `proposal/round-*.svg` → `export/round-*.png` |
| 3. 任务卡母版与三个代表资产 | `masters/task-card-master.svg`、`icons/cut-paper-mission-mark.svg`、`icons/cut-paper-microphone.svg`、`icons/cut-paper-gesture.svg` |
| 4. 源文件、导出、字体/颜色/网格规范、许可清单 | `build.mjs`、`src/`、`export/`、`SPEC.md`、`ASSET_MANIFEST.json` |
| 5. 长答案、双行指令、最后 10 秒布局说明 | `SPEC.md` §7–§9 |

其他：纸片规则样张 `masters/hand-cut-edge.svg`、`paper-seam.svg`、`paper-shadow.svg`、`paper-texture-preview.svg`，纸纹平铺 `masters/paper-fibre-ink-wear.svg`，背景道具 `patterns/`。

## 重新生成

在仓库根目录执行。需要 Node ≥ 20、Python 3.10+（`fonttools`、`playwright`），以及本机安装的 Microsoft Edge 和 Noto Sans SC 字体。

```powershell
python design/spy-titles/tools/extract_glyphs.py   # 仅在固定标签变化时需要
node   design/spy-titles/build.mjs                  # SVG + ASSET_MANIFEST.json
python design/spy-titles/tools/render_png.py        # export/*.png
node --test design/spy-titles/test/layout.test.mjs  # 版式与切边测试
python design/spy-titles/tools/check_assets.py      # 色值 / 渐变 / 清单 / 引用检查
```

如需用 PR #4 的真实题库跑版式测试：`git show origin/feature/initial-30-prompts:data/initial-pack.json` 存到本地文件，再用环境变量 `PACK_PATH` 指向它。合并后，测试会自动读取 `data/initial-pack.json`。

## 不做

- 不为单题生成图片，题目和指令都是实时文字。
- 不复制上游图像、构图、代码或字体。
- 不设计首页、大厅等其他页面。
