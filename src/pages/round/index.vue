<template>
  <RoundScreen v-if="state" :state="state" :assets="assets" @command="onCommand" />
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import RoundScreen from '../../components/RoundScreen.vue'
import { createLocalRound } from '../../game/local-round.mjs'
import assets from '../../../design/MODE_ASSETS.json'
import pack from '../../../data/initial-pack.json'

const state = ref(null)
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
  source = createLocalRound({ pack, modes: assets.modes, role })
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
