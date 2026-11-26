(() => {
'use strict';

const C = window.NOEL || {};
const app = document.getElementById('app');
const fx = document.getElementById('fx');
const params = new URLSearchParams(location.search);

/* ---------------- Stockage ---------------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem('noel:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('noel:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  clear() { try { Object.keys(localStorage).filter(k => k.startsWith('noel:')).forEach(k => localStorage.removeItem(k)); } catch (e) {} },
};

if (params.has('reset')) LS.clear();
if (params.get('test') === '0') LS.set('test', false);
else if (params.has('test')) LS.set('test', true);
if (params.has('joueur')) LS.set('joueur', params.get('joueur'));
let pendingStep = params.has('etape') ? (parseInt(params.get('etape'), 10) || 0) : null;
const TEST = LS.get('test', false);

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let installPrompt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; document.dispatchEvent(new Event('installable')); });
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

/* ---------------- Utilitaires ---------------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');
const rand = (a, b) => a + Math.random() * (b - a);
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
const easeOut = t => 1 - Math.pow(1 - t, 3);
function tween(ms, fn, cb) {
  const t0 = performance.now();
  const f = now => { const t = Math.min(1, (now - t0) / ms); fn(t); if (t < 1) requestAnimationFrame(f); else if (cb) cb(); };
  requestAnimationFrame(f);
}
function drag(el, { move, end }) {
  let sx = 0, sy = 0, on = false;
  el.addEventListener('pointerdown', e => { on = true; sx = e.clientX; sy = e.clientY; try { el.setPointerCapture(e.pointerId); } catch (_) {} ac(); });
  el.addEventListener('pointermove', e => { if (on) move(e.clientX - sx, e.clientY - sy, e); });
  const up = e => { if (!on) return; on = false; if (end) end(e.clientX - sx, e.clientY - sy); };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}
function wiggle(el) { el.classList.remove('wiggle'); void el.getBoundingClientRect(); el.classList.add('wiggle'); }
const svgScale = svg => { const m = svg.getScreenCTM(); return m ? 1 / m.a : 1; };

/* ---------------- Sons (générés, pas de fichiers) ---------------- */
let MUTED = LS.get('mute', false);
(function muteButton() {
  const b = document.createElement('button');
  b.className = 'mute'; b.setAttribute('aria-label', 'Couper le son');
  const paint = () => { b.textContent = MUTED ? '🔇' : '🔊'; };
  paint();
  b.onclick = () => { MUTED = !MUTED; LS.set('mute', MUTED); paint(); };
  document.body.appendChild(b);
})();
let actx = null;
function ac() {
  if (!actx) { const A = window.AudioContext || window.webkitAudioContext; if (A) actx = new A(); }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur = 0.15, type = 'sine', vol = 0.2, when = 0) {
  if (MUTED) return; const a = ac(); if (!a) return;
  const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur = 0.12, vol = 0.25, freq = 2000) {
  if (MUTED) return; const a = ac(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination); s.start();
}
const sfx = {
  giggle() { [880, 990, 880, 1100].forEach((f, i) => tone(f, 0.07, 'triangle', 0.14, i * 0.07)); },
  rip() { noise(0.16, 0.4, rand(1500, 3500)); },
  pop() { tone(620, 0.08, 'triangle', 0.25); tone(930, 0.12, 'triangle', 0.2, 0.05); },
  rattle() { for (let i = 0; i < 4; i++) setTimeout(() => noise(0.04, 0.35, rand(700, 1400)), i * 55); },
  whoosh() { noise(0.5, 0.25, 500); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.16, i * 0.09)); },
  jingle() {
    const E = 659, G = 784, Cn = 523, D = 587;
    const notes = [[E, 1], [E, 1], [E, 2], [E, 1], [E, 1], [E, 2], [E, 1], [G, 1], [Cn, 1.5], [D, .5], [E, 3]];
    let t = 0;
    for (const [f, d] of notes) { tone(f, 0.28 * d, 'sine', 0.16, t); tone(f * 2, 0.18 * d, 'sine', 0.05, t); t += 0.17 * d; }
  },
};

/* ---------------- Effets visuels ---------------- */
(function snow() {
  const el = document.getElementById('snow');
  for (let i = 0; i < 26; i++) {
    const f = document.createElement('i');
    f.className = 'flake';
    f.textContent = Math.random() < 0.3 ? '❄' : '•';
    f.style.cssText = `left:${rand(0, 100)}%;font-size:${rand(6, 18)}px;animation-duration:${rand(8, 18)}s;animation-delay:${-rand(0, 18)}s;--dx:${rand(-40, 40)}px;opacity:${rand(.3, .85)}`;
    el.appendChild(f);
  }
})();
const COLORS = ['#e2b35a', '#fbf3e4', '#ff6b6b', '#7ed6a5', '#8fb8ff'];
function burst(el, n = 20) {
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'), a = rand(0, Math.PI * 2), d = rand(60, 180);
    s.className = 'spark';
    s.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;background:${COLORS[i % COLORS.length]}`;
    fx.appendChild(s); setTimeout(() => s.remove(), 900);
  }
}
function scraps(x, y) {
  for (let i = 0; i < 2; i++) {
    const s = document.createElement('i');
    s.className = 'scrap';
    s.style.cssText = `left:${x}px;top:${y}px;width:${rand(10, 26)}px;height:${rand(8, 18)}px;--dx:${rand(-90, 90)}px;--dy:${rand(40, 200)}px;--r:${rand(-300, 300)}deg`;
    fx.appendChild(s); setTimeout(() => s.remove(), 1000);
  }
}
function fallFlake(el) {
  const r = el.getBoundingClientRect(), f = document.createElement('i');
  f.className = 'fall-flake'; f.textContent = '❄';
  f.style.cssText = `left:${r.left + rand(.2, .8) * r.width}px;top:${r.top + r.height * .3}px;--dx:${rand(-60, 60)}px`;
  fx.appendChild(f); setTimeout(() => f.remove(), 1500);
}
function confetti(n = 110) {
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.cssText = `left:${rand(0, 100)}vw;background:${COLORS[i % COLORS.length]};animation-duration:${rand(2.4, 4.6)}s;animation-delay:${rand(0, .7)}s;--dx:${rand(-80, 80)}px;--r:${rand(-720, 720)}deg`;
    fx.appendChild(c); setTimeout(() => c.remove(), 5600);
  }
}

/* ---------------- Dessins SVG ---------------- */
function giftSVG(name, withTag = true) {
  const fs = name && name.length > 8 ? 11 : 15;
  return `<svg viewBox="0 0 300 300">
    <defs><pattern id="pap" width="36" height="36" patternUnits="userSpaceOnUse">
      <rect width="36" height="36" fill="#b3263b"/>
      <path d="M18 8l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.5-4 6-.6z" fill="#e2b35a"/>
      <circle cx="4" cy="30" r="2" fill="#fbf3e4" opacity=".8"/></pattern></defs>
    <ellipse cx="150" cy="286" rx="122" ry="11" fill="rgba(0,0,0,.25)"/>
    <rect x="45" y="125" width="210" height="155" rx="8" fill="url(#pap)"/>
    <rect x="45" y="125" width="210" height="16" fill="rgba(0,0,0,.15)"/>
    <rect x="35" y="100" width="230" height="38" rx="7" fill="url(#pap)"/>
    <rect x="35" y="100" width="230" height="38" rx="7" fill="rgba(255,255,255,.06)"/>
    <rect class="rib" x="136" y="100" width="28" height="180" fill="#e2b35a"/>
    <g class="bow">
      <path d="M150 100 C108 56 84 84 98 101 C110 114 134 108 150 100Z" fill="#e2b35a" stroke="#b8893a" stroke-width="3"/>
      <path d="M150 100 C192 56 216 84 202 101 C190 114 166 108 150 100Z" fill="#e2b35a" stroke="#b8893a" stroke-width="3"/>
      <path d="M145 104 L122 146 L134 142 L139 154 L154 106Z" fill="#d4a24c"/>
      <path d="M155 104 L178 146 L166 142 L161 154 L146 106Z" fill="#d4a24c"/>
      <circle cx="150" cy="101" r="11" fill="#d4a24c" stroke="#b8893a" stroke-width="3"/>
    </g>
    ${withTag ? `<g transform="rotate(10 236 160)">
      <path d="M160 104 Q200 120 214 150" stroke="#fbf3e4" stroke-width="2" fill="none"/>
      <rect x="196" y="146" width="84" height="38" rx="7" fill="#fbf3e4"/>
      <circle cx="206" cy="165" r="3.5" fill="#5b1220"/>
      <text x="243" y="171" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="${fs}" fill="#8b1e2d">${esc(name)}</text>
    </g>` : ''}
  </svg>`;
}

function kraftSVG(name) {
  return `<svg viewBox="0 0 300 300">
    <ellipse cx="150" cy="286" rx="122" ry="11" fill="rgba(0,0,0,.25)"/>
    <g class="kbox">
      <rect x="45" y="125" width="210" height="155" rx="8" fill="#c8996a"/>
      <rect x="45" y="125" width="210" height="16" fill="rgba(0,0,0,.1)"/>
      <rect x="45" y="248" width="210" height="32" rx="8" fill="rgba(0,0,0,.06)"/>
      <g transform="rotate(-8 150 205)">
        <rect x="80" y="178" width="140" height="56" rx="6" fill="none" stroke="#8b1e2d" stroke-width="3"/>
        <text x="150" y="201" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="16" fill="#8b1e2d">BOIS ROUELLE</text>
        <text x="150" y="222" text-anchor="middle" font-family="Georgia,serif" font-size="12" fill="#8b1e2d">FRAGILE · ${esc((name || '').toUpperCase())}</text>
      </g>
    </g>
    <g class="klid">
      <rect x="35" y="100" width="230" height="38" rx="7" fill="#d6a97a"/>
      <rect x="135" y="100" width="30" height="38" fill="rgba(255,255,255,.38)"/>
      <rect x="135" y="125" width="30" height="40" fill="rgba(255,255,255,.3)"/>
    </g>
  </svg>`;
}

const DOLLS = [
  { body: '#b3263b', accent: '#e2b35a', scarf: '#1f4d3a' },
  { body: '#1f6f5c', accent: '#f7d08a', scarf: '#b3263b' },
  { body: '#2c4f9e', accent: '#f4a6a6', scarf: '#e2b35a' },
  { body: '#d9692b', accent: '#fbf3e4', scarf: '#2c4f9e' },
];
const FINAL = { body: '#e2b35a', accent: '#b3263b', scarf: '#8b1e2d' };
const SIL = 'M100 18 C142 18 162 50 160 86 C158 112 146 122 152 142 C178 172 188 212 182 248 C176 284 142 298 100 298 C58 298 24 284 18 248 C12 212 22 172 48 142 C54 122 42 112 40 86 C38 50 58 18 100 18 Z';

function dollSVG({ body, accent, scarf, face, id }) {
  let faceSVG;
  if (face === 'empty') {
    faceSVG = `<circle cx="100" cy="88" r="36" fill="rgba(255,255,255,.5)" stroke="#8b1e2d" stroke-width="3" stroke-dasharray="7 6"/>
      <text x="100" y="100" text-anchor="middle" font-family="Georgia,serif" font-size="34" font-weight="700" fill="#8b1e2d">?</text>`;
  } else if (face) {
    faceSVG = `<image href="${face}" x="62" y="50" width="76" height="76" clip-path="url(#face-${id})" preserveAspectRatio="xMidYMid slice"/>`;
  } else {
    faceSVG = `<circle cx="100" cy="88" r="36" fill="#ffe3cf"/>
      <path d="M64 84 Q100 36 136 84 Q122 64 100 68 Q78 64 64 84Z" fill="#6b3b22"/>
      <circle cx="87" cy="92" r="3.6" fill="#3a2a20"/><circle cx="113" cy="92" r="3.6" fill="#3a2a20"/>
      <circle cx="80" cy="104" r="6.5" fill="#f59aa0" opacity=".75"/><circle cx="120" cy="104" r="6.5" fill="#f59aa0" opacity=".75"/>
      <path d="M91 108 Q100 116 109 108" stroke="#8b1e2d" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  const flower = [0, 72, 144, 216, 288].map(a => {
    const r = a * Math.PI / 180;
    return `<circle cx="${100 + Math.cos(r) * 17}" cy="${232 + Math.sin(r) * 17}" r="11" fill="${accent}"/>`;
  }).join('');
  return `<svg viewBox="0 0 200 310" class="doll">
    <defs>
      <clipPath id="top-${id}"><rect x="-50" y="-50" width="300" height="218"/></clipPath>
      <clipPath id="bot-${id}"><rect x="-50" y="168" width="300" height="200"/></clipPath>
      <clipPath id="sil-${id}"><path d="${SIL}"/></clipPath>
      <clipPath id="face-${id}"><circle cx="100" cy="88" r="36"/></clipPath>
    </defs>
    <ellipse cx="100" cy="302" rx="78" ry="8" fill="rgba(0,0,0,.25)"/>
    <g class="bot"><g clip-path="url(#bot-${id})"><g clip-path="url(#sil-${id})">
      <path d="${SIL}" fill="${body}"/>
      <ellipse cx="100" cy="236" rx="58" ry="54" fill="#fff8ec"/>
      ${flower}<circle cx="100" cy="232" r="10" fill="${scarf}"/>
      <path d="M58 270 Q100 250 142 270" stroke="${scarf}" stroke-width="5" fill="none"/>
    </g></g></g>
    <g class="top"><g clip-path="url(#top-${id})"><g clip-path="url(#sil-${id})">
      <path d="${SIL}" fill="${body}"/>
      <circle cx="100" cy="86" r="46" fill="${scarf}"/>
      <circle cx="56" cy="138" r="5" fill="${accent}"/><circle cx="144" cy="138" r="5" fill="${accent}"/>
      <circle cx="72" cy="152" r="4" fill="${accent}"/><circle cx="128" cy="152" r="4" fill="${accent}"/>
      <rect x="0" y="160" width="200" height="8" fill="${accent}"/>
    </g></g>
    <circle cx="100" cy="88" r="40" fill="#fff8ec"/>
    ${faceSVG}</g>
  </svg>`;
}

/* Cheminée avec les jambes du Père Noël qui dépassent */
function chimneySVG() {
  return `<svg viewBox="0 0 300 300">
    <g class="legs">
      <g class="leg-a"><rect x="124" y="70" width="22" height="160" rx="6" fill="#c0392b"/>
        <rect x="120" y="66" width="30" height="14" rx="6" fill="#fbf3e4"/>
        <path d="M122 68 L122 40 Q122 30 132 30 L148 30 Q150 40 146 44 L146 68Z" fill="#1d1d24"/>
        <path d="M122 34 Q104 30 104 22 Q114 18 132 26Z" fill="#1d1d24"/></g>
      <g class="leg-b"><rect x="154" y="70" width="22" height="160" rx="6" fill="#c0392b"/>
        <rect x="150" y="66" width="30" height="14" rx="6" fill="#fbf3e4"/>
        <path d="M178 68 L178 40 Q178 30 168 30 L152 30 Q150 40 154 44 L154 68Z" fill="#1d1d24"/>
        <path d="M178 34 Q196 30 196 22 Q186 18 168 26Z" fill="#1d1d24"/></g>
    </g>
    <path d="M0 262 L300 236 L300 300 L0 300Z" fill="#4a2a24"/>
    <path d="M0 262 L300 236" stroke="#f4f7ff" stroke-width="10" stroke-linecap="round"/>
    <rect x="100" y="150" width="100" height="110" fill="#8e3b2e"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<line x1="100" x2="200" y1="${164 + i * 13}" y2="${164 + i * 13}" stroke="rgba(0,0,0,.25)"/>` +
      `<line x1="${i % 2 ? 125 : 150}" x2="${i % 2 ? 125 : 150}" y1="${151 + i * 13}" y2="${164 + i * 13}" stroke="rgba(0,0,0,.25)"/>` +
      `<line x1="${i % 2 ? 175 : 112}" x2="${i % 2 ? 175 : 112}" y1="${151 + i * 13}" y2="${164 + i * 13}" stroke="rgba(0,0,0,.25)"/>`).join('')}
    <rect x="90" y="140" width="120" height="18" rx="3" fill="#6d2a20"/>
    <ellipse cx="150" cy="140" rx="66" ry="9" fill="#f4f7ff"/>
    <rect x="116" y="138" width="68" height="8" fill="#1a0d0a"/>
  </svg>`;
}

/* Le personnage : un lutin avec la tête cartoon du joueur */
function heroSVG(p, id) {
  const head = p.photo
    ? `<image href="${esc(p.photo)}" x="42" y="12" width="116" height="116" clip-path="url(#hc-${id})" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="100" cy="70" r="58" fill="#ffe3cf"/>
       <path d="M44 66 Q100 -6 156 66 Q136 38 100 42 Q64 38 44 66Z" fill="#6b3b22"/>
       <ellipse cx="80" cy="74" rx="7" ry="9" fill="#fff"/><ellipse cx="120" cy="74" rx="7" ry="9" fill="#fff"/>
       <circle cx="81" cy="76" r="4.5" fill="#3a2a20"/><circle cx="121" cy="76" r="4.5" fill="#3a2a20"/>
       <circle cx="68" cy="94" r="9" fill="#f59aa0" opacity=".7"/><circle cx="132" cy="94" r="9" fill="#f59aa0" opacity=".7"/>
       <path d="M82 98 Q100 118 118 98 Q100 106 82 98Z" fill="#8b1e2d"/>`;
  return `<svg viewBox="0 0 200 320" class="hero">
    <defs><clipPath id="hc-${id}"><circle cx="100" cy="70" r="58"/></clipPath></defs>
    <ellipse class="h-shadow" cx="100" cy="312" rx="52" ry="7" fill="rgba(0,0,0,.25)"/>
    <g class="h-body">
      <g class="leg-l"><rect x="76" y="236" width="15" height="56" rx="7" fill="#1f4d3a"/>
        <path d="M91 284 L91 298 Q70 302 58 292 Q52 280 62 284 Q70 288 76 284Z" fill="#8b1e2d"/></g>
      <g class="leg-r"><rect x="109" y="236" width="15" height="56" rx="7" fill="#1f4d3a"/>
        <path d="M109 284 L109 298 Q130 302 142 292 Q148 280 138 284 Q130 288 124 284Z" fill="#8b1e2d"/></g>
      <path d="M64 140 Q100 128 136 140 L156 248 Q100 266 44 248Z" fill="#2e8b57"/>
      <path d="M44 248 L52 238 L60 250 L70 240 L80 252 L90 242 L100 254 L110 242 L120 252 L130 240 L140 250 L148 238 L156 248 Q100 266 44 248Z" fill="#fbf3e4"/>
      <rect x="52" y="196" width="96" height="14" fill="#3a1a08"/>
      <rect x="90" y="193" width="20" height="20" rx="3" fill="none" stroke="#e2b35a" stroke-width="4"/>
      <circle cx="100" cy="166" r="4" fill="#e2b35a"/><circle cx="100" cy="230" r="4" fill="#e2b35a"/>
      <g class="arm-l"><path d="M68 150 Q40 172 34 204" stroke="#2e8b57" stroke-width="17" stroke-linecap="round" fill="none"/>
        <circle cx="33" cy="208" r="11" fill="#ffe3cf"/></g>
      <g class="arm-r"><path d="M132 150 Q162 132 170 100" stroke="#2e8b57" stroke-width="17" stroke-linecap="round" fill="none"/>
        <circle cx="171" cy="95" r="11" fill="#ffe3cf"/></g>
      <path d="M68 138 L78 150 L88 138 L100 152 L112 138 L122 150 L132 138 Q100 128 68 138Z" fill="#c0392b"/>
    </g>
    <g class="h-head">
      <circle cx="100" cy="70" r="63" fill="#fbf3e4"/>
      ${head}
      <path d="M52 40 C66 -2 136 -14 178 26 C160 22 150 28 148 38 Q100 18 52 40Z" fill="#c0392b"/>
      <path d="M44 46 Q100 14 156 40 L158 56 Q100 30 42 62Z" fill="#fbf3e4"/>
      <circle cx="180" cy="28" r="12" fill="#fbf3e4"/>
    </g>
  </svg>`;
}

/* ---------------- Filtre « cartoon » ---------------- */
function cartoonize(canvas) {
  const S = canvas.width, g = canvas.getContext('2d');
  const im = g.getImageData(0, 0, S, S), d = im.data, N = S * S;
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N), Y = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    R[i] = d[i * 4]; G[i] = d[i * 4 + 1]; B[i] = d[i * 4 + 2];
    Y[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
  }
  const blur = (A, r) => {
    const tmp = new Float32Array(N), out = new Float32Array(N), w = 2 * r + 1, cl = x => x < 0 ? 0 : x >= S ? S - 1 : x;
    for (let y = 0; y < S; y++) {
      const row = y * S; let acc = 0;
      for (let x = -r; x <= r; x++) acc += A[row + cl(x)];
      for (let x = 0; x < S; x++) { tmp[row + x] = acc / w; acc += A[row + cl(x + r + 1)] - A[row + cl(x - r)]; }
    }
    for (let x = 0; x < S; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[cl(y) * S + x];
      for (let y = 0; y < S; y++) { out[y * S + x] = acc / w; acc += tmp[cl(y + r + 1) * S + x] - tmp[cl(y - r) * S + x]; }
    }
    return out;
  };
  // 1. aplats de couleur (flou fort)
  const Rb = blur(blur(R, 3), 2), Gb = blur(blur(G, 3), 2), Bb = blur(blur(B, 3), 2);
  // 2. contours (Sobel sur une version légèrement floutée)
  const Ys = blur(Y, 1), E = new Float32Array(N);
  for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
    const i = y * S + x;
    const gx = -Ys[i - S - 1] - 2 * Ys[i - 1] - Ys[i + S - 1] + Ys[i - S + 1] + 2 * Ys[i + 1] + Ys[i + S + 1];
    const gy = -Ys[i - S - 1] - 2 * Ys[i - S] - Ys[i - S + 1] + Ys[i + S - 1] + 2 * Ys[i + S] + Ys[i + S + 1];
    E[i] = Math.hypot(gx, gy);
  }
  const Eb = blur(E, 1);
  const q = v => { v = v < 0 ? 0 : v > 255 ? 255 : v; return Math.round(v / 255 * 6) * 42.5; };
  for (let i = 0; i < N; i++) {
    let r = Rb[i], gg = Gb[i], b = Bb[i];
    const L = 0.299 * r + 0.587 * gg + 0.114 * b;
    r = (L + (r - L) * 1.5) * 1.06 + 10; gg = (L + (gg - L) * 1.5) * 1.06 + 10; b = (L + (b - L) * 1.5) * 1.06 + 10;
    r = q(r); gg = q(gg); b = q(b);
    let e = (Eb[i] - 55) / 70; e = e < 0 ? 0 : e > 1 ? 1 : e;
    d[i * 4] = r * (1 - e) + 40 * e; d[i * 4 + 1] = gg * (1 - e) + 24 * e; d[i * 4 + 2] = b * (1 - e) + 20 * e;
  }
  g.putImageData(im, 0, 0);
  return canvas;
}
function flash() {
  const f = document.createElement('div'); f.className = 'flash'; document.body.appendChild(f);
  setTimeout(() => f.remove(), 600);
}

/* ---------------- Décors du Bois Rouelle ---------------- */
const BG = document.getElementById('bg');
let currentScene = null;
function setScene(name) {
  if (!name || name === currentScene) return;
  currentScene = name;
  const layer = document.createElement('div');
  layer.className = 'bg-layer';
  layer.style.backgroundImage = `url(bg/${name}.jpg)`;
  BG.appendChild(layer);
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('on')));
  setTimeout(() => { while (BG.children.length > 1) BG.firstElementChild.remove(); }, 1300);
}
addEventListener('load', () => {
  ['maison', 'grange', 'coucher', 'chaton', 'boites', 'raisin', 'pipi', 'raisin2', 'chaises', 'grange2', 'maison2', 'chaises2', 'coucher2', 'boites2', 'pipi2'].forEach(n => { const i = new Image(); i.src = `bg/${n}.jpg`; });
});
// un décor différent à chaque écran, jamais deux fois le même
const SCENES = { selfie: 'grange', ruban: 'coucher', papier: 'chaton', secouer: 'boites', rennes: 'pipi', traineau: 'grange2',
  clochettes: 'chaises', cheminee: 'maison2', personnage: 'coucher2', cadenas: 'boites2', code: 'pipi2', bougie: 'chaises' };
const DOLL_SCENES = ['raisin', 'raisin2', 'chaises2'];

/* ---------------- Gestion des écrans ---------------- */
let cleanups = [];
const onCleanup = fn => cleanups.push(fn);
function screen(html) {
  cleanups.forEach(f => { try { f(); } catch (e) {} });
  cleanups = [];
  app.innerHTML = `<section class="screen">${html}</section>`;
  return app.firstElementChild;
}
function leave(cb, delay = 0) {
  setTimeout(() => {
    const s = app.firstElementChild;
    if (s) s.classList.add('out');
    setTimeout(cb, 350);
  }, delay);
}

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function findPlayer(name) {
  const n = norm(name);
  if (!n) return null;
  return (C.joueurs || []).find(j => [j.nom, ...(j.aussi || [])].some(x => norm(x) === n)) || null;
}
const KEY = 'ne-pas-ouvrir';
function decodeCode(s) {
  try {
    const bin = atob(s), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length);
    return new TextDecoder().decode(bytes);
  } catch (e) { return s; }
}
function encodeCode(str) {
  const b = new TextEncoder().encode(str); let out = '';
  b.forEach((x, i) => { out += String.fromCharCode(x ^ KEY.charCodeAt(i % KEY.length)); });
  return btoa(out);
}
function getPerson() {
  const j = findPlayer(LS.get('joueur', null));
  if (!j) return null;
  return Object.assign({ messages: C.messagesParDefaut || [] }, j, {
    prenom: j.nom,
    code: j.codeSecret ? decodeCode(j.codeSecret) : (j.code || '???'),
    photo: LS.get('selfie:' + j.nom, null) || j.photo || '',
  });
}

/* Outil : ?test&encode=MOT affiche la version brouillée d'un code */
function encodeScreen(word) {
  setScene('maison');
  const s = screen(`<h1>Code brouillé</h1>
    <div class="hint">« ${esc(word)} » devient :</div>
    <div class="card" style="font-family:monospace;font-size:22px;-webkit-user-select:text;user-select:text">${esc(encodeCode(word))}</div>
    <div class="small">À copier dans config.js : codeSecret: "…"</div>`);
}

function start() {
  if (TEST && params.has('encode')) return encodeScreen(params.get('encode').toUpperCase());
  if (!isStandalone() && !TEST && !LS.get('skipInstall', false)) return installScreen();
  const p = getPerson();
  if (!p) return nameScreen();
  if (pendingStep !== null) { LS.set('step:' + p.nom, pendingStep); pendingStep = null; }
  runStep(p);
}

/* --- Installation sur l'écran d'accueil --- */
function installScreen() {
  setScene('maison');
  const steps = isIOS
    ? `<ol><li>Touche le bouton <b>Partager</b> <span style="font-size:20px">⬆️</span> (le carré avec une flèche, en bas ou en haut de Safari)</li>
         <li>Fais défiler et choisis <b>« Sur l'écran d'accueil »</b></li>
         <li>Touche <b>Ajouter</b>, puis ouvre l'icône 🎁 <b>Ne pas ouvrir</b></li></ol>`
    : `<ol><li>Touche le bouton <b>Installer</b> juste en dessous<br><span class="small">(ou le menu ⋮ en haut à droite → « Installer l'application » / « Ajouter à l'écran d'accueil »)</span></li>
         <li>Ouvre l'icône 🎁 <b>Ne pas ouvrir</b> sur ton écran d'accueil</li></ol>`;
  const s = screen(`
    <div class="place">Noël au Bois Rouelle</div>
    <h1>🎁 Un cadeau<br>t'attend !</h1>
    <div class="hint">Pour l'ouvrir, installe d'abord<br>l'appli sur ton téléphone :</div>
    <div class="howto">${steps}</div>
    <div class="col">
      <button class="btn" id="inst" hidden>Installer 🎄</button>
      <button class="link" id="skip">Continuer dans le navigateur</button>
    </div>`);
  const inst = s.querySelector('#inst');
  const show = () => { if (installPrompt) inst.hidden = false; };
  show();
  document.addEventListener('installable', show);
  onCleanup(() => document.removeEventListener('installable', show));
  inst.onclick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const r = await installPrompt.userChoice.catch(() => null);
    installPrompt = null; inst.hidden = true;
    if (r && r.outcome === 'accepted') s.querySelector('.hint').innerHTML = "C'est installé ! 🎉<br>Ouvre maintenant l'icône 🎁 <b>Ne pas ouvrir</b> sur ton écran d'accueil.";
  };
  s.querySelector('#skip').onclick = () => { LS.set('skipInstall', true); leave(start); };
}

/* --- Qui es-tu ? --- */
function nameScreen() {
  setScene('maison');
  const s = screen(`
    <div class="place">Noël au Bois Rouelle</div>
    <h1>🎁 Un cadeau<br>t'attend !</h1>
    <div class="hint">Mais d'abord… qui es-tu ?</div>
    <div class="pick${(C.joueurs || []).length > 6 ? ' many' : ''}">${(C.joueurs || []).map((j, i) => `<button class="btn ghost" data-i="${i}">${esc(j.nom)}${LS.get('codeVu:' + j.nom, false) ? ' ✓' : ''}</button>`).join('')}</div>
    <div class="small">Touche ton prénom. Pas de triche 😏${(C.joueurs || []).some(j => LS.get('codeVu:' + j.nom, false)) ? '<br>✓ = déjà déballé' : ''}</div>`);
  s.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
    const j = C.joueurs[+b.dataset.i];
    ac(); sfx.win(); burst(b, 16);
    LS.set('joueur', j.nom);
    b.textContent = LS.get('codeVu:' + j.nom, false) ? `Re-bonjour ${j.nom} !` : `Bienvenue ${j.nom} ! 🎉`;
    leave(start, 700);
  });
}

/* ================= ESCAPE GAME : le coffre à symboles ================= */
const SYMS = ['🦌', '🎅', '🛷', '🔔', '⭐', '🎄', '❄️', '🍪'];
const SLOT_TYPES = [null, 'indice', 'question', 'duo'];   // symbole 1 = le sien ; 2, 3, 4 = gardiens
function hashStr(str) { let h = 2166136261; for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function comboOf(nom) {
  let h = hashStr(nom + '·bois-rouelle'), pool = SYMS.slice(), out = [];
  for (let k = 0; k < 4; k++) { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; out.push(pool.splice(h % pool.length, 1)[0]); }
  return out;
}
const players = () => C.joueurs || [];
function guardiansOf(nom) {                    // [null, gardien2, gardien3, gardien4]
  const L = players(), n = L.length, i = L.findIndex(j => j.nom === nom);
  if (i < 0 || n < 2) return [null, null, null, null];
  const offs = n >= 6 ? [1, 3, 5] : [1, 2, 3].map(o => Math.min(o, n - 1));
  return [null, ...offs.map(o => L[(i + o) % n])];
}
function slotFor(holderNom, seekerNom) {        // quel symbole (2, 3 ou 4) ce gardien garde pour ce chercheur ?
  const g = guardiansOf(seekerNom);
  for (let k = 1; k <= 3; k++) if (g[k] && g[k].nom === holderNom) return k;
  return 0;
}
/* Indices progressifs : lettres mélangées → rébus (2 min) → mot en clair (4 min) */
const CLUE_STEP = 120;   // secondes entre deux niveaux d'indice
function scramble(word) {
  return word.toUpperCase().split(/[\s'’-]+/).filter(Boolean).map(w => {
    const a = [...w]; let h = hashStr(w);
    for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    let out = a.join('');
    if (out === w && w.length > 1) out = out.slice(1) + out[0];
    return out;
  }).join(' ');
}
function clueHTML(holder, k, elapsed) {
  const L = holder.indices || [];
  if (!L.length) return '🔎 ' + esc(clueAbout(holder, k));
  const it = L[(k - 1) % L.length], m = typeof it === 'string' ? { mot: it } : it;
  const lvl = Math.min(2, Math.floor(elapsed / CLUE_STEP));
  let html = `🔤 Mot mystère, lettres mélangées :<br><b class="scr">${esc(scramble(m.mot))}</b>`;
  if (lvl >= 1 && m.rebus) html += `<br>💡 En images : <span class="rebus">${esc(m.rebus)}</span>`;
  if (lvl >= 2) html += `<br>🔓 En clair : <b>${esc(m.mot)}</b>`;
  if (lvl < 2) {
    const left = CLUE_STEP * (lvl + 1) - elapsed;
    html += `<br><span class="next">⏳ Indice suivant dans ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</span>`;
  }
  return html;
}
function clueAbout(holder, k) {
  const n = holder.nom, plain = norm(n).replace(/ /g, '');
  if (k === 1) return `Son prénom commence par « ${n[0].toUpperCase()} ».`;
  if (k === 2) return `Son prénom compte ${plain.length} lettres.`;
  return `Son prénom se termine par « ${n[n.length - 1].toUpperCase()} ».`;
}
const DEFAULT_Q = ['Quelle est la couleur de mes yeux ?', 'Quel est mon plat préféré ?', 'Quel est mon dessert de Noël préféré ?',
  'Quel est mon deuxième prénom ?', 'Dans quelle ville suis-je né·e ?'];
function questionOf(holder, seekerNom) {
  const Q = holder.questions && holder.questions.length ? holder.questions : DEFAULT_Q;
  return Q[hashStr(seekerNom + holder.nom) % Q.length];
}

/* Mode duo : le chercheur a un numéro, le gardien a la table numéro → symbole. Il faut les deux téléphones. */
function duoData(seekerNom, holderNom, sym) {
  let h = hashStr(seekerNom + '|' + holderNom + '|duo');
  const next = () => { h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; return h; };
  const nums = [];
  while (nums.length < SYMS.length) { const n = 10 + next() % 90; if (!nums.includes(n)) nums.push(n); }
  const table = SYMS.map((s2, i) => [s2, nums[i]]);
  for (let i = table.length - 1; i > 0; i--) { const j = next() % (i + 1); [table[i], table[j]] = [table[j], table[i]]; }
  return { num: table.find(([s2]) => s2 === sym)[1], table };
}
function duoOverlay(content, side, label) {
  const o = document.createElement('div');
  o.className = 'duo ' + side;
  o.innerHTML = `<div class="duo-box">${content}</div><div class="duo-txt">${label}</div><button class="btn ghost duo-x">Fermer</button>`;
  document.body.appendChild(o);
  o.querySelector('.duo-x').onclick = () => o.remove();
  onCleanup(() => o.remove());
}

/* Écran « gardien » : quelqu'un vient me demander un symbole */
function guardianScreen(holder, back) {
  const others = players().filter(j => j.nom !== holder.nom);
  const s = screen(`
    <h1>🗝️ Gardien·ne<br>des symboles</h1>
    <div class="hint">Qui vient te demander<br>un symbole, ${esc(holder.nom)} ?</div>
    <div class="pick many">${others.map(j => `<button class="btn ghost" data-n="${esc(j.nom)}">${esc(j.nom)}</button>`).join('')}</div>
    <button class="link" id="back">← Retour</button>`);
  s.querySelector('#back').onclick = () => leave(back);
  s.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { ac(); sfx.pop(); leave(() => guardFor(holder, players().find(j => j.nom === b.dataset.n), back)); });
}
function guardFor(holder, seeker, back) {
  const k = slotFor(holder.nom, seeker.nom), backBtn = '<button class="link" id="back">← Retour</button>';
  const bind = s => { s.querySelector('#back').onclick = () => leave(() => guardianScreen(holder, back)); };
  if (!k) {
    const s = screen(`<h1>🤷</h1><div class="hint">Tu ne gardes aucun symbole<br>pour ${esc(seeker.nom)}.</div>
      <div class="small">Qu'il·elle cherche ailleurs… et relise ses indices !</div>${backBtn}`);
    tone(200, 0.2, 'triangle', 0.1); bind(s); return;
  }
  const sym = comboOf(seeker.nom)[k], type = SLOT_TYPES[k];
  if (type === 'indice') {
    const s = screen(`<div class="hint">Tu gardes le <b>symbole n°${k + 1}</b><br>de ${esc(seeker.nom)} :</div>
      <div class="big-sym">${sym}</div><div class="small">Montre-le-lui !</div>${backBtn}`);
    sfx.win(); bind(s);
  } else if (type === 'question') {
    const s = screen(`<div class="hint">Tu gardes le <b>symbole n°${k + 1}</b> de ${esc(seeker.nom)}…<br>mais il·elle doit le mériter !</div>
      <div class="card">Pose-lui cette question sur toi :<br><b>« ${esc(questionOf(holder, seeker.nom))} »</b></div>
      <div class="col" id="btns"><button class="btn" id="yes">✓ Bonne réponse</button><button class="btn ghost" id="no">✗ Mauvaise réponse</button></div>${backBtn}`);
    bind(s);
    s.querySelector('#yes').onclick = () => {
      sfx.win(); confetti(30);
      s.querySelector('.card').outerHTML = `<div class="big-sym">${sym}</div>`;
      s.querySelector('#btns').innerHTML = '<div class="small">Bravo ! Montre-lui son symbole.</div>';
    };
    s.querySelector('#no').onclick = () => {
      const btns = s.querySelector('#btns'); let n = 15; sfx.nope && sfx.nope(); tone(160, 0.3, 'sawtooth', 0.08);
      btns.innerHTML = `<div class="small">Raté ! Nouvel essai dans <b id="cd">${n}</b> s… ⏳</div>`;
      const iv = setInterval(() => {
        n--; const cd = s.querySelector('#cd'); if (cd) cd.textContent = n;
        if (n <= 0) { clearInterval(iv); leave(() => guardFor(holder, seeker, back)); }
      }, 1000);
      onCleanup(() => clearInterval(iv));
    };
  } else {
    const s = screen(`<div class="hint">Tu gardes le <b>symbole n°${k + 1}</b> de ${esc(seeker.nom)}…<br>en mode DUO 📱📱</div>
      <div class="card">Ton téléphone a un <b>tableau secret</b>, ${esc(seeker.nom)} a un <b>numéro secret</b>.<br>Posez vos deux téléphones côte à côte pour trouver le symbole !</div>
      <button class="btn" id="show">Afficher mon tableau secret 📋</button>${backBtn}`);
    bind(s);
    s.querySelector('#show').onclick = () => {
      ac(); sfx.pop();
      const { table } = duoData(seeker.nom, holder.nom, sym);
      duoOverlay(`<div class="duo-title">Tableau secret</div><div class="duo-grid">${table.map(([s2, n]) => `<div><span>${s2}</span><b>${n}</b></div>`).join('')}</div>`,
        'right', `Pour ${esc(seeker.nom)} : il·elle a le numéro,<br>toi tu as le tableau 📱📱`);
    };
  }
}

/* ---------------- Les couches à déballer ---------------- */
function sequence(p) {
  // chaque poupée contient un jeu de Noël
  const s = ['selfie', 'ruban', 'papier', 'msg', 'secouer', 'msg',
    'poupee', 'rennes', 'msg', 'poupee', 'traineau', 'msg', 'poupee', 'clochettes', 'msg',
    'cheminee', 'msg', 'personnage', 'cadenas', 'code'];
  let n = 0; const total = (p.messages || []).length;
  return s.filter(x => x !== 'msg' || n++ < total);
}

function runStep(p) {
  p = getPerson() || p;   // relit le joueur (ex. selfie tout juste pris)
  const seq = sequence(p);
  const i = Math.max(0, Math.min(LS.get('step:' + p.nom, 0), seq.length - 1));
  const kind = seq[i];
  const nth = seq.slice(0, i).filter(x => x === kind).length;
  let fired = false;
  const done = (delay = 0) => { if (fired) return; fired = true; LS.set('step:' + p.nom, i + 1); leave(() => runStep(p), delay); };
  const real = seq.filter(x => x !== 'msg' && x !== 'code');
  const pos = seq.slice(0, i).filter(x => x !== 'msg' && x !== 'code').length;
  const dots = `<div class="dots">${real.map((_, j) => `<i class="${j <= pos ? 'on' : ''} ${j === pos ? 'cur' : ''}"></i>`).join('')}</div>`;
  const ctx = { nth, dots, skip: null };
  setScene(kind === 'poupee' ? DOLL_SCENES[nth % DOLL_SCENES.length] : SCENES[kind]);
  STEPS[kind](p, done, ctx);
  const STUCK = { rennes: 70000, traineau: 90000, clochettes: 90000, cheminee: 70000 };
  if (TEST) window.__noel = { skip: () => ctx.skip ? ctx.skip() : done() };
  if (kind !== 'msg' && kind !== 'code' && kind !== 'cadenas') {
    const t = setTimeout(() => {
      if (fired || !app.firstElementChild) return;
      const b = document.createElement('button');
      b.className = 'stuck'; b.textContent = 'Je suis bloqué 😅';
      b.onclick = () => { ac(); b.remove(); if (ctx.skip) ctx.skip(); else done(); };
      app.firstElementChild.appendChild(b);
    }, STUCK[kind] || 45000);
    onCleanup(() => clearTimeout(t));
  }
}

const STEPS = {

  /* 0. Le selfie, transformé en cartoon */
  selfie(p, done, ctx) {
    let data = LS.get('selfie:' + p.nom, null), stream = null, busy = false;
    const s = screen(`${ctx.dots}
      <div class="hint" id="h">Avant de déballer…<br>un petit selfie ! 📸</div>
      <div class="stage"><div class="cam" id="cam">
        <video id="v" playsinline muted autoplay></video>
        <img id="res" hidden alt="">
        <div class="cam-msg" id="cm">Ouverture de la caméra…</div>
      </div></div>
      <input type="file" accept="image/*" capture="user" id="f" hidden>
      <div class="col" id="btns"></div>`);
    const v = s.querySelector('#v'), res = s.querySelector('#res'), cm = s.querySelector('#cm');
    const f = s.querySelector('#f'), btns = s.querySelector('#btns'), h = s.querySelector('#h'), cam = s.querySelector('#cam');
    const notme = `<button class="link" data-a="notme">Ce n'est pas moi (${esc(p.nom)}) ?</button>`;
    const stop = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };
    onCleanup(stop);
    ctx.skip = () => { stop(); done(); };

    btns.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      ac();
      if (a.dataset.a === 'shoot') shoot();
      if (a.dataset.a === 'pick') f.click();
      if (a.dataset.a === 'ok') { sfx.win(); stop(); done(); }
      if (a.dataset.a === 'again') openCam();
      if (a.dataset.a === 'notme') { stop(); LS.set('joueur', null); leave(start); }
    });

    async function openCam() {
      res.hidden = true; v.hidden = false; cm.hidden = false; cm.textContent = 'Ouverture de la caméra…';
      h.innerHTML = 'Avant de déballer…<br>un petit selfie ! 📸';
      btns.innerHTML = notme;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nocam');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
        v.srcObject = stream;
        await v.play().catch(() => {});
        cm.hidden = true;
        btns.innerHTML = `<button class="btn" data-a="shoot">📸 Prendre la photo</button>` + notme;
      } catch (e) {
        v.hidden = true;
        cm.textContent = 'Pas de caméra ici 🙈';
        btns.innerHTML = `<button class="btn" data-a="pick">📷 Ouvrir l'appareil photo</button>` + notme;
      }
    }

    function shoot() {
      if (busy || !v.videoWidth) return;
      busy = true; btns.innerHTML = '';
      let n = 3; cm.hidden = false; cm.classList.add('big'); cm.textContent = n; tone(660, 0.12, 'sine', 0.2);
      const iv = setInterval(() => {
        n--;
        if (n > 0) { cm.textContent = n; tone(660, 0.12, 'sine', 0.2); return; }
        clearInterval(iv); cm.classList.remove('big'); cm.hidden = true;
        flash(); noise(0.08, 0.4, 3000);
        const vw = v.videoWidth, vh = v.videoHeight, side = Math.min(vw, vh), c = document.createElement('canvas');
        c.width = c.height = 360;
        const g = c.getContext('2d');
        g.translate(360, 0); g.scale(-1, 1);   // effet miroir, comme dans l'aperçu
        g.drawImage(v, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, 360, 360);
        stop(); process(c);
      }, 800);
      onCleanup(() => clearInterval(iv));
    }

    f.onchange = () => {
      const file = f.files && f.files[0]; if (!file) return;
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = 360;
        const side = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 360, 360);
        URL.revokeObjectURL(url); process(c);
      };
      img.src = url; f.value = '';
    };

    function process(c) {
      v.hidden = true; cm.hidden = false; cm.textContent = 'Transformation en cartoon… ✨';
      setTimeout(() => {
        cartoonize(c);
        data = c.toDataURL('image/jpeg', 0.85);
        LS.set('selfie:' + p.nom, data);
        busy = false; showResult(true);
      }, 60);
    }

    function showResult(fresh) {
      v.hidden = true; cm.hidden = true; res.src = data; res.hidden = false;
      if (fresh) { sfx.pop(); burst(cam, 24); }
      h.innerHTML = fresh ? 'Trop beau ! 😄<br>Tu es prêt·e ?' : 'Re-bonjour ! 😄<br>Garde ce selfie ou refais-en un';
      btns.innerHTML = `<button class="btn" data-a="ok">C'est parfait ! ✨</button><button class="link" data-a="again">Recommencer</button>`;
    }

    if (data) showResult(false); else openCam();
  },


  /* 1. Défaire 3 nœuds, chacun dans une direction imposée */
  ruban(p, done, ctx) {
    const KNOTS = 3, limit = 150;
    const DIRS = [[-90, 'vers le haut'], [-135, 'en haut à gauche'], [-45, 'en haut à droite'], [180, 'vers la gauche'], [0, 'vers la droite']];
    const order = DIRS.slice().sort(() => Math.random() - 0.5).slice(0, KNOTS);
    const COLORS = [['#e2b35a', '#b8893a', '#d4a24c'], ['#2e8b57', '#1f6040', '#277a4b'], ['#fbf3e4', '#c9b79a', '#efe4cf']];
    const s = screen(`${ctx.dots}
      <div class="hint" id="h"></div>
      <div class="stage" id="st">${giftSVG(p.prenom, false)}<div class="arrow" id="ar"><span>➜</span></div></div>
      <div class="small" id="sub"></div>`);
    const st = s.querySelector('#st'), svg = st.querySelector('svg'), bow = svg.querySelector('.bow'), rib = svg.querySelector('.rib');
    const h = s.querySelector('#h'), sub = s.querySelector('#sub'), ar = s.querySelector('#ar');
    let knot = 0, tx = 0, ty = 0, busy = false, finished = false, lastStep = 0, warned = 0;
    const set = (x, y, r) => bow.setAttribute('transform', `translate(${x} ${y}) rotate(${r} 150 100)`);
    function setup() {
      const [ang, label] = order[knot], c = COLORS[knot % COLORS.length];
      bow.querySelectorAll('path').forEach((pa, i) => { pa.setAttribute('fill', i < 2 ? c[0] : c[2]); if (i < 2) pa.setAttribute('stroke', c[1]); });
      bow.querySelector('circle').setAttribute('fill', c[2]);
      rib.setAttribute('fill', c[0]);
      bow.style.opacity = 1; rib.style.opacity = 1; set(0, 0, 0); rib.removeAttribute('transform');
      ar.style.transform = `translate(-50%, -50%) rotate(${ang}deg)`;
      h.innerHTML = `Nœud ${knot + 1} / ${KNOTS} 🎀<br>Tire ${label} !`;
      sub.textContent = 'Suis la flèche : dans le mauvais sens, ça ne bouge pas';
      busy = false;
    }
    ctx.skip = () => { if (!finished) { knot = KNOTS - 1; untie(); } };
    drag(st, {
      move(dx, dy) {
        if (busy || finished) return;
        const k = svgScale(svg), d = Math.hypot(dx, dy);
        const a = order[knot][0] * Math.PI / 180;
        const along = (dx * Math.cos(a) + dy * Math.sin(a)) / (d || 1);   // 1 = bonne direction
        const f = along > 0.75 ? 0.55 : 0.12;
        tx = dx * k * f; ty = dy * k * f;
        set(tx, ty, dx * 0.06);
        rib.setAttribute('transform', `translate(${tx * 0.15} 0)`);
        if (along > 0.75) {
          const stp = Math.floor(d / 30);
          if (stp > lastStep) { lastStep = stp; tone(260 + stp * 70, 0.06, 'triangle', 0.12); buzz(10); }
          if (d > limit) untie();
        } else if (d > 60 && performance.now() - warned > 900) {
          warned = performance.now(); sub.textContent = 'Pas par là ! Regarde la flèche 👀'; tone(150, 0.12, 'square', 0.06); buzz(30);
        }
      },
      end() {
        if (busy || finished) return;
        lastStep = 0; const x0 = tx, y0 = ty;
        tween(300, t => { const e = easeOut(t); set(x0 * (1 - e), y0 * (1 - e), 0); });
        rib.removeAttribute('transform');
      },
    });
    function untie() {
      busy = true; sfx.pop(); sfx.rip(); buzz(80); burst(st, 20);
      const x0 = tx, y0 = ty, dir = Math.sign(tx) || 1;
      tween(600, t => {
        const e = easeOut(t);
        set(x0 + dir * 140 * e, y0 - 260 * e, dir * 220 * e);
        bow.style.opacity = 1 - t; rib.style.opacity = 1 - t;
      }, () => {
        knot++;
        if (knot >= KNOTS) { finished = true; ar.style.opacity = 0; done(100); }
        else { setup(); tween(250, t => { bow.style.opacity = t; }); }
      });
    }
    setup();
  },

  /* 2. Déchirer le papier */
  papier(p, done, ctx) {
    const s = screen(`${ctx.dots}
      <div class="hint">${p.photo ? "C'est toi, en papier cadeau ! 😄<br>Gratte pour ouvrir ✋" : 'Déchire le papier cadeau ! ✋'}</div>
      <div class="stage" id="st">${kraftSVG(p.prenom)}<canvas></canvas></div>
      <div class="small" id="pct">Frotte partout avec ton doigt : 0 %</div>`);
    const pct = s.querySelector('#pct');
    const st = s.querySelector('#st'), cv = st.querySelector('canvas');
    const rect = st.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.width = Math.round(rect.width * dpr), H = cv.height = Math.round(rect.height * dpr);
    const g = cv.getContext('2d', { willReadFrequently: true }), k = W / 300;
    const add = (x, y, w, h, r) => { if (g.roundRect) g.roundRect(x * k, y * k, w * k, h * k, r * k); else g.rect(x * k, y * k, w * k, h * k); };
    const rr = (x, y, w, h, r) => { g.beginPath(); add(x, y, w, h, r); };
    let ready = false, base = 1;

    // Motif du papier
    const P = Math.max(8, Math.round(36 * k)), pc = document.createElement('canvas');
    pc.width = pc.height = P;
    const pg = pc.getContext('2d');
    pg.fillStyle = '#b3263b'; pg.fillRect(0, 0, P, P);
    pg.fillStyle = '#e2b35a'; pg.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? .09 : .22) * P;
      pg.lineTo(P / 2 + Math.cos(a) * r, P / 2 + Math.sin(a) * r);
    }
    pg.fill();
    pg.fillStyle = 'rgba(251,243,228,.8)'; pg.beginPath(); pg.arc(P * .12, P * .85, P * .05, 0, 7); pg.fill();
    const sample = () => { const d = g.getImageData(0, 0, W, H).data; let c = 0; for (let i = 3; i < d.length; i += 36) if (d[i] > 10) c++; return c; };
    function paint(img) {
      if (img) {
        // le selfie cartoon, « emballé » dans la forme du cadeau
        g.save(); g.beginPath(); add(45, 125, 210, 155, 8); add(35, 100, 230, 38, 7); g.clip();
        g.drawImage(img, 35 * k, 75 * k, 230 * k, 230 * k);
        g.restore();
        g.lineWidth = 5 * k; g.strokeStyle = '#e2b35a';
        rr(45, 125, 210, 155, 8); g.stroke(); rr(35, 100, 230, 38, 7); g.stroke();
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(45 * k, 138 * k, 210 * k, 8 * k);
      } else {
        g.fillStyle = g.createPattern(pc, 'repeat');
        rr(45, 125, 210, 155, 8); g.fill();
        rr(35, 100, 230, 38, 7); g.fill();
        g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(45 * k, 138 * k, 210 * k, 12 * k);
      }
      base = sample() || 1;
      g.globalCompositeOperation = 'destination-out';
      g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#000'; g.fillStyle = '#000';
      ready = true;
    }
    if (p.photo) { const img = new Image(); img.onload = () => paint(img); img.onerror = () => paint(null); img.src = p.photo; }
    else paint(null);
    ctx.skip = () => { if (!finished) finish(); };
    const threshold = 0.78;
    let last = null, moves = 0, ripT = 0, finished = false;
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr]; };

    function scratch(a, b, e) {
      g.lineWidth = rand(28, 40) * k;
      g.beginPath(); g.moveTo(a[0], a[1]);
      g.quadraticCurveTo((a[0] + b[0]) / 2 + rand(-7, 7) * k, (a[1] + b[1]) / 2 + rand(-7, 7) * k, b[0], b[1]);
      g.stroke();
      for (let i = 0; i < 2; i++) { g.beginPath(); g.arc(b[0] + rand(-20, 20) * k, b[1] + rand(-20, 20) * k, rand(3, 9) * k, 0, 7); g.fill(); }
      const now = performance.now();
      if (now - ripT > 110 && Math.hypot(b[0] - a[0], b[1] - a[1]) > 2) { ripT = now; sfx.rip(); buzz(8); scraps(e.clientX, e.clientY); }
      if (++moves % 8 === 0) {
        const r = 1 - sample() / base;
        pct.textContent = `Frotte partout avec ton doigt : ${Math.min(100, Math.round(r / threshold * 100))} %`;
        if (r > threshold) finish();
      }
    }
    cv.addEventListener('pointerdown', e => { if (finished || !ready) return; ac(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} last = pos(e); scratch(last, last, e); });
    cv.addEventListener('pointermove', e => { if (!last || finished) return; const pt = pos(e); scratch(last, pt, e); last = pt; });
    const up = () => { last = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    function finish() {
      finished = true; sfx.rip(); setTimeout(sfx.rip, 90); buzz(60); burst(st, 16);
      cv.style.transition = 'opacity .5s'; cv.style.opacity = 0;
      done(500);
    }
  },

  /* 3. Secouer la boîte */
  secouer(p, done, ctx) {
    const N = 16;
    const s = screen(`${ctx.dots}
      <div class="hint">Une boîte du Bois Rouelle !<br>Secoue ton téléphone pour l'ouvrir 📳</div>
      <div class="stage" id="st">${kraftSVG(p.prenom)}</div>
      <div class="bar"><i></i></div>
      <div class="col">
        <button class="btn ghost" id="perm" hidden>📳 Activer la secousse</button>
        <div class="small" id="sub">…ou tapote la boîte. Ne t'arrête pas, sinon elle se referme !</div>
      </div>`);
    const st = s.querySelector('#st'), svg = st.querySelector('svg'), bar = s.querySelector('.bar i');
    const perm = s.querySelector('#perm'), sub = s.querySelector('#sub'), lid = svg.querySelector('.klid');
    let count = 0, finished = false, lastHit = 0, prev = null;
    ctx.skip = () => { if (!finished) { count = N - 1; hit(); } };
    let lastAny = performance.now();
    const decay = setInterval(() => {
      if (finished || count <= 0) return;
      if (performance.now() - lastAny > 1100) { count = Math.max(0, count - 1); bar.style.width = (count / N * 100) + '%'; tone(120, 0.06, 'triangle', 0.06); }
    }, 450);
    onCleanup(() => clearInterval(decay));

    function onMotion(e) {
      const a = e.accelerationIncludingGravity || e.acceleration; if (!a) return;
      const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
      if (prev !== null && Math.abs(mag - prev) > 12 && Date.now() - lastHit > 230) { lastHit = Date.now(); hit(); }
      prev = mag;
    }
    const listen = () => { addEventListener('devicemotion', onMotion); onCleanup(() => removeEventListener('devicemotion', onMotion)); };
    if (isIOS && typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      perm.hidden = false;
      perm.onclick = () => {
        ac();
        DeviceMotionEvent.requestPermission().then(r => {
          if (r === 'granted') { listen(); perm.hidden = true; sub.textContent = 'Vas-y, secoue ! (ou tapote)'; }
        }).catch(() => {});
      };
    } else listen();
    st.addEventListener('pointerdown', () => { ac(); hit(); });

    function hit() {
      if (finished) return;
      count++; lastAny = performance.now(); bar.style.width = (count / N * 100) + '%';
      sfx.rattle(); buzz(40); wiggle(svg); fallFlake(st);
      if (count >= N) finish();
    }
    function finish() {
      finished = true; sfx.pop(); sfx.win(); buzz([50, 40, 80]); burst(st, 26);
      tween(800, t => {
        const e = easeOut(t);
        lid.setAttribute('transform', `translate(${-40 * e} ${-260 * e}) rotate(${-35 * e} 150 119)`);
        lid.style.opacity = 1 - t;
      });
      done(900);
    }
  },

  /* 4. Poupées russes : d'abord dévisser (gauche-droite), puis tirer vers le haut */
  poupee(p, done, ctx) {
    const pal = DOLLS[ctx.nth % DOLLS.length], TURNS = 4;
    const title = ['Une poupée russe ! 🪆 Qu\'y a-t-il dedans ?', 'Encore une poupée ! 🪆', 'La 3ᵉ poupée ! 🪆'][ctx.nth % 3];
    const s = screen(`${ctx.dots}
      <div class="hint" id="h">${title}<br>Dévisse-la : glisse ↔️ gauche, droite…</div>
      <div class="stage" id="st">${dollSVG({ ...pal, id: 'd' + ctx.nth })}</div>
      <div class="small" id="sub">Tours : 0 / ${TURNS}</div>`);
    const st = s.querySelector('#st'), svg = st.querySelector('svg'), top = svg.querySelector('.top'), bot = svg.querySelector('.bot');
    const h = s.querySelector('#h'), sub = s.querySelector('#sub');
    let tx = 0, ty = 0, rot = 0, finished = false, lastStep = 0, turns = 0, lastSign = 0, phase = 'twist', warned = 0;
    ctx.skip = () => { if (!finished) finish(); };
    const set = (x, y, r) => top.setAttribute('transform', `translate(${x} ${y}) rotate(${r} 100 168)`);
    drag(st, {
      move(dx, dy, e) {
        if (finished) return;
        const k = svgScale(svg);
        if (phase === 'twist') {
          rot = Math.max(-22, Math.min(22, dx * k * 0.25)); tx = 0;
          ty = Math.max(-6, Math.min(0, dy * k * 0.05));
          set(0, ty, rot);
          const sign = Math.abs(dx) > 40 ? Math.sign(dx) : 0;
          if (sign && sign !== lastSign) {
            lastSign = sign; turns++;
            tone(320 + turns * 60, 0.05, 'square', 0.07); buzz(20); fallFlake(st);
            sub.textContent = `Tours : ${Math.min(turns, TURNS)} / ${TURNS}`;
            if (turns >= TURNS) {
              phase = 'pull'; sfx.pop();
              h.innerHTML = `${title}<br>C'est dévissé ! Tire le haut vers le haut ⬆️`;
              sub.textContent = 'Tire bien haut !';
            }
          }
          if (dy < -60 && performance.now() - warned > 1200) { warned = performance.now(); sub.textContent = `C'est vissé ! Dévisse d'abord ↔️ (${Math.min(turns, TURNS)} / ${TURNS})`; tone(150, 0.1, 'square', 0.05); }
        } else {
          ty = Math.min(0, dy * k * 0.7); tx = dx * k * 0.15; rot = Math.max(-15, Math.min(15, dx * k * 0.1));
          set(tx, ty, rot);
          const stp = Math.floor(-ty / 15);
          if (stp > lastStep) { lastStep = stp; tone(170 + stp * 25, 0.05, 'square', 0.05); buzz(6); }
          if (ty < -90) finish();
        }
      },
      end() {
        if (finished) return;
        lastStep = 0; lastSign = 0; const x0 = tx, y0 = ty, r0 = rot;
        tween(260, t => { const e = easeOut(t); set(x0 * (1 - e), y0 * (1 - e), r0 * (1 - e)); });
      },
    });
    function finish() {
      finished = true; sfx.pop(); buzz(70); burst(st, 22);
      const x0 = tx, y0 = ty, r0 = rot;
      tween(650, t => {
        const e = easeOut(t);
        set(x0, y0 - 320 * e, r0 - 30 * e);
        top.style.opacity = 1 - t; bot.style.opacity = 1 - t * 0.9;
      });
      done(450);
    }
  },

  /* JEU 1 : les rennes égarés (observation) */
  rennes(p, done, ctx) {
    const N = 6;
    const s = screen(`${ctx.dots}
      <div class="hint">Dans la poupée… les rennes du Père Noël !<br>Ils se sont échappés dans les prés 🦌</div>
      <div class="game see" id="g"></div>
      <div class="small" id="cnt">Attrape-les quand ils se montrent : 0 / ${N}<br>Attention aux intrus 🐑🐓</div>`);
    const g = s.querySelector('#g'), cnt = s.querySelector('#cnt');
    let found = 0, finished = false, alive = 0;
    const timers = [];
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
    onCleanup(() => timers.forEach(clearTimeout));
    ctx.skip = () => { if (!finished) { found = N - 1; win(); } };
    const upd = () => { cnt.innerHTML = `Attrape-les quand ils se montrent : ${found} / ${N}<br>Attention aux intrus 🐑🐓`; };
    function spawn() {
      if (finished) return;
      if (alive < 2) {
        const intrus = Math.random() < 0.3;
        const e = document.createElement('button');
        e.className = 'critter';
        e.textContent = intrus ? (Math.random() < 0.5 ? '🐑' : '🐓') : '🦌';
        const size = rand(34, 50);
        e.style.cssText = `left:${rand(6, 86)}%;top:${rand(8, 82)}%;font-size:${size}px;--r:${rand(-15, 15)}deg`;
        g.appendChild(e); alive++;
        const life = intrus ? 1800 : Math.max(900, 2100 - found * 170);
        const gone = () => { if (e.parentNode) { e.classList.add('out'); later(() => e.remove(), 250); alive--; } };
        const t = later(gone, life);
        e.addEventListener('pointerdown', ev => {
          ev.stopPropagation(); ac(); clearTimeout(t);
          if (!e.parentNode || e.classList.contains('out')) return;
          if (intrus) {
            found = Math.max(0, found - 1); sfx.nope && sfx.nope(); tone(160, 0.2, 'sawtooth', 0.08); buzz([40, 30, 40]);
            e.textContent = '😝'; cnt.innerHTML = `Ce n'est pas un renne ! 😄 (${found} / ${N})`; later(gone, 300);
          } else {
            found++; tone(880, 0.1, 'sine', 0.2); tone(1320, 0.15, 'sine', 0.12, 0.08); buzz(30); burst(e, 10);
            e.textContent = '✨'; later(gone, 200); upd();
            if (found >= N) win();
          }
        });
      }
      later(spawn, rand(450, 900));
    }
    g.addEventListener('pointerdown', () => { ac(); tone(200, 0.05, 'triangle', 0.05); });
    function win() {
      finished = true; sfx.win(); confetti(40); upd();
      s.querySelector('.hint').innerHTML = 'Tous les rennes sont rentrés ! 🎉';
      done(1000);
    }
    later(spawn, 500);
  },

  /* JEU 2 : le traîneau du Père Noël (adresse) */
  traineau(p, done, ctx) {
    const GOAL = 10;
    const s = screen(`${ctx.dots}
      <div class="hint">Dans la poupée… le traîneau du Père Noël ! 🛷<br>Attrape ${GOAL} cadeaux, évite les cheminées</div>
      <div class="game" id="g"><canvas></canvas><div class="game-msg" id="gm">Touche l'écran pour monter 👆</div></div>
      <div class="small" id="cnt">Cadeaux : 0 / ${GOAL}</div>`);
    const g = s.querySelector('#g'), cv = g.querySelector('canvas'), gm = s.querySelector('#gm'), cnt = s.querySelector('#cnt');
    const r = g.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = r.width, H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const U = H / 500;   // unité : tout est proportionnel à la hauteur
    let y = H * 0.45, vy = 0, started = false, finished = false, got = 0, inv = 0, speed = 150 * U, t0 = 0, last = 0;
    let chims = [], gifts = [], nextChim = 0.8, nextGift = 0.4, raf = 0, shake = 0;
    const X = W * 0.26;
    ctx.skip = () => { if (!finished) { got = GOAL; win(); } };
    const flap = e => { e && e.preventDefault(); ac(); if (finished) return; if (!started) { started = true; gm.hidden = true; } vy = -330 * U; tone(520, 0.05, 'triangle', 0.06); };
    g.addEventListener('pointerdown', flap);
    function chimney(x, h, w) {
      const top = H - h;
      c.fillStyle = '#8e3b2e'; c.fillRect(x, top, w, h);
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1;
      for (let yy = top + 10; yy < H; yy += 12) {
        c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke();
        const off = ((yy - top) / 12) % 2 ? w / 2 : w / 4;
        c.beginPath(); c.moveTo(x + off, yy - 12); c.lineTo(x + off, yy); c.stroke();
      }
      c.fillStyle = '#6d2a20'; c.fillRect(x - 5 * U, top - 8 * U, w + 10 * U, 12 * U);
      c.fillStyle = '#f4f7ff'; c.beginPath(); c.ellipse(x + w / 2, top - 9 * U, w / 2 + 8 * U, 7 * U, 0, 0, 7); c.fill();
    }
    function frame(now) {
      if (finished) return;
      const dt = Math.min(0.033, last ? (now - last) / 1000 : 0); last = now;
      c.clearRect(0, 0, W, H);
      if (started) {
        t0 += dt;
        speed = Math.min(260 * U, (150 + t0 * 4) * U);
        vy += 900 * U * dt; y += vy * dt;
        nextChim -= dt; nextGift -= dt;
        if (nextChim <= 0) { chims.push({ x: W + 10, w: rand(46, 60) * U, h: rand(0.22, 0.5) * H }); nextChim = rand(1.4, 2.1); }
        if (nextGift <= 0) { gifts.push({ x: W + 20, y: rand(0.12, 0.6) * H, a: rand(0, 6) }); nextGift = rand(0.9, 1.5); }
        chims.forEach(o => { o.x -= speed * dt; }); gifts.forEach(o => { o.x -= speed * dt; o.a += dt * 3; });
        chims = chims.filter(o => o.x > -80); gifts = gifts.filter(o => o.x > -40 && !o.took);
        inv = Math.max(0, inv - dt);
        // collisions
        const hit = y > H - 22 * U || chims.some(o => X + 26 * U > o.x && X - 26 * U < o.x + o.w && y + 16 * U > H - o.h - 6 * U);
        if (hit && inv <= 0) {
          inv = 1.4; got = Math.max(0, got - 2); vy = -300 * U; shake = 0.3;
          noise(0.2, 0.4, 300); tone(140, 0.2, 'square', 0.08); buzz([60, 30, 60]);
          cnt.textContent = `Aïe ! -2 cadeaux… ${got} / ${GOAL}`;
        }
        if (y > H - 22 * U) { y = H - 22 * U; }
        if (y < 24 * U) { y = 24 * U; vy = Math.max(vy, 0); }   // le haut ne fait pas mal
        gifts.forEach(o => {
          if (Math.hypot(o.x - X - 10 * U, o.y - y) < 40 * U) {
            o.took = true; got++; tone(880, 0.08, 'sine', 0.2); tone(1175, 0.12, 'sine', 0.15, 0.07); buzz(20);
            cnt.textContent = `Cadeaux : ${got} / ${GOAL}`;
            if (got >= GOAL) win();
          }
        });
      } else {
        y = H * 0.45 + Math.sin(now / 300) * 8 * U;
      }
      shake = Math.max(0, shake - dt);
      c.save();
      if (shake) c.translate(rand(-4, 4), rand(-4, 4));
      chims.forEach(o => chimney(o.x, o.h, o.w));
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `${36 * U}px serif`;
      gifts.forEach(o => { c.save(); c.translate(o.x, o.y + Math.sin(o.a) * 5 * U); c.fillText('🎁', 0, 0); c.restore(); });
      // le traîneau + 2 rennes
      if (!(inv > 0 && Math.floor(inv * 10) % 2)) {
        c.save(); c.translate(X, y); c.rotate(Math.max(-0.4, Math.min(0.5, vy / (900 * U))));
        c.font = `${32 * U}px serif`;
        c.fillText('🦌', 84 * U, -6 * U + Math.sin(now / 120) * 3 * U);
        c.fillText('🦌', 54 * U, 2 * U + Math.sin(now / 120 + 1) * 3 * U);
        c.strokeStyle = 'rgba(226,179,90,.95)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(18 * U, 0); c.lineTo(46 * U, 0); c.stroke();
        c.font = `${48 * U}px serif`; c.fillText('🛷', 0, 8 * U);
        c.font = `${34 * U}px serif`; c.fillText('🎅', -6 * U, -18 * U);
        c.restore();
      }
      c.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    onCleanup(() => { finished = true; cancelAnimationFrame(raf); });
    function win() {
      finished = true; cancelAnimationFrame(raf);
      cnt.textContent = `Cadeaux : ${GOAL} / ${GOAL} 🎉`;
      s.querySelector('.hint').innerHTML = 'Tournée réussie ! Ho ho ho ! 🎅';
      sfx.jingle(); confetti(50); done(1400);
    }
  },

  /* JEU 3 : les clochettes du traîneau (mémoire) */
  clochettes(p, done, ctx) {
    const GOAL = 6, START = 3;
    const BELLS = [['#c0392b', 523], ['#2e8b57', 659], ['#e2b35a', 784], ['#2c6fbf', 1047]];
    const s = screen(`${ctx.dots}
      <div class="hint" id="h">Dans la poupée… les clochettes du traîneau ! 🔔<br>Écoute la mélodie, puis rejoue-la</div>
      <div class="bells" id="b">${BELLS.map(([col], i) => `<button class="bell" data-i="${i}" style="--c:${col}">🔔</button>`).join('')}</div>
      <div class="small" id="cnt">Mélodie : ${START} / ${GOAL} notes</div>`);
    const h = s.querySelector('#h'), cnt = s.querySelector('#cnt'), bells = [...s.querySelectorAll('.bell')];
    const seq = Array.from({ length: GOAL }, () => Math.floor(Math.random() * 4));
    let len = START, pos = 0, playing = true, finished = false;
    const timers = []; const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    onCleanup(() => timers.forEach(clearTimeout));
    ctx.skip = () => { if (!finished) { finished = true; sfx.win(); done(300); } };
    const ring = i => {
      const b = bells[i]; b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 320);
      tone(BELLS[i][1], 0.45, 'sine', 0.22); tone(BELLS[i][1] * 2.01, 0.3, 'sine', 0.06); buzz(15);
    };
    function play() {
      playing = true; pos = 0; h.innerHTML = 'Écoute bien… 👂';
      const gap = Math.max(380, 620 - len * 35);
      for (let k = 0; k < len; k++) later(() => ring(seq[k]), 600 + k * gap);
      later(() => { playing = false; h.innerHTML = 'À toi ! Rejoue la mélodie 🎶'; }, 600 + len * gap);
    }
    bells.forEach(b => b.addEventListener('pointerdown', () => {
      ac(); if (playing || finished) return;
      const i = +b.dataset.i; ring(i);
      if (i !== seq[pos]) {
        playing = true; h.innerHTML = 'Oups ! Fausse note 🙉 On réécoute…';
        tone(180, 0.3, 'sawtooth', 0.08); buzz([60, 40, 60]);
        later(play, 1100); return;
      }
      pos++;
      if (pos >= len) {
        playing = true;
        if (len >= GOAL) {
          finished = true; h.innerHTML = 'Bravo, quelle oreille ! 🎉'; later(sfx.jingle, 300); confetti(40); done(1800);
        } else {
          len++; cnt.textContent = `Mélodie : ${len} / ${GOAL} notes`;
          h.innerHTML = 'Bien joué ! Une note de plus… 🎵'; later(play, 1000);
        }
      }
    }));
    later(play, 400);
  },

  /* JEU 4 : le Père Noël coincé dans la cheminée (rythme) */
  cheminee(p, done, ctx) {
    const GOAL = 8;
    const s = screen(`${ctx.dots}
      <div class="hint" id="h">Oh non ! Le Père Noël est coincé<br>dans la cheminée du Bois Rouelle ! 🎅</div>
      <div class="stage" id="st">${chimneySVG()}</div>
      <div class="gauge" id="ga"><i class="zone"></i><b class="cur"></b></div>
      <div class="col"><button class="btn" id="pull">TIRE ! 💪</button>
      <div class="small" id="cnt">Tire quand le curseur est dans le vert : 0 / ${GOAL}</div></div>`);
    const st = s.querySelector('#st'), legs = st.querySelector('.legs'), zone = s.querySelector('.zone'), cur = s.querySelector('.cur');
    const cnt = s.querySelector('#cnt'), h = s.querySelector('#h');
    let prog = 0, x = 0, dir = 1, finished = false, raf = 0, last = 0, zl = 0, zw = 0;
    function newZone() { zw = Math.max(12, 30 - prog * 2.2); zl = rand(5, 95 - zw); zone.style.left = zl + '%'; zone.style.width = zw + '%'; }
    newZone();
    const setLegs = () => legs.setAttribute('transform', `translate(0 ${-prog * 9})`);
    ctx.skip = () => { if (!finished) { prog = GOAL - 1; good(); } };
    const loop = now => {
      if (finished) return;
      const dt = Math.min(0.033, last ? (now - last) / 1000 : 0); last = now;
      x += dir * (45 + prog * 9) * dt;
      if (x > 100) { x = 100; dir = -1; } if (x < 0) { x = 0; dir = 1; }
      cur.style.left = x + '%';
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    onCleanup(() => { finished = true; cancelAnimationFrame(raf); });
    function good() {
      prog++; setLegs(); tone(300 + prog * 60, 0.12, 'triangle', 0.2); buzz(40); burst(st, 8);
      const lines = ['Ho !', 'Ho ho !', 'Encore !', 'Ça bouge !', 'Hiii !', 'Allez !', 'Presque !'];
      h.innerHTML = `${lines[(prog - 1) % lines.length]} 🎅<br>Continue de tirer !`;
      cnt.textContent = `Tire quand le curseur est dans le vert : ${prog} / ${GOAL}`;
      if (prog >= GOAL) return win();
      newZone();
    }
    function pull() {
      ac(); if (finished) return;
      if (x >= zl && x <= zl + zw) good();
      else {
        prog = Math.max(0, prog - 1); setLegs();
        noise(0.25, 0.25, 250); tone(110, 0.25, 'square', 0.08); buzz([50, 30, 50]);
        h.innerHTML = 'Raté ! Il glisse… 😱<br>Attends le vert !';
        cnt.textContent = `Tire quand le curseur est dans le vert : ${prog} / ${GOAL}`;
      }
    }
    s.querySelector('#pull').addEventListener('pointerdown', pull);
    st.addEventListener('pointerdown', pull);
    function win() {
      finished = true; cancelAnimationFrame(raf);
      st.innerHTML = `<div class="santa-out">🎅</div>`;
      h.innerHTML = 'Ho ho ho ! Merci ! 🎉<br>Il était temps…';
      sfx.pop(); setTimeout(sfx.jingle, 200); confetti(60); buzz([80, 40, 120]);
      s.querySelector('.gauge').style.opacity = 0;
      done(2000);
    }
  },

  /* ESCAPE GAME : le coffre du Bois Rouelle */
  cadenas(p, done, ctx) {
    const combo = comboOf(p.nom), G = guardiansOf(p.nom);
    let dials = LS.get('dials:' + p.nom, [0, 0, 0, 0]);
    const clue = k => {
      const h = G[k]; if (!h) return '';
      const extra = SLOT_TYPES[k] === 'question' ? '<br><i>Il·elle te posera une question sur lui·elle ❓</i>'
        : SLOT_TYPES[k] === 'duo' ? `<br><i>Mode duo 📱📱 : tu as un numéro secret, ton gardien a le tableau. Il faut vos deux téléphones !</i><br><button class="btn ghost mini" data-duo="${k}">Afficher mon numéro secret 🔢</button>` : '';
      return `<div class="clue"><b>Symbole n°${k + 1}</b> : gardé par quelqu'un de la famille.<br><span class="cl" data-k="${k}"></span>${extra}</div>`;
    };
    if (!LS.get('cadT:' + p.nom, 0)) LS.set('cadT:' + p.nom, Date.now());
    const elapsed = () => (Date.now() - LS.get('cadT:' + p.nom, Date.now())) / 1000;
    const refresh = () => s.querySelectorAll('.cl').forEach(el => {
      const k = +el.dataset.k, html = clueHTML(G[k], k, elapsed());
      if (el.innerHTML !== html) el.innerHTML = html;
    });
    const s = screen(`${ctx.dots}
      <div class="hint" id="h">Ton cadeau est enfermé dans<br>le coffre du Bois Rouelle ! 🔒</div>
      <div class="lock" id="lock">${[0, 1, 2, 3].map(i => `<button class="dial" data-d="${i}"><span>${SYMS[dials[i]]}</span><small>n°${i + 1}</small></button>`).join('')}</div>
      <button class="btn" id="open">Ouvrir le coffre 🔓</button>
      <div class="small" id="res">Touche un symbole pour le changer</div>
      <div class="clues">
        <div class="clue"><b>Symbole n°1</b> : c'est le tien ! ➜ <span class="own">${combo[0]}</span></div>
        ${clue(1)}${clue(2)}${clue(3)}
      </div>
      <button class="btn ghost" id="guard">🗝️ Quelqu'un me demande un symbole</button>
      <button class="link" id="sw">👥 Changer de joueur</button>`);
    s.classList.add('scroll');
    refresh();
    const clueIv = setInterval(refresh, 1000);
    onCleanup(() => clearInterval(clueIv));
    const res = s.querySelector('#res'), lock = s.querySelector('#lock');
    s.querySelectorAll('.dial').forEach(b => b.addEventListener('click', () => {
      ac(); const i = +b.dataset.d;
      dials[i] = (dials[i] + 1) % SYMS.length; LS.set('dials:' + p.nom, dials);
      b.querySelector('span').textContent = SYMS[dials[i]]; tone(700, 0.04, 'square', 0.05); buzz(8);
    }));
    s.querySelectorAll('[data-duo]').forEach(b => b.onclick = () => {
      ac(); sfx.pop(); const k = +b.dataset.duo;
      const { num } = duoData(p.nom, G[k].nom, combo[k]);
      duoOverlay(`<div class="duo-title">Numéro secret<br>du symbole n°${k + 1}</div><div class="duo-num">${num}</div>`,
        'left', `Trouve ton gardien : lui seul a le tableau<br>qui dit à quel symbole correspond ce numéro 📱📱`);
    });
    s.querySelector('#guard').onclick = () => { ac(); leave(() => guardianScreen(p, () => runStep(p))); };
    s.querySelector('#sw').onclick = () => { LS.set('joueur', null); leave(start); };
    let tries = 0;
    s.querySelector('#open').onclick = () => {
      ac();
      const good = dials.filter((d, i) => SYMS[d] === combo[i]).length;
      if (good === 4) {
        sfx.win(); setTimeout(sfx.jingle, 250); confetti(80); buzz([60, 40, 60, 40, 150]);
        lock.classList.add('opened'); s.querySelector('#h').innerHTML = 'Clic ! Le coffre s\'ouvre ! 🎉';
        done(1600); return;
      }
      tries++;
      lock.classList.remove('shake-x'); void lock.offsetWidth; lock.classList.add('shake-x');
      tone(150, 0.25, 'sawtooth', 0.08); noise(0.1, 0.3, 600); buzz([60, 40, 60]);
      res.innerHTML = `Ce n'est pas ça… <b>${good} symbole${good > 1 ? 's' : ''} sur 4</b> bien placé${good > 1 ? 's' : ''} 🔐`;
    };
  },

  /* 5. Souffler la bougie */
  bougie(p, done, ctx) {
    const s = screen(`${ctx.dots}
      <div class="hint">Dans la poupée, une bougie…<br>Souffle dessus ! 🌬️</div>
      <div class="stage" id="st">
        <div class="glow"></div>
        <div class="candle"><div class="flame-h"><div class="flame"></div></div><div class="wick"></div><div class="body"></div></div>
        <div class="smoke"></div>
      </div>
      <div class="col">
        <button class="btn" id="mic">🎤 Souffler dans le micro</button>
        <div class="small" id="sub">Pas de micro ? Garde le doigt appuyé sur la flamme</div>
      </div>`);
    const st = s.querySelector('#st'), fh = s.querySelector('.flame-h'), glow = s.querySelector('.glow');
    const micBtn = s.querySelector('#mic'), sub = s.querySelector('#sub');
    let strength = 0, level = 0, holding = false, finished = false, analyser = null, buf = null, raf = 0, lives = 2, paused = false;
    ctx.skip = () => { if (!finished) { cancelAnimationFrame(raf); finish(); } };

    micBtn.onclick = async () => {
      ac();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        onCleanup(() => stream.getTracks().forEach(t => t.stop()));
        const a = ac(), src = a.createMediaStreamSource(stream);
        analyser = a.createAnalyser(); analyser.fftSize = 1024;
        buf = new Float32Array(analyser.fftSize);
        src.connect(analyser);
        micBtn.hidden = true; sub.textContent = 'Souffle fort, près du micro !';
      } catch (e) {
        micBtn.hidden = true; sub.textContent = 'Micro pas disponible : garde le doigt appuyé sur la flamme 👆';
      }
    };
    st.addEventListener('pointerdown', () => { ac(); holding = true; });
    const release = () => { holding = false; };
    st.addEventListener('pointerup', release); st.addEventListener('pointercancel', release); st.addEventListener('pointerleave', release);

    let lastWhoosh = 0;
    const loop = () => {
      if (finished) return;
      if (analyser) {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        level = Math.sqrt(sum / buf.length);
      }
      let push = 0;
      if (paused) { raf = requestAnimationFrame(loop); return; }
      if (level > 0.07) push += Math.min(1, (level - 0.07) * 6) * 0.03;
      if (holding) push += p.simple ? 0.016 : 0.011;
      strength = Math.max(0, strength + push - 0.003);
      const wobble = push > 0 ? rand(-25, 25) * Math.min(1, push * 40) : 0;
      fh.style.setProperty('--s', Math.max(0.15, 1 - strength * 0.85));
      fh.style.setProperty('--k', wobble + 'deg');
      glow.style.opacity = Math.max(0.1, 1 - strength);
      if (push > 0 && performance.now() - lastWhoosh > 250) { lastWhoosh = performance.now(); noise(0.25, 0.08, 400); buzz(10); }
      if (strength >= 1 && !paused) {
        if (lives > 0) { relight(); }
        else return finish();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    onCleanup(() => { finished = true; cancelAnimationFrame(raf); });

    function relight() {
      paused = true; lives--;
      fh.style.transition = 'opacity .2s'; fh.style.opacity = 0; glow.style.opacity = 0;
      const sm = s.querySelector('.smoke'); sm.classList.remove('on'); void sm.offsetWidth; sm.classList.add('on');
      sfx.whoosh(); sub.textContent = 'Bravo ! 👏';
      setTimeout(() => {
        strength = 0; fh.style.setProperty('--s', 1); fh.style.opacity = 1; glow.style.opacity = 1;
        tone(500, 0.1, 'sine', 0.2); tone(750, 0.15, 'sine', 0.2, 0.08); buzz([30, 30, 30]);
        s.querySelector('.hint').innerHTML = lives === 1 ? 'Hein ?! Elle se rallume ! 😱<br>Souffle encore !' : 'Encore ?! Une bougie magique ! 🪄<br>Dernier effort !';
        sub.textContent = analyser ? 'Souffle fort, près du micro !' : 'Garde le doigt appuyé sur la flamme 👆';
        paused = false;
      }, 1100);
    }
    function finish() {
      finished = true;
      fh.style.transition = 'opacity .2s'; fh.style.opacity = 0; glow.style.opacity = 0;
      const sm2 = s.querySelector('.smoke'); sm2.classList.remove('on'); void sm2.offsetWidth; sm2.classList.add('on');
      sfx.whoosh(); setTimeout(sfx.win, 300); buzz([40, 30, 80]);
      sub.textContent = 'Bravo ! 👏';
      done(1300);
    }
  },

  /* 6. La dernière poupée s'ouvre : le personnage apparaît ! */
  personnage(p, done, ctx) {
    const N = 7;
    const s = screen(`${ctx.dots}
      <div class="hint" id="h">La dernière poupée s'échappe !<br>Attrape-la ${N} fois ! 👆</div>
      <div class="stage" id="st"><div class="doll-wrap">${dollSVG({ ...FINAL, id: 'last' })}</div></div>
      <div class="col" id="btns"><div class="small" id="cnt">Attrapée : 0 / ${N}</div></div>`);
    const st = s.querySelector('#st'), h = s.querySelector('#h'), btns = s.querySelector('#btns');
    let taps = 0, out = false, hopT = 0;
    const doll = st.querySelector('.doll-wrap');
    doll.classList.add('runner');
    function hop() {
      if (out) return;
      const x = rand(-32, 32), y = rand(-30, 30), r = rand(-20, 20);
      doll.style.transform = `translate(${x}%, ${y}%) rotate(${r}deg) scale(${0.62 + taps * 0.03})`;
      clearTimeout(hopT);
      hopT = setTimeout(hop, Math.max(550, 1500 - taps * 140));
    }
    onCleanup(() => clearTimeout(hopT));
    setTimeout(hop, 600);
    ctx.skip = () => { if (!out) reveal(); else done(); };
    st.addEventListener('pointerdown', () => {
      ac();
      if (out) {
        const w = st.querySelector('.hero-wrap');
        w.classList.remove('jump'); void w.offsetWidth; w.classList.add('jump');
        sfx.giggle(); buzz(30); return;
      }
    });
    doll.addEventListener('pointerdown', e => {
      if (out) return;
      e.stopPropagation(); ac();
      taps++;
      s.querySelector('#cnt').textContent = `Attrapée : ${taps} / ${N}`;
      sfx.rattle(); tone(500 + taps * 60, 0.08, 'triangle', 0.15); buzz(40); burst(doll, 8);
      if (taps >= N) { clearTimeout(hopT); doll.style.transform = 'none'; reveal(); }
      else hop();
    });
    function reveal() {
      out = true;
      burst(st, 40); sfx.pop(); setTimeout(sfx.win, 150); buzz([80, 40, 120]);
      const lines = [`Salut ${p.nom} ! 👋<br>C'est moi… enfin, c'est toi !`, `Coucou ${p.nom} !<br>T'as vu comme je suis beau ? 😎`];
      st.innerHTML = `<div class="hero-wrap hero-in">${heroSVG(p, 'h')}</div>
        <div class="bubble">${lines[Math.floor(Math.random() * lines.length)]}</div>`;
      h.innerHTML = 'Surprise !! 🎉';
      confetti(60);
      setTimeout(() => {
        btns.innerHTML = `<button class="btn" id="go">Et mon cadeau alors ? 🎁</button><div class="small">Psst, touche-le pour le faire sauter</div>`;
        btns.querySelector('#go').onclick = () => done();
      }, 1500);
    }
  },

  /* Messages surprises entre les couches */
  msg(p, done, ctx) {
    const m = (p.messages || [])[ctx.nth];
    const o = typeof m === 'string' ? { texte: m } : (m || {});
    const s = screen(`
      <div class="small">Une surprise était cachée dedans…</div>
      <div class="card">${o.image ? `<img src="${esc(o.image)}" alt="">` : ''}<div>${nl(o.texte)}</div>${o.de ? `<div class="from">— ${esc(o.de)}</div>` : ''}</div>
      <button class="btn" id="go">Continuer ➜</button>`);
    ac(); sfx.pop();
    s.querySelector('#go').onclick = () => done();
  },

  /* Fin : le code du vrai cadeau */
  code(p) {
    const chars = [...String(p.code || '???').toUpperCase()];
    const s = screen(`
      <h1>Joyeux Noël,<br>${esc(p.nom)} ! 🎄</h1>
      <div class="mini-hero" id="mh">${heroSVG(p, 'c')}</div>
      <div class="hint">Ton cadeau t'attend sous le sapin.<br>Cherche le paquet marqué :</div>
      <div class="codebox" id="cb">${chars.map(ch => `<span>${ch === ' ' ? '&nbsp;' : '?'}</span>`).join('')}</div>
      ${C.messageFinal ? `<div class="card compact">${nl(C.messageFinal)}</div>` : ''}
      <button class="btn ghost" id="guard">🗝️ Quelqu'un me demande un symbole</button>
      <button class="btn ghost" id="next">👥 Au tour de quelqu'un d'autre</button>
      ${TEST ? '<button class="link" id="again">🔁 Rejouer le déballage (mode test)</button>' : ''}`);
    const spans = [...s.querySelector('#cb').children];
    const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789★';
    if (LS.get('codeVu:' + p.nom, false)) {
      spans.forEach((sp, i) => { sp.innerHTML = chars[i] === ' ' ? '&nbsp;' : esc(chars[i]); });
    } else {
      const t0 = performance.now();
      spans.forEach((sp, i) => {
        if (chars[i] === ' ') return;
        const iv = setInterval(() => {
          if (performance.now() - t0 > 900 + i * 420) {
            clearInterval(iv);
            sp.textContent = chars[i]; sp.classList.add('lock');
            tone(600 + i * 70, 0.1, 'triangle', 0.2); buzz(25);
            if (i === chars.length - 1) { LS.set('codeVu:' + p.nom, true); confetti(); setTimeout(sfx.jingle, 200); }
          } else sp.textContent = ALPH[Math.floor(Math.random() * ALPH.length)];
        }, 60);
        onCleanup(() => clearInterval(iv));
      });
    }
    const mh = s.querySelector('#mh');
    mh.addEventListener('pointerdown', () => { ac(); mh.classList.remove('jump'); void mh.offsetWidth; mh.classList.add('jump'); sfx.giggle(); });
    const again = s.querySelector('#again');
    if (again) again.onclick = () => { LS.set('step:' + p.nom, 0); LS.set('codeVu:' + p.nom, false); leave(start); };
    s.querySelector('#guard').onclick = () => { ac(); leave(() => guardianScreen(p, () => runStep(p))); };
    s.querySelector('#next').onclick = () => { ac(); sfx.pop(); LS.set('joueur', null); leave(start); };
  },
};

start();
})();
