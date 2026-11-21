<template>
  <RoundScreen v-if="state" :state="state" :assets="assets" :theme="theme" @command="onCommand" />
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import RoundScreen from '../../components/RoundScreen.vue'
import { createLocalRound } from '../../game/local-round.mjs'
import { mulberry32 } from '../../game/seeded-random.mjs'
import assets from '../../../design/MODE_ASSETS.json'
import pack from '../../../data/initial-pack.json'

const THEMES = ['spy-light', 'sketch']
const state = ref(null)
const theme = ref('spy-light')
let source
let ticker

function refresh() {
  if (source) state.value = source.snapshot()
}
function stop() { clearInterval(ticker) }
function onCommand(command) {
  source.dispatch(command)
  refresh()
}
onLoad(query => {
  const role = query.role === undefined || query.role === 'performer' ? 'performer' : 'guesser'
  if (THEMES.includes(query.theme)) theme.value = query.theme
  // ?seed= 固定洗牌顺序，供 A/B 评审用同一批题对比两个主题
  const seed = Number.parseInt(query.seed ?? '', 10)
  const random = Number.isFinite(seed) ? mulberry32(seed) : Math.random
  source = createLocalRound({ pack, modes: assets.modes, role, random })
  refresh()
})
onShow(() => {
  stop()
  refresh()
  ticker = setInterval(() => {
    if (state.value && !['ready', 'round_finished'].includes(state.value.phase)) refresh()
  }, 200)
})
onHide(stop)
onUnload(stop)
</script>
