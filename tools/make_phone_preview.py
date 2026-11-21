"""Build a single-file, offline, phone-sized round-screen preview on the Desktop.

Usage: python tools/make_phone_preview.py
Reads: data/library-pack.json, design/MODE_ASSETS.json, src/static/art/*, assets/fonts/*
Writes: <Desktop>/kai-ge-nao-dong-round-preview.html  (opens offline on a phone browser)
"""
import base64
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "src" / "static" / "art"
FONT = ROOT / "assets" / "fonts" / "ZCOOLKuaiLe-Regular.ttf"
OUT = Path(os.environ.get("USERPROFILE", str(Path.home()))) / "Desktop" / "开个脑洞-回合屏预览.html"


def b64(path):
    return base64.b64encode(path.read_bytes()).decode()


def data_uri(name):
    return f"data:image/svg+xml;base64,{b64(ART / name)}"


pack = json.loads((ROOT / "data" / "library-pack.json").read_text(encoding="utf-8"))
assets = json.loads((ROOT / "design" / "MODE_ASSETS.json").read_text(encoding="utf-8"))
palette = assets["shared"]["palette"]

modes = []
for m in assets["modes"]:
    modes.append({
        "id": m["mode_id"], "name": m["name"], "ruleTitle": m["rule_title"],
        "rule": m["rule_description"], "performer": m["performer_label"],
        "seconds": m["timer_seconds"],
        "accent": m["theme_assets"]["sketch"]["accent"],
        "spy": palette[m["accent_role"]]["hex"],
        "iconA": data_uri(m["icon_asset"]),
        "patternA": data_uri(m["pattern_asset"]),
        "doodle": (ART / m["theme_assets"]["sketch"]["icon_asset"]).read_text(encoding="utf-8"),
    })

a_art = {
    "seal": data_uri(assets["shared"]["seal"]),
    "shell": data_uri(assets["shared"]["card_shell"]),
    "edge": data_uri(assets["shared"]["cut_edge"]),
    "seam": data_uri(assets["shared"]["paper_seam"]),
    "shadow": data_uri(assets["shared"]["paper_shadow"]),
    "texture": data_uri(assets["shared"]["paper_texture"]),
}

font_css = ""
if FONT.exists():
    font_css = ("@font-face{font-family:'KuaiLe';src:url(data:font/ttf;base64,"
                + b64(FONT) + ") format('truetype');font-display:swap;}")

TEMPLATE = r"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>开个脑洞 · 回合屏手机预览</title>
<style>
/*__FONT__*/
*{margin:0;padding:0;box-sizing:border-box}
body{background:#3a3a3a;font-family:"PingFang SC","Microsoft YaHei",sans-serif;-webkit-tap-highlight-color:transparent}
button{font:inherit;border:none;background:none;cursor:pointer}
.page{max-width:480px;margin:0 auto;min-height:100vh;min-height:100dvh;color:#1b1714;background:#f4eee1;position:relative;padding-bottom:calc(150px + env(safe-area-inset-bottom))}
.mast{border-bottom:1px solid rgba(27,23,20,.2)}
.mast-inner{display:flex;align-items:center;justify-content:space-between;min-height:52px;padding:0 16px}
.brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:19px}
.seal{width:30px;height:26px}
.brand-en{max-width:52px;font-size:9px;letter-spacing:.08em;line-height:1.05;font-weight:900;font-family:"Arial Narrow",Arial,sans-serif}
.theme-btn{font-size:12px;font-weight:700;border:1.5px solid currentColor;border-radius:999px;padding:5px 12px;color:inherit}
.sheet{padding:0 16px}
.heading{display:flex;flex-direction:column;align-items:flex-start;gap:10px;margin:16px 0 12px}
.heading-name{display:flex;align-items:center;gap:9px}
.headline{font-size:29px;font-weight:1000;letter-spacing:-.05em}
.round-no{padding:4px 8px;font-size:11px;font-weight:800;white-space:nowrap;font-family:"Arial Narrow",Arial,sans-serif}
.switcher{display:flex;gap:8px}
.mode-button{display:flex;align-items:center;gap:5px;padding:0 10px;min-height:36px;font-weight:750;font-size:13px;color:#1b1714;border:1.5px solid #1b1714;background:transparent}
.mode-button.selected{background:#1b1714;color:#efe4c9}
.mode-button .ico,.mode-button .ico img{display:block;width:15px;height:15px}
.mode-button.selected .ico-a{filter:invert(1)}
.ico-b{display:none}
.ico-b svg{width:15px;height:15px;display:block}
.card-stack{position:relative;margin:0 4px 6px 0}
.card-back{position:absolute;inset:0;width:100%;height:100%;transform:translate(4px,5px)}
.task-card{position:relative;min-height:220px;padding:16px 17px 14px;display:flex;flex-direction:column;justify-content:space-between}
.edge-cut,.paper-seam{position:absolute;pointer-events:none}
.edge-cut{right:5%;top:-.5%;width:64px;height:19px}
.paper-seam{left:2%;bottom:.7%;width:62%;height:3px}
.tape{display:none}
.card-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}
.card-label{display:inline-block;background:#1b1714;color:#efe4c9;padding:4px 10px;font-size:12px;font-weight:800;letter-spacing:.1em}
.folio{font-size:13px;font-weight:800;font-family:"Arial Narrow",Arial,sans-serif}
.hero{display:flex;position:relative;align-items:center;min-height:110px;padding:10px 0}
.answer-block{position:relative;z-index:1;min-width:0}
.answer{display:block;font-size:42px;font-weight:1000;line-height:1.18;letter-spacing:-.06em;overflow-wrap:anywhere}
.answer.medium{font-size:32px}
.answer.long,.answer.longest{letter-spacing:0;font-weight:800;line-height:1.3}
.answer.long{font-size:28px}
.answer.longest{font-size:25px}
.category,.hero-note{display:block;font-size:13px;font-weight:700;color:#1b1714}
.category{margin-bottom:6px}
.hero-note{margin-top:8px}
.dossier{display:none}
.sketch-figure{display:none}
.card-bottom{padding-top:10px;border-top:1px solid #1b1714;font-size:13px;font-weight:700;min-height:30px}
.forbidden{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.tab-label{font-size:12px;border-right:1px solid #1b1714;padding-right:10px}
.rule{display:flex;align-items:flex-start;gap:8px;padding:12px 0 0}
.rule-icon{flex:none;width:20px;height:20px}
.rule-icon img{width:100%;height:100%}
.rule-icon svg{width:20px;height:20px;display:block}
.rule-name,.rule-copy{display:inline;font-size:13px}
.rule-name{font-weight:800;margin-right:7px}
.details{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:9px;margin-top:12px}
.clock-panel{border:1.5px solid rgba(27,23,20,.4);padding:12px}
.panel-top{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:2px 6px}
.label,.twist-top{font-size:12px;font-weight:800}
.clock-state{font-size:11px;font-weight:750}
.dial{display:inline-block;position:relative}
.digits{display:block;font-weight:900;font-size:38px;letter-spacing:-.05em;line-height:1.15;margin-top:8px;font-family:"Arial Narrow",Arial,"Microsoft YaHei",sans-serif;font-variant-numeric:tabular-nums}
.red-circle{display:none}
.ruler{height:5px;background:#d8cbaf;margin-top:6px}
.ruler-fill{background:#1b1714;height:100%;transition:width .2s linear}
.urgent .digits,.urgent .clock-state{color:#9c2a19}
.urgent .ruler-fill{background:#d23a22}
.twist{position:relative;padding:12px;background:#fbf7ec;border-left:8px solid var(--mode-accent,#d23a22)}
.twist-top{display:flex;align-items:center;gap:7px}
.sun{width:12px;height:12px;background:var(--mode-accent,#d23a22)}
.twist-title{display:block;font-size:17px;font-weight:900;margin-top:6px}
.twist-copy{display:block;font-size:13px;line-height:1.5;margin-top:4px}
.controls{position:fixed;z-index:5;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:#f4eee1;border-top:2px solid #1b1714}
.stats{display:flex;gap:14px}
.stats>div{display:flex;align-items:center;gap:5px}
.stats-label{font-size:12px;font-weight:700}
.score{font-size:22px;font-weight:900;font-family:"Arial Narrow",Arial,sans-serif}
.skips{font-size:16px;font-weight:750;font-family:"Arial Narrow",Arial,sans-serif}
.buttons{display:flex;gap:8px;margin-left:auto;width:100%}
.action{display:flex;align-items:center;justify-content:center;gap:8px;flex:1;border:1.5px solid #1b1714;padding:10px 14px;min-height:46px;font-size:16px;font-weight:850;color:#1b1714;background:#efe4c9}
.action.correct{flex:1.45;background:#1b1714;color:#efe4c9}
.action.start{width:100%;background:#1b1714;color:#efe4c9}
.action[disabled]{opacity:.55}
.action-sign{font:bold 20px/1 Arial,sans-serif}

/* ===== A' spy-light 专有 ===== */
.theme-spy-light .task-card{clip-path:polygon(0.4% 1.4%,35% .7%,66% 1%,96.6% 0,100% 5.7%,99.6% 73%,100% 98.4%,54% 99.3%,14% 98.8%,.4% 100%,0 50%);color:#1b1714}
.theme-spy-light .task-card .bg-tex{position:absolute;inset:0;width:100%;height:100%;opacity:.5;pointer-events:none}
.theme-spy-light .answer{color:#efe4c9}
.theme-spy-light .task-card.mustard .answer{color:#1b1714}
.theme-spy-light .round-no{border:1.5px solid #1b1714}
.theme-spy-light .dossier.show{display:block;width:38%;max-height:120px;position:absolute;right:0;top:50%;transform:translateY(-50%) rotate(-4deg)}

/* ===== B sketch 专有 ===== */
.theme-sketch{background-color:#f7f2e4;background-image:linear-gradient(rgba(96,140,190,.16) 2px,transparent 2px),linear-gradient(90deg,rgba(96,140,190,.16) 2px,transparent 2px);background-size:34px 34px;background-position:10px 8px;color:#2a2a2a;font-family:'KuaiLe',"PingFang SC","Microsoft YaHei",sans-serif}
.theme-sketch .mast{border-bottom:2px dashed rgba(42,42,42,.35)}
.theme-sketch .seal{display:none}
.theme-sketch .brand::before{content:'✎ ';color:#d6372b}
.theme-sketch .brand,.theme-sketch .headline{font-weight:400;letter-spacing:0}
.theme-sketch .headline{padding:0 6px;background:linear-gradient(transparent 58%,var(--mode-accent,#e5484d) 58%,var(--mode-accent,#e5484d) 92%,transparent 92%)}
.theme-sketch .theme-btn{border-width:2px;border-radius:8px;box-shadow:2px 2px 0 rgba(42,42,42,.2)}
.theme-sketch .round-no{background:#fffdf7;border:2px solid #2a2a2a;border-radius:6px 10px 8px 12px;box-shadow:2px 3px 0 rgba(42,42,42,.18)}
.theme-sketch .mode-button{background:#fffdf7;border:2px solid #2a2a2a;border-radius:8px 12px 10px 14px;box-shadow:2px 3px 0 rgba(42,42,42,.2);font-weight:400;color:#2a2a2a}
.theme-sketch .mode-button.selected{background:var(--mode-accent,#e5484d);color:#2a2a2a}
.theme-sketch .ico-a{display:none}
.theme-sketch .ico-b{display:block}
.theme-sketch .card-back,.theme-sketch .edge-cut,.theme-sketch .paper-seam,.theme-sketch .dossier,.theme-sketch .bg-tex{display:none}
.theme-sketch .task-card{background-color:#fffdf8;background-image:linear-gradient(90deg,transparent 74px,rgba(220,80,70,.5) 74px,rgba(220,80,70,.5) 77px,transparent 77px),repeating-linear-gradient(transparent 0 55px,rgba(90,140,200,.26) 55px 57px);border-radius:6px;box-shadow:3px 5px 0 rgba(42,42,42,.16);color:#2a2a2a}
.theme-sketch .tape{display:block;position:absolute;width:92px;height:28px;z-index:4;opacity:.92;pointer-events:none;background:repeating-linear-gradient(45deg,rgba(255,255,255,.3) 0 10px,transparent 10px 20px),rgba(240,205,110,.78);box-shadow:0 1px 2px rgba(60,40,10,.2)}
.theme-sketch .tape-a{top:-12px;left:22px;transform:rotate(-4deg)}
.theme-sketch .tape-b{top:-10px;right:24px;transform:rotate(5deg)}
.theme-sketch .tape-twist{top:-12px;left:50%;transform:translateX(-50%) rotate(-2deg)}
.theme-sketch .card-label{background:#2a2a2a;color:#fffdf8;border-radius:4px}
.theme-sketch .answer{color:#2a2a2a;font-family:'KuaiLe',"PingFang SC","Microsoft YaHei",sans-serif;font-weight:400}
.theme-sketch .answer.long,.theme-sketch .answer.longest{font-weight:400;line-height:1.35}
.theme-sketch .category{display:inline-block;padding:0 8px;font-weight:400;background:linear-gradient(transparent 45%,var(--mode-accent,#e5484d) 45%,var(--mode-accent,#e5484d) 92%,transparent 92%)}
.theme-sketch .hero-note{font-weight:400}
.theme-sketch .sketch-figure.show{display:block;width:34%;max-width:150px;position:absolute;right:2%;top:50%;transform:translateY(-50%) rotate(3deg);opacity:.95}
.theme-sketch .sketch-figure svg{width:100%;height:auto}
.theme-sketch .card-bottom{border-top:2px dashed rgba(42,42,42,.3);font-weight:400}
.theme-sketch .tab-label{border-right:2px dashed rgba(42,42,42,.3)}
.theme-sketch .forbidden .fw{text-decoration:underline wavy #d6372b 2px;text-underline-offset:5px}
.theme-sketch .rule-name{font-weight:400;border-bottom:3px solid var(--mode-accent,#e5484d)}
.theme-sketch .rule-copy{font-weight:400;color:#444}
.theme-sketch .clock-panel{background:#fffdf8;border:2px solid #2a2a2a;border-radius:10px 14px 12px 16px;box-shadow:3px 4px 0 rgba(42,42,42,.16)}
.theme-sketch .label,.theme-sketch .clock-state{font-weight:400}
.theme-sketch .red-circle{display:block;position:absolute;left:-12px;right:-12px;top:-5px;bottom:-2px;border:4px solid #d6372b;border-radius:48% 52% 51% 49%/56% 48% 52% 44%;transform:rotate(-5deg);pointer-events:none}
.theme-sketch .urgent .digits,.theme-sketch .urgent .clock-state{color:#d6372b}
.theme-sketch .urgent .red-circle{border-width:6px}
.theme-sketch .ruler{background:rgba(90,140,200,.25);height:8px;border-radius:4px}
.theme-sketch .ruler-fill{background:var(--mode-accent,#e5484d);border-radius:4px}
.theme-sketch .urgent .ruler-fill{background:#d6372b}
.theme-sketch .twist{background:#fff3a0;border-left:none;border-radius:4px 8px 6px 10px;box-shadow:4px 6px 0 rgba(42,42,42,.18);padding-top:20px;color:#2a2a2a}
.theme-sketch .twist-top{font-weight:400}
.theme-sketch .sun{width:15px;height:15px;border-radius:50%;background:#d6372b;box-shadow:inset -2px -3px 0 rgba(0,0,0,.25)}
.theme-sketch .twist-title{font-weight:400}
.theme-sketch .twist-copy{color:#4a3f10}
.theme-sketch .controls{background:#f7f2e4;border-top:2px dashed rgba(42,42,42,.35)}
.theme-sketch .action{border:2px solid #2a2a2a;border-radius:8px 12px 10px 14px;box-shadow:3px 4px 0 rgba(42,42,42,.2);font-weight:400;background:#fffdf7;color:#2a2a2a}
.theme-sketch .action.correct,.theme-sketch .action.start{background:var(--mode-accent,#e5484d);color:#2a2a2a}
</style>
</head>
<body>
<div id="page" class="page theme-sketch">
  <div class="mast"><div class="mast-inner">
    <div class="brand"><img class="seal" id="seal">开个脑洞<span class="brand-en">OPEN YOUR MIND</span></div>
    <button class="theme-btn" id="themeBtn">看 A' 对照</button>
  </div></div>
  <div class="sheet">
    <div class="heading">
      <div class="heading-name"><span class="headline">猜词回合</span><span class="round-no" id="roundNo">第 01 轮</span></div>
      <div class="switcher" id="modeSwitch"></div>
    </div>
    <div class="card-stack">
      <img class="card-back" id="cardBack">
      <div class="task-card" id="taskCard">
        <img class="bg-tex" id="bgTex">
        <img class="edge-cut" id="edgeCut"><img class="paper-seam" id="paperSeam">
        <div class="tape tape-a"></div><div class="tape tape-b"></div>
        <div class="card-meta"><span class="card-label" id="cardLabel">秘密任务卡</span><span class="folio" id="folio"></span></div>
        <div class="hero"><div class="answer-block">
          <span class="category" id="cat"></span>
          <span class="answer" id="answer">准备接题</span>
          <span class="hero-note" id="note"></span>
        </div>
        <img class="dossier" id="dossier">
        <div class="sketch-figure" id="sketchFig"></div>
        </div>
        <div class="card-bottom" id="cardBottom">猜对一题 +1 分</div>
      </div>
    </div>
    <div class="rule"><span class="rule-icon" id="ruleIcon"></span><div><span class="rule-name" id="ruleName"></span><span class="rule-copy" id="ruleCopy"></span></div></div>
    <div class="details">
      <div class="clock-panel" id="clockPanel">
        <div class="panel-top"><span class="label">回合倒计时</span><span class="clock-state" id="phaseLabel">待开始</span></div>
        <div class="dial"><span class="digits" id="digits">01:00</span><div class="red-circle"></div></div>
        <div class="ruler"><div class="ruler-fill" id="rulerFill" style="width:100%"></div></div>
      </div>
      <div class="twist">
        <div class="tape tape-twist"></div>
        <div class="twist-top"><span class="sun"></span>脑洞指令</div>
        <span class="twist-title" id="twistTitle">开题后揭晓</span>
        <span class="twist-copy" id="twistCopy">每张题卡搭配一条表达挑战。</span>
      </div>
    </div>
  </div>
  <div class="controls" id="controls">
    <div class="stats"><div><span class="stats-label">本队得分</span><span class="score" id="score">00</span></div>
    <div class="skip-stat"><span class="stats-label">已跳过</span><span class="skips" id="skips">00</span></div></div>
    <div class="buttons" id="buttons"></div>
  </div>
</div>
<script>
const PACK = __PACK__;
const MODES = __MODES__;
const A_ART = __A_ART__;
const $ = id => document.getElementById(id);
const two = n => String(n).padStart(2, '0');
const params = new URLSearchParams(location.search);
let theme = params.get('theme') === 'spy-light' ? 'spy-light' : 'sketch';
function mulberry32(a){return function(){a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
let seed = parseInt(params.get('seed') || '', 10);
if (!Number.isFinite(seed)) seed = (Math.random() * 1e9) | 0;
const rnd = mulberry32(seed);
const shuffle = arr => { const r=[...arr]; for(let i=r.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[r[i],r[j]]=[r[j],r[i]]} return r };

const S = { modeId:'verbal', phase:'ready', round:1, deck:[], twists:[], i:0, score:0, skipped:0, deadline:0, until:0, finalRemain:60, finishReason:'' };
const mode = () => MODES.find(m => m.id === S.modeId);

function prepare(modeId){
  if (S.phase !== 'ready') S.round++;
  S.modeId = modeId; S.phase = 'ready'; S.deck=[]; S.twists=[]; S.i=0; S.score=0; S.skipped=0; S.finishReason='';
  render();
}
function start(){
  const m = mode();
  S.deck = shuffle(PACK.prompts.filter(p => p.mode_id === m.id && p.review_status !== 'draft'));
  S.twists = shuffle(PACK.twists.filter(t => t.compatible_modes.includes(m.id) && t.review_status !== 'draft'));
  S.i = 0; S.deadline = Date.now() + m.seconds * 1000; S.phase = 'playing';
  render();
}
function finish(reason){ S.finalRemain = Math.max(0, Math.ceil((S.deadline - Date.now())/1000)); S.phase='round_finished'; S.finishReason=reason; }
function sync(){
  if (S.phase==='ready'||S.phase==='round_finished') return;
  const now = Date.now();
  if (now >= S.deadline) return finish('timeout');
  if (S.phase==='correct_feedback'||S.phase==='skipped'){
    if (now < S.until) return;
    S.i++;
    if (S.i === S.deck.length) return finish('deck');
  }
  S.phase = S.deadline - now <= 10000 ? 'last_call' : 'playing';
}
function act(type){
  sync();
  if (S.phase!=='playing'&&S.phase!=='last_call') return;
  if (type==='correct') S.score++; else S.skipped++;
  S.phase = type==='correct'?'correct_feedback':'skipped';
  S.until = Date.now()+650;
  render();
}
function remaining(){
  if (S.phase==='ready') return mode().seconds;
  if (S.phase==='round_finished') return S.finalRemain;
  return Math.max(0, Math.ceil((S.deadline - Date.now())/1000));
}
const active = () => S.phase!=='ready' && S.phase!=='round_finished';
const prompt = () => active() ? S.deck[S.i] : null;

function sizeClass(t){const n=[...t].length;return n>16?'longest':n>9?'long':n>4?'medium':''}

function render(){
  sync();
  const m = mode(), p = prompt();
  const page = $('page');
  page.className = 'page theme-' + theme;
  page.style.setProperty('--mode-accent', theme==='sketch' ? m.accent : m.spy);
  $('roundNo').textContent = '第 ' + two(S.round) + ' 轮';
  // mode switcher
  $('modeSwitch').innerHTML = MODES.map(x =>
    `<button class="mode-button ${x.id===m.id?'selected':''}" data-m="${x.id}">
       <img class="ico ico-a" src="${x.iconA}"><span class="ico ico-b">${x.doodle}</span>${x.name}</button>`).join('');
  document.querySelectorAll('.mode-button').forEach(b => b.onclick = () => { if(!active()) prepare(b.dataset.m); });
  // task card
  $('taskCard').classList.toggle('mustard', theme==='spy-light' && m.id==='charades');
  $('taskCard').style.backgroundColor = theme==='spy-light' ? m.spy : '';
  $('cardLabel').textContent = p ? '仅' + m.performer + '可见' : '秘密任务卡';
  $('folio').textContent = p ? two(S.i+1) + ' / ' + two(S.deck.length) : '共 ' + PACK.prompts.filter(x=>x.mode_id===m.id).length + ' 题';
  const title = p ? p.answer : (S.phase==='round_finished' ? '回合结束' : '准备接题');
  $('answer').textContent = title;
  $('answer').className = 'answer ' + sizeClass(title);
  $('cat').textContent = p ? p.category : '';
  $('note').textContent = p ? '' : (S.phase==='round_finished'
      ? (S.finishReason==='deck' ? '本模式题卡已全部完成。' : '时间到，本轮得分已记录。')
      : '请把屏幕交给' + m.performer + '。');
  if (p && p.forbidden_terms.length){
    $('cardBottom').innerHTML = '<span class="forbidden"><span class="tab-label">禁止词</span>' +
      p.forbidden_terms.map(w=>`<span class="fw">${w}</span>`).join('') + '</span>';
  } else {
    $('cardBottom').textContent = p ? '仅' + m.performer + '看题 · 请勿向队友亮屏' : '猜对一题 +1 分';
  }
  $('dossier').className = 'dossier' + (theme==='spy-light' && (!p || [...title].length<=4) ? ' show' : '');
  $('sketchFig').className = 'sketch-figure' + (theme==='sketch' && !p ? ' show' : '');
  $('sketchFig').innerHTML = m.doodle;
  // rule
  $('ruleIcon').innerHTML = theme==='sketch' ? m.doodle : `<img src="${m.patternA}">`;
  $('ruleName').textContent = m.ruleTitle;
  $('ruleCopy').textContent = m.rule;
  // clock
  const r = remaining();
  $('digits').textContent = two(Math.floor(r/60)) + ':' + two(r%60);
  $('rulerFill').style.width = (100*r/m.seconds) + '%';
  $('clockPanel').classList.toggle('urgent', active() && r <= 10);
  $('phaseLabel').textContent = ({ready:'待开始',playing:'进行中',last_call:'最后 10 秒',correct_feedback:'猜对 +1',skipped:'已跳过',round_finished:'已结束'})[S.phase];
  // twist
  const t = p ? S.twists[S.i % S.twists.length] : null;
  $('twistTitle').textContent = t ? t.title : (S.phase==='round_finished' ? '指令已归档' : '开题后揭晓');
  $('twistCopy').textContent = t ? t.instruction : (S.phase==='round_finished' ? '再开一轮，换一种表达方式。' : '每张题卡搭配一条表达挑战。');
  // controls
  $('score').textContent = two(S.score);
  $('skips').textContent = two(S.skipped);
  if (!active()){
    $('buttons').innerHTML = `<button class="action start">${S.phase==='round_finished'?'再来一轮':'开始回合'}<span class="action-sign">→</span></button>`;
    $('buttons').firstChild.onclick = () => S.phase==='round_finished' ? (prepare(S.modeId), start()) : start();
  } else {
    const locked = !['playing','last_call'].includes(S.phase);
    $('buttons').innerHTML =
      `<button class="action skip" ${locked?'disabled':''}>跳过<span class="action-sign">↷</span></button>
       <button class="action correct" ${locked?'disabled':''}>${S.phase==='correct_feedback'?'猜对 +1':'猜对'}<span class="action-sign">✓</span></button>`;
    const [sk, co] = $('buttons').children;
    sk.onclick = () => act('skip'); co.onclick = () => act('correct');
  }
  $('themeBtn').textContent = theme==='sketch' ? "看 A' 对照" : '回 B 手账';
}

$('seal').src = A_ART.seal; $('cardBack').src = A_ART.shadow; $('bgTex').src = A_ART.texture;
$('edgeCut').src = A_ART.edge; $('paperSeam').src = A_ART.seam; $('dossier').src = A_ART.shell;
$('themeBtn').onclick = () => { theme = theme==='sketch' ? 'spy-light' : 'sketch'; render(); };
setInterval(() => { if (active()) render(); }, 200);
render();
</script>
</body>
</html>
"""

html = TEMPLATE
html = html.replace("/*__FONT__*/", font_css)
html = html.replace("__PACK__", json.dumps(pack, ensure_ascii=False))
html = html.replace("__MODES__", json.dumps(modes, ensure_ascii=False))
html = html.replace("__A_ART__", json.dumps(a_art))
OUT.write_text(html, encoding="utf-8")
print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB), font embedded: {bool(font_css)}")
