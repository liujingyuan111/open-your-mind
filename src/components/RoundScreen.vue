<template>
  <view class="page" :class="'theme-' + theme" :style="themeVars">
    <view class="mast">
      <view class="mast-inner">
        <view class="brand"><image class="seal" :src="art(assets.shared.seal)" /><text>开个脑洞</text><text class="brand-en">OPEN YOUR MIND</text></view>
        <view class="local"><text class="dot"></text>本地试玩</view>
      </view>
    </view>
    <view class="sheet">
      <view class="heading">
        <view class="heading-name"><text class="headline">猜词回合</text><text class="round-no">第 {{ two(state.round) }} 轮</text></view>
        <view v-if="performer" class="switcher">
          <button v-for="item in assets.modes" :key="item.mode_id" class="mode-button" role="button" tabindex="0" @keydown.enter.prevent="chooseMode(item.mode_id)" @keydown.space.prevent="chooseMode(item.mode_id)"
            :class="{ selected: item.mode_id === mode.mode_id }"
            :aria-label="item.name + (item.mode_id === mode.mode_id ? '，已选' : '')"
            @click="chooseMode(item.mode_id)">
            <view class="mode-icon"><image :src="art(modeIcon(item))" /></view>{{ item.name }}
          </button>
        </view>
        <text v-else class="role-badge">猜题者视角</text>
      </view>
      <view class="columns">
        <view class="primary-column">
          <view class="card-stack">
            <image class="card-back" :src="art(assets.shared.paper_shadow)" mode="scaleToFill" />
            <view class="task-card" :class="{ mustard: !sketch && mode.input_method === 'gesture', closed: !state.prompt }"
              :style="sketch ? null : { backgroundColor: accentHex }">
              <image class="edge-cut" :src="art(assets.shared.cut_edge)" mode="scaleToFill" />
              <image class="paper-seam" :src="art(assets.shared.paper_seam)" mode="scaleToFill" />
              <view class="tape tape-a"></view>
              <view class="tape tape-b"></view>
              <view class="card-meta">
                <text class="card-label">{{ state.prompt ? '仅' + mode.performer_label + '可见' : '秘密任务卡' }}</text>
                <text class="folio">{{ state.prompt ? two(state.ordinal) + ' / ' + two(state.total) : '共 ' + state.total + ' 题' }}</text>
              </view>
              <view class="hero">
                <view class="answer-block">
                  <text v-if="state.prompt" class="category">{{ state.prompt.category }}</text>
                  <text class="answer" :class="sizeClass">{{ title }}</text>
                  <text v-if="!state.prompt" class="hero-note">{{ note }}</text>
                </view>
                <image v-if="!sketch && (!state.prompt || title.length <= 4)" class="dossier" :class="{ small: !!state.prompt }" :src="art(assets.shared.card_shell)" mode="aspectFit" />
                <image v-if="sketch && !state.prompt" class="sketch-figure" :src="art(modeIcon(mode))" mode="aspectFit" />
              </view>
              <view class="card-bottom">
                <view v-if="state.prompt && state.prompt.forbidden.length" class="forbidden">
                  <text class="tab-label">禁止词</text><text v-for="word in state.prompt.forbidden" :key="word">{{ word }}</text>
                </view>
                <text v-else>{{ state.prompt ? '仅表演者看题 · 请勿向队友亮屏' : performer ? '猜对一题 +1 分' : '此视角隐藏题卡' }}</text>
              </view>
            </view>
          </view>
          <view class="rule">
            <image :src="art(modeIcon(mode))" class="rule-icon" mode="aspectFit" />
            <view><text class="rule-name">{{ mode.rule_title }}</text><text class="rule-copy">{{ mode.rule_description }}</text></view>
          </view>
        </view>
        <view class="details">
          <view class="clock-panel" :class="{ urgent: active && state.remaining <= 10 }">
            <view class="panel-top"><text class="label">回合倒计时</text><text class="clock-state">{{ phaseLabel }}</text></view>
            <view class="dial"><text class="digits">{{ timeText }}</text><view class="red-circle"></view></view>
            <view class="ruler"><view class="ruler-fill" :style="{ width: (100 * state.remaining / mode.timer_seconds) + '%' }"></view></view>
          </view>
          <view class="twist">
            <view class="tape tape-twist"></view>
            <view class="twist-top"><view class="sun"></view><text>脑洞指令</text></view>
            <text class="twist-title">{{ state.twist ? state.twist.title : finished ? '指令已归档' : '开题后揭晓' }}</text>
            <text class="twist-copy">{{ state.twist ? state.twist.instruction : finished ? '再开一轮，换一种表达方式。' : performer ? '每张题卡搭配一条表达挑战。' : '请根据队友的线索猜词。' }}</text>
          </view>
        </view>
      </view>
      <view class="controls">
        <view class="stats"><view><text class="stats-label">本队得分</text><text class="score">{{ two(state.score) }}</text></view>
          <view class="skip-stat"><text class="stats-label">已跳过</text><text class="skips">{{ two(state.skipped) }}</text></view></view>
        <view v-if="performer" class="buttons">
          <button v-if="ready || finished" class="action start" role="button" tabindex="0" @keydown.enter.prevent="begin" @keydown.space.prevent="begin" @click="begin">
            {{ finished ? '再来一轮' : '开始回合' }}<text class="arrow">→</text>
          </button>
          <template v-else>
            <button class="action skip" role="button" :tabindex="locked ? -1 : 0" @keydown.enter.prevent="act('skip')" @keydown.space.prevent="act('skip')" :disabled="locked" @click="act('skip')">跳过<text class="action-sign">↷</text></button>
            <button class="action correct" role="button" :tabindex="locked ? -1 : 0" @keydown.enter.prevent="act('correct')" @keydown.space.prevent="act('correct')" :disabled="locked" @click="act('correct')">{{ state.phase === 'correct_feedback' ? '猜对 +1' : '猜对' }}<text class="action-sign">✓</text></button>
          </template>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  state: { type: Object, required: true },
  assets: { type: Object, required: true },
  theme: { type: String, default: 'spy-light' },
})
const emit = defineEmits(['command'])
const art = file => '/static/art/' + file
const two = n => String(n).padStart(2, '0')
const sketch = computed(() => props.theme === 'sketch')
const mode = computed(() => props.assets.modes.find(m => m.mode_id === props.state.modeId))
const performer = computed(() => props.state.role === 'performer')
const ready = computed(() => props.state.phase === 'ready')
const finished = computed(() => props.state.phase === 'round_finished')
const active = computed(() => !ready.value && !finished.value)
const locked = computed(() => !['playing', 'last_call'].includes(props.state.phase))
const phaseLabel = computed(() => ({
  ready: '待开始', playing: '进行中', last_call: '最后 10 秒',
  correct_feedback: '猜对 +1', skipped: '已跳过', round_finished: '已结束',
})[props.state.phase])
const title = computed(() => props.state.prompt?.answer || (
  !performer.value ? '请猜词' : finished.value ? '回合结束' : '准备接题'
))
const note = computed(() => !performer.value ? '听描述，或观察队友的动作。' :
  finished.value ? (props.state.finishReason === 'deck' ? '本模式题卡已全部完成。' : '时间到，本轮得分已记录。') :
    '请把屏幕交给' + mode.value.performer_label + '。')
const sizeClass = computed(() => {
  const length = Array.from(title.value).length
  return length > 16 ? 'longest' : length > 9 ? 'long' : length > 4 ? 'medium' : ''
})
const timeText = computed(() => two(Math.floor(props.state.remaining / 60)) + ':' + two(props.state.remaining % 60))
// B 方向允许模式有不同的局部图形；图标与强调色由配置按主题取，组件结构不变
const modeIcon = item => (sketch.value && item.theme_assets?.sketch?.icon_asset) || item.icon_asset
const accentHex = computed(() => {
  if (sketch.value) return mode.value.theme_assets?.sketch?.accent || '#e5484d'
  return props.assets.shared.palette[mode.value.accent_role].hex
})
const themeVars = computed(() => ({ '--mode-accent': accentHex.value }))
function send(type, extra = {}) { emit('command', { type, round: props.state.round, ...extra }) }
function begin() {
  if (finished.value) send('prepare', { modeId: mode.value.mode_id })
  else send('start')
}
function act(type) {
  if (!locked.value && props.state.prompt) send(type, { promptId: props.state.prompt.id })
}
function chooseMode(modeId) {
  if (modeId === mode.value.mode_id) return
  if (!active.value) return send('prepare', { modeId })
  const round = props.state.round
  uni.showModal({
    title: '切换玩法？', content: '切换会结束当前回合，并清空本轮得分。',
    confirmText: '切换玩法', cancelText: '继续本轮', confirmColor: '#1b1714',
    success: result => { if (result.confirm) emit('command', { type: 'prepare', round, modeId }) },
  })
}
</script>

<style>
/* #ifdef H5 */
@font-face {
  font-family: 'KuaiLe';
  /* 字体不进仓库：tools/fetch_fonts.py 下载到 assets/fonts/，预览脚本拷入 H5 产物；缺失或小程序端回退系统字体 */
  src: url('/static/fonts/ZCOOLKuaiLe-Regular.ttf') format('truetype');
  font-display: swap;
}
/* #endif */
.page {
  min-height: 100vh;
  background: #efe4c9 url('../static/art/paper-fibre-ink-wear.svg') repeat;
  background-size: 160px 140px;
  color: #1b1714;
}
.page view, .page button, .page image { box-sizing: border-box; }
.mast { border-bottom: 2px solid #1b1714; }
.mast-inner, .sheet { margin: 0 auto; max-width: 1088px; padding: 0 40px; }
.mast-inner, .brand, .local, .heading, .heading-name, .switcher, .mode-button, .card-meta,
.panel-top, .controls, .buttons, .stats, .stats > view, .twist-top, .rule, .forbidden, .action { display: flex; align-items: center; }
.mast-inner { min-height: 76px; justify-content: space-between; }
.brand { gap: 9px; font-weight: 900; font-size: 23px; letter-spacing: -.06em; }
.seal { width: 39px; height: 34px; }
.brand-en, .folio, .round-no, .digits, .score, .skips { font-family: "Arial Narrow","Helvetica Neue",Arial,"Microsoft YaHei",sans-serif; font-variant-numeric: tabular-nums; }
.brand-en { max-width: 52px; font-size: 9px; letter-spacing: .08em; line-height: 1.02; font-weight: 900; }
.local { font-size: 12px; gap: 8px; font-weight: 650; }
.dot { width: 7px; height: 7px; background: #d23a22; transform: rotate(-8deg); }
.sheet { padding-bottom: 48px; }
.heading { justify-content: space-between; gap: 16px; margin: 38px 0 24px; }
.heading-name { gap: 14px; }
.headline { font-size: 40px; line-height: 1.15; font-weight: 1000; letter-spacing: -.07em; }
.round-no { padding: 5px 10px; background: #e2a52a; clip-path: polygon(3% 5%,100% 0,96% 96%,0 100%); font-size: 12px; font-weight: 800; white-space: nowrap; }
.switcher { border: 1.5px solid #1b1714; padding: 3px; gap: 3px; }
.mode-button { border: none; border-radius: 0; padding: 0 12px; margin: 0; min-height: 38px; gap: 6px; font-weight: 750; background: transparent; color: #1b1714; font-size: 14px; line-height: 1.2; }
.mode-button.selected { background: #1b1714; color: #efe4c9; }
.mode-icon, .mode-icon image { display: block; width: 17px; height: 17px; }
.selected .mode-icon { filter: invert(1); }
.columns { display: grid; grid-template-columns: minmax(0,1.78fr) minmax(0,1fr); gap: 25px; }
.primary-column, .details { min-width: 0; }
.details { display: flex; flex-direction: column; gap: 14px; }
.card-stack { position: relative; margin: 0 4px 6px 0; }
.card-back, .theme-spy-light .task-card { clip-path: polygon(0.4% 1.4%, 35% .7%, 66% 1%, 96.6% 0, 100% 5.7%, 99.6% 73%, 100% 98.4%, 54% 99.3%, 14% 98.8%, .4% 100%, 0 50%); }
.card-back { position: absolute; inset: 0; width: 100%; height: 100%; transform: translate(4px,5px); }
.edge-cut, .paper-seam { pointer-events: none; position: absolute; }
.edge-cut { right: 5%; top: -.5%; width: 72px; height: 21px; }
.paper-seam { left: 2%; bottom: .7%; width: 62%; height: 3px; }
.tape { display: none; }
.task-card { position: relative; min-height: 302px; padding: 23px 26px 20px; display: flex; flex-direction: column; justify-content: space-between; background-image: url('../static/art/paper-fibre-ink-wear.svg'); background-size: 145px 125px; color: #1b1714; }
.card-meta, .panel-top { justify-content: space-between; gap: 8px; }
.card-label { display: inline-block; background: #1b1714; color: #efe4c9; padding: 4px 10px; transform: rotate(-2deg); font-size: 12px; font-weight: 800; letter-spacing: .12em; }
.folio { font-size: 14px; font-weight: 800; }
.hero { display: flex; position: relative; align-items: center; min-height: 160px; }
.answer-block { position: relative; z-index: 1; min-width: 0; }
.closed .answer-block { width: 57%; }
.answer, .category, .hero-note, .rule-name, .rule-copy, .digits, .twist-title, .twist-copy { display: block; }
.answer { color: #efe4c9; font-size: clamp(48px,5.3vw,76px); font-weight: 1000; line-height: 1.16; letter-spacing: -.07em; overflow-wrap: anywhere; transform: rotate(-.65deg); transform-origin: left center; }
.mustard .answer { color: #1b1714; }
.answer.medium { font-size: clamp(35px,4.1vw,54px); }
.answer.long, .answer.longest { letter-spacing: 0; font-weight: 800; line-height: 1.3; }
.answer.long { font-size: clamp(30px,3.4vw,44px); }
.answer.longest { font-size: clamp(27px,2.9vw,38px); }
.category, .hero-note { color: #1b1714; font-size: 14px; font-weight: 700; }
.category { margin-bottom: 8px; }
.hero-note { margin-top: 12px; }
.dossier { width: 44%; height: 192px; position: absolute; right: -3%; top: 50%; transform: translateY(-50%) rotate(-4deg); }
.dossier.small { width: 26%; max-height: 105px; right: 0; }
.sketch-figure { display: none; }
.card-bottom { padding-top: 11px; border-top: 1px solid #1b1714; font-size: 13px; font-weight: 700; min-height: 31px; }
.forbidden { gap: 14px; flex-wrap: wrap; }
.tab-label { font-size: 12px; border-right: 1px solid #1b1714; padding-right: 12px; }
.rule { align-items: flex-start; gap: 11px; padding: 18px 2px 0; }
.rule-icon { flex: none; width: 30px; height: 23px; }
.rule-name, .label, .twist-top { font-size: 14px; font-weight: 800; }
.rule-copy, .twist-copy { font-size: 14px; line-height: 1.6; margin-top: 4px; }
.clock-panel { border: 1.5px solid #1b1714; padding: 16px 20px 18px; }
.clock-state { font-size: 12px; font-weight: 750; }
.dial { display: inline-block; position: relative; align-self: flex-start; }
.digits { font-weight: 900; font-size: 64px; letter-spacing: -.065em; line-height: 1.1; margin: 3px 0 7px; }
.red-circle { display: none; }
.ruler { height: 5px; background: #d8cbaf; }
.ruler-fill { background: #1b1714; height: 100%; }
.urgent .digits, .urgent .clock-state { color: #9c2a19; }
.urgent .ruler-fill { background: #d23a22; }
.twist { position: relative; flex: 1; padding: 18px 21px 22px; background: #1b1714 url('../static/art/paper-fibre-ink-wear.svg'); color: #efe4c9; clip-path: polygon(0 2%, 28% 0, 72% 1%, 100% 0, 99.8% 86%, 96% 100%, .5% 99%); }
.twist-top { gap: 8px; color: #e2a52a; }
.sun { width: 19px; height: 21px; background: #e2a52a; clip-path: polygon(47% 0,58% 33%,83% 9%,69% 40%,100% 40%,73% 55%,94% 77%,61% 67%,55% 100%,45% 69%,15% 89%,31% 60%,0 53%,32% 43%,14% 15%,43% 34%); }
.twist-title { font-size: 24px; font-weight: 900; margin-top: 12px; }
.controls { justify-content: space-between; gap: 14px; margin-top: 28px; padding: 20px 0 0; border-top: 2px solid #1b1714; }
.stats { gap: 24px; }
.stats > view { gap: 9px; }
.stats-label { font-size: 13px; font-weight: 700; }
.score { font-size: 31px; line-height: 1; font-weight: 900; }
.skips { font-size: 20px; font-weight: 750; }
.buttons { justify-content: flex-end; gap: 10px; }
.action { justify-content: space-between; gap: 22px; line-height: 1.2; border: 1.5px solid #1b1714; border-radius: 0; padding: 12px 20px; min-height: 50px; margin: 0; font-size: 17px; font-weight: 850; color: #1b1714; }
.start, .correct { min-width: 156px; background: #1b1714; color: #efe4c9; }
.start { min-width: 215px; }
.skip { background: #efe4c9; }
.action.start, .action.correct { clip-path: polygon(.3% 3%,99% 0,100% 85%,97% 99%,0 100%); }
.action[disabled] { opacity: .62; }
.arrow, .action-sign { font: bold 24px/1 Arial,sans-serif; }
button:focus-visible { outline: 3px solid #9c2a19; outline-offset: 2px; }

/* ============ A' · spy-light：保留任务卡的间谍剪纸语言，减轻全屏主题包装 ============ */
.page.theme-spy-light { background: #f4eee1; background-image: none; }
.theme-spy-light .mast { border-bottom: 1px solid rgba(27,23,20,.2); }
.theme-spy-light .brand { font-weight: 800; letter-spacing: 0; }
.theme-spy-light .round-no { background: transparent; border: 1.5px solid #1b1714; clip-path: none; }
.theme-spy-light .twist { background: #fbf7ec; color: #1b1714; clip-path: none; border-left: 8px solid var(--mode-accent, #d23a22); padding: 16px 20px 18px; }
.theme-spy-light .twist-top { color: #1b1714; }
.theme-spy-light .sun { clip-path: none; width: 12px; height: 12px; background: var(--mode-accent, #d23a22); }
.theme-spy-light .twist-title { font-size: 20px; margin-top: 8px; }
.theme-spy-light .action { clip-path: none; }
.theme-spy-light .clock-panel { border-color: rgba(27,23,20,.35); }

/* ============ B · sketch：手账便签。只有装饰层旋转，文字层一律不旋转 ============ */
.page.theme-sketch {
  background-color: #f7f2e4; background-image:
    linear-gradient(rgba(96,140,190,.16) 2px, transparent 2px),
    linear-gradient(90deg, rgba(96,140,190,.16) 2px, transparent 2px);
  background-size: 34px 34px; background-position: 10px 8px;
  color: #2a2a2a; font-family: 'KuaiLe', "PingFang SC", "Microsoft YaHei", sans-serif;
}
.theme-sketch .mast { border-bottom: 2px dashed rgba(42,42,42,.35); }
.theme-sketch .seal { display: none; }
.theme-sketch .brand { letter-spacing: 0; }
.theme-sketch .brand::before { content: '✎ '; color: #d6372b; }
.theme-sketch .brand-en, .theme-sketch .local, .theme-sketch .folio, .theme-sketch .round-no,
.theme-sketch .digits, .theme-sketch .score, .theme-sketch .skips { font-family: "Arial Narrow","Helvetica Neue",Arial,"Microsoft YaHei",sans-serif; }
.theme-sketch .dot { background: #d6372b; border-radius: 50%; transform: none; }
.theme-sketch .headline { letter-spacing: 0; font-weight: 400; padding: 0 6px;
  background: linear-gradient(transparent 58%, var(--mode-accent, #e5484d) 58%, var(--mode-accent, #e5484d) 92%, transparent 92%); }
.theme-sketch .round-no { background: #fffdf7; border: 2px solid #2a2a2a; clip-path: none; border-radius: 6px 10px 8px 12px; box-shadow: 2px 3px 0 rgba(42,42,42,.18); }
.theme-sketch .switcher { border: none; background: transparent; gap: 8px; }
.theme-sketch .mode-button { background: #fffdf7; border: 2px solid #2a2a2a; border-radius: 8px 12px 10px 14px; box-shadow: 2px 3px 0 rgba(42,42,42,.2); font-weight: 400; min-height: 40px; }
.theme-sketch .mode-button.selected { background: var(--mode-accent, #e5484d); color: #2a2a2a; }
.theme-sketch .selected .mode-icon { filter: none; }
.theme-sketch .card-back, .theme-sketch .edge-cut, .theme-sketch .paper-seam, .theme-sketch .dossier { display: none; }
.theme-sketch .task-card {
  clip-path: none; border-radius: 6px; background-color: #fffdf8; background-size: auto;
  background-image: linear-gradient(90deg, transparent 74px, rgba(220,80,70,.5) 74px, rgba(220,80,70,.5) 77px, transparent 77px),
    repeating-linear-gradient(transparent 0 55px, rgba(90,140,200,.26) 55px 57px);
  box-shadow: 3px 5px 0 rgba(42,42,42,.16); color: #2a2a2a;
}
.theme-sketch .tape { display: block; position: absolute; width: 128px; height: 36px; z-index: 4; opacity: .92; pointer-events: none;
  background: repeating-linear-gradient(45deg, rgba(255,255,255,.3) 0 10px, transparent 10px 20px), rgba(240,205,110,.78);
  box-shadow: 0 1px 2px rgba(60,40,10,.2); }
.theme-sketch .tape-a { top: -15px; left: 26px; transform: rotate(-4deg); }
.theme-sketch .tape-b { top: -13px; right: 30px; transform: rotate(5deg); }
.theme-sketch .tape-twist { top: -15px; left: 50%; transform: translateX(-50%) rotate(-2deg); }
.theme-sketch .card-label { background: #2a2a2a; color: #fffdf8; transform: none; border-radius: 4px; letter-spacing: .06em; }
.theme-sketch .answer { color: #2a2a2a; font-family: 'KuaiLe', "PingFang SC", "Microsoft YaHei", sans-serif; font-weight: 400; transform: none; letter-spacing: 0; }
.theme-sketch .mustard .answer { color: #2a2a2a; }
.theme-sketch .answer.long, .theme-sketch .answer.longest { font-weight: 400; line-height: 1.35; }
.theme-sketch .category { display: inline-block; padding: 0 8px; font-weight: 400;
  background: linear-gradient(transparent 45%, var(--mode-accent, #e5484d) 45%, var(--mode-accent, #e5484d) 92%, transparent 92%); }
.theme-sketch .hero-note { font-weight: 400; }
.theme-sketch .sketch-figure { display: block; width: 34%; max-height: 150px; position: absolute; right: 2%; top: 50%; transform: translateY(-50%) rotate(3deg); opacity: .95; }
.theme-sketch .card-bottom { border-top: 2px dashed rgba(42,42,42,.3); font-weight: 400; }
.theme-sketch .tab-label { border-right: 2px dashed rgba(42,42,42,.3); }
.theme-sketch .forbidden text:not(.tab-label) { text-decoration: underline wavy #d6372b 2px; text-underline-offset: 5px; }
.theme-sketch .rule { border-top: none; }
.theme-sketch .rule-icon { width: 26px; height: 26px; }
.theme-sketch .rule-name { font-weight: 400; border-bottom: 3px solid var(--mode-accent, #e5484d); }
.theme-sketch .rule-copy { font-weight: 400; color: #444; }
.theme-sketch .clock-panel { background: #fffdf8; border: 2px solid #2a2a2a; border-radius: 10px 14px 12px 16px; box-shadow: 3px 4px 0 rgba(42,42,42,.16); }
.theme-sketch .clock-state, .theme-sketch .label { font-weight: 400; }
.theme-sketch .digits { letter-spacing: 0; }
.theme-sketch .red-circle { display: block; position: absolute; left: -18px; right: -18px; top: -7px; bottom: -3px; border: 4px solid #d6372b; border-radius: 48% 52% 51% 49% / 56% 48% 52% 44%; transform: rotate(-5deg); pointer-events: none; }
.theme-sketch .urgent .digits, .theme-sketch .urgent .clock-state { color: #d6372b; }
.theme-sketch .urgent .red-circle { border-width: 6px; transform: rotate(-5deg) scale(1.04); }
.theme-sketch .ruler { background: rgba(90,140,200,.25); height: 8px; border-radius: 4px; }
.theme-sketch .ruler-fill { background: var(--mode-accent, #e5484d); border-radius: 4px; }
.theme-sketch .urgent .ruler-fill { background: #d6372b; }
.theme-sketch .twist { background: #fff3a0; color: #2a2a2a; clip-path: none; border-radius: 4px 8px 6px 10px; box-shadow: 4px 6px 0 rgba(42,42,42,.18); padding-top: 24px; }
.theme-sketch .twist-top { color: #2a2a2a; font-weight: 400; }
.theme-sketch .sun { clip-path: none; width: 16px; height: 16px; border-radius: 50%; background: #d6372b; box-shadow: inset -2px -3px 0 rgba(0,0,0,.25); }
.theme-sketch .twist-title { font-weight: 400; margin-top: 8px; }
.theme-sketch .twist-copy { color: #4a3f10; }
.theme-sketch .controls { border-top: 2px dashed rgba(42,42,42,.35); }
.theme-sketch .action { border: 2px solid #2a2a2a; border-radius: 8px 12px 10px 14px; clip-path: none; box-shadow: 3px 4px 0 rgba(42,42,42,.2); font-weight: 400; }
.theme-sketch .action.start, .theme-sketch .action.correct { background: var(--mode-accent, #e5484d); color: #2a2a2a; clip-path: none; }
.theme-sketch .action.skip { background: #fffdf7; }
.theme-sketch button:focus-visible { outline-color: #d6372b; }

@media (max-width: 740px) {
  .mast-inner, .sheet { padding-left: 18px; padding-right: 18px; }
  .mast-inner { min-height: 49px; }
  .brand { font-size: 19px; }
  .seal { width: 31px; height: 29px; }
  .heading { margin: 18px 0 12px; flex-wrap: wrap; gap: 12px; }
  .heading-name { gap: 9px; }
  .headline { font-size: 29px; }
  .round-no { padding: 4px 7px; font-size: 11px; }
  .mode-button { padding: 0 6px; font-size: 13px; min-height: 35px; gap: 3px; }
  .mode-icon, .mode-icon image { width: 15px; height: 15px; }
  .columns { display: flex; flex-direction: column; gap: 13px; }
  .task-card { min-height: 216px; padding: 16px 17px 14px; }
  .hero { min-height: 105px; padding: 10px 0; }
  .answer { font-size: 42px; }
  .hero-note { margin-top: 6px; font-size: 13px; }
  .dossier { height: 132px; }
  .rule { padding: 10px 0 0; gap: 8px; }
  .rule-icon { width: 21px; height: 19px; }
  .rule-name, .rule-copy { display: inline; font-size: 13px; }
  .rule-name { margin-right: 7px; }
  .details { display: grid; grid-template-columns: minmax(0,.82fr) minmax(0,1.18fr); gap: 9px; }
  .clock-panel, .twist { padding: 12px; }
  .panel-top { align-items: flex-start; flex-wrap: wrap; gap: 2px 6px; }
  .digits { font-size: 39px; margin-top: 10px; }
  .twist-top, .label { font-size: 12px; }
  .sun { width: 15px; height: 17px; }
  .twist-title { font-size: 18px; margin-top: 6px; }
  .twist-copy { font-size: 13px; line-height: 1.5; }
  .sheet { padding-bottom: calc(126px + env(safe-area-inset-bottom)); }
  .controls { position: fixed; z-index: 3; bottom: 0; left: 0; right: 0; margin: 0; padding: 10px 18px calc(10px + env(safe-area-inset-bottom)); background: #efe4c9; flex-wrap: wrap; gap: 8px; }
  .stats { gap: 14px; }
  .stats > view { gap: 5px; }
  .score { font-size: 22px; } .skips { font-size: 16px; }
  .buttons { margin-left: auto; }
  .action { min-width: 0; min-height: 46px; padding: 8px 12px; font-size: 16px; gap: 9px; }
  .start { min-width: 128px; }
  .theme-sketch .controls { background: #f7f2e4; }
  .theme-spy-light .controls { background: #f4eee1; }
  .theme-sketch .red-circle { left: -12px; right: -12px; top: -5px; bottom: -2px; }
  .theme-sketch .tape { width: 92px; height: 28px; }
}
@media (max-width: 440px) {
  .heading { align-items: flex-start; flex-direction: column; }
  .buttons { width: 100%; }
  .buttons .action { flex: 1; justify-content: center; }
  .buttons .correct { flex: 1.45; }
  .clock-state { font-size: 11px; }
}
@media (max-width: 350px) {
  .details { grid-template-columns: minmax(0,.75fr) minmax(0,1.25fr); }
  .answer { font-size: 34px; }
  .digits { font-size: 32px; }
}
</style>
