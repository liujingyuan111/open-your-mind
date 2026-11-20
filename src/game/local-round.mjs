// Local authority for a pass-and-play device. Only snapshots cross the UI boundary.
const FEEDBACK_MS = 650

function shuffle(items, random) {
  const result = [...items]
  for (let end = result.length - 1; end > 0; end--) {
    const pick = Math.floor(random() * (end + 1))
    const item = result[end]
    result[end] = result[pick]
    result[pick] = item
  }
  return result
}

export function createLocalRound({ modes, pack, role = 'performer', clock = Date.now, random = Math.random }) {
  let mode = modes[0]
  let phase = 'ready'
  let roundNumber = 1
  let deadline = 0
  let feedbackUntil = 0
  let finalRemaining = 0
  let deck = []
  let twists = []
  let index = 0
  let score = 0
  let skipped = 0
  let finishReason = ''
  const isPerformer = role === 'performer'

  function finish(reason, now) {
    finalRemaining = Math.max(0, Math.ceil((deadline - now) / 1000))
    phase = 'round_finished'
    finishReason = reason
  }

  function sync(now) {
    if (phase === 'ready' || phase === 'round_finished') return
    if (now >= deadline) return finish('timeout', now)
    if (phase === 'correct_feedback' || phase === 'skipped') {
      if (now < feedbackUntil) return
      index++
      if (index === deck.length) return finish('deck', now)
    }
    phase = deadline - now <= 10000 ? 'last_call' : 'playing'
  }

  function prepare(nextMode) {
    if (phase !== 'ready') roundNumber++
    mode = nextMode
    phase = 'ready'
    deck = []
    twists = []
    index = 0
    score = 0
    skipped = 0
    finishReason = ''
  }

  function dispatch(command) {
    const now = clock()
    sync(now)
    if (!isPerformer || !command || command.round !== roundNumber) return false
    if (command.type === 'prepare') {
      const nextMode = modes.find(m => m.mode_id === command.modeId)
      if (!nextMode) return false
      prepare(nextMode)
      return true
    }
    if (command.type === 'start' && phase === 'ready') {
      deck = shuffle(pack.prompts.filter(p => p.mode_id === mode.mode_id && p.review_status !== 'draft'), random)
      twists = shuffle(pack.twists.filter(t => t.compatible_modes.includes(mode.mode_id) && t.review_status !== 'draft'), random)
      if (!deck.length || !twists.length) return false
      deadline = now + mode.timer_seconds * 1000
      phase = 'playing'
      return true
    }
    if (phase !== 'playing' && phase !== 'last_call') return false
    if (!mode.actions.includes(command.type) || deck[index].id !== command.promptId) return false
    if (command.type === 'correct') score++
    else if (command.type === 'skip') skipped++
    else return false
    phase = command.type === 'correct' ? 'correct_feedback' : 'skipped'
    feedbackUntil = now + FEEDBACK_MS
    return true
  }

  function remainingSeconds(now) {
    if (phase === 'ready') return mode.timer_seconds
    if (phase === 'round_finished') return finalRemaining
    return Math.max(0, Math.ceil((deadline - now) / 1000))
  }

  function snapshot(viewerRole = role) {
    const now = clock()
    sync(now)
    const active = phase !== 'ready' && phase !== 'round_finished'
    const canView = isPerformer && viewerRole === 'performer'
    const visible = canView && active && mode.answer_visibility === 'performer_only'
    const prompt = visible ? deck[index] : null
    return {
      modeId: mode.mode_id, phase, role: canView ? 'performer' : 'guesser', round: roundNumber, score, skipped, finishReason,
      total: active ? deck.length : pack.prompts.filter(p => p.mode_id === mode.mode_id && p.review_status !== 'draft').length,
      ordinal: active ? index + 1 : 0,
      remaining: remainingSeconds(now),
      prompt: prompt ? { id: prompt.id, answer: prompt.answer, category: prompt.category,
        forbidden: mode.input_method === 'speech' ? [...prompt.forbidden_terms] : [] } : null,
      twist: visible ? twists[index % twists.length] : null,
    }
  }

  return { snapshot, dispatch }
}
