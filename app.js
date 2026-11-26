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
if (params.has('etape')) LS.set('step', parseInt(params.get('etape'), 10) || 0);
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
let actx = null;
function ac() {
  if (!actx) { const A = window.AudioContext || window.webkitAudioContext; if (A) actx = new A(); }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur = 0.15, type = 'sine', vol = 0.2, when = 0) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur = 0.12, vol = 0.25, freq = 2000) {
  const a = ac(); if (!a) return;
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
        <text x="150" y="201" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="16" fill="#8b1e2d">PÔLE NORD</text>
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
function getPerson() {
  const j = findPlayer(LS.get('joueur', null));
  if (!j) return null;
  return Object.assign({ messages: C.messagesParDefaut || [] }, j, { prenom: j.nom });
}

function start() {
  if (!isStandalone() && !TEST && !LS.get('skipInstall', false)) return installScreen();
  const p = getPerson();
  if (!p) return nameScreen();
  runStep(p);
}

/* --- Installation sur l'écran d'accueil --- */
function installScreen() {
  const steps = isIOS
    ? `<ol><li>Touche le bouton <b>Partager</b> <span style="font-size:20px">⬆️</span> (le carré avec une flèche, en bas ou en haut de Safari)</li>
         <li>Fais défiler et choisis <b>« Sur l'écran d'accueil »</b></li>
         <li>Touche <b>Ajouter</b>, puis ouvre l'icône 🎁 <b>Ne pas ouvrir</b></li></ol>`
    : `<ol><li>Touche le bouton <b>Installer</b> juste en dessous<br><span class="small">(ou le menu ⋮ en haut à droite → « Installer l'application » / « Ajouter à l'écran d'accueil »)</span></li>
         <li>Ouvre l'icône 🎁 <b>Ne pas ouvrir</b> sur ton écran d'accueil</li></ol>`;
  const s = screen(`
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
  const s = screen(`
    <h1>🎁 Un cadeau<br>t'attend !</h1>
    <div class="hint">Mais d'abord… qui es-tu ?</div>
    <div class="pick${(C.joueurs || []).length > 6 ? ' many' : ''}">${(C.joueurs || []).map((j, i) => `<button class="btn ghost" data-i="${i}">${esc(j.nom)}</button>`).join('')}</div>
    <div class="small">Touche ton prénom. Pas de triche 😏</div>`);
  s.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
    const j = C.joueurs[+b.dataset.i];
    ac(); sfx.win(); burst(b, 16);
    LS.set('joueur', j.nom); LS.set('step', 0); LS.set('codeVu', false);
    b.textContent = `Bienvenue ${j.nom} ! 🎉`;
    leave(start, 700);
  });
}

/* ---------------- Les couches à déballer ---------------- */
function sequence(p) {
  const dolls = p.simple ? 1 : (p.poupees || 2);
  const s = ['ruban', 'papier', 'msg', 'secouer', 'msg'];
  for (let i = 0; i < dolls; i++) s.push('poupee', 'msg');
  s.push('bougie', 'msg', 'personnage', 'code');
  let n = 0; const total = (p.messages || []).length;
  return s.filter(x => x !== 'msg' || n++ < total);
}

function runStep(p) {
  const seq = sequence(p);
  const i = Math.max(0, Math.min(LS.get('step', 0), seq.length - 1));
  const kind = seq[i];
  const nth = seq.slice(0, i).filter(x => x === kind).length;
  let fired = false;
  const done = (delay = 0) => { if (fired) return; fired = true; LS.set('step', i + 1); leave(() => runStep(p), delay); };
  const real = seq.filter(x => x !== 'msg' && x !== 'code');
  const pos = seq.slice(0, i).filter(x => x !== 'msg' && x !== 'code').length;
  const dots = `<div class="dots">${real.map((_, j) => `<i class="${j <= pos ? 'on' : ''} ${j === pos ? 'cur' : ''}"></i>`).join('')}</div>`;
  STEPS[kind](p, done, { nth, dots });
}

const STEPS = {

  /* 1. Tirer sur le nœud */
  ruban(p, done, ctx) {
    const s = screen(`${ctx.dots}
      <div class="hint">Tire sur le nœud pour le défaire 🎀</div>
      <div class="stage" id="st">${giftSVG(p.prenom, false)}</div>
      <div class="small">Attrape le nœud et tire fort, dans n'importe quelle direction !</div>`);
    const st = s.querySelector('#st'), svg = st.querySelector('svg'), bow = svg.querySelector('.bow'), rib = svg.querySelector('.rib');
    let tx = 0, ty = 0, finished = false, lastStep = 0;
    const limit = p.simple ? 110 : 170;
    const set = (x, y, r) => bow.setAttribute('transform', `translate(${x} ${y}) rotate(${r} 150 100)`);
    drag(st, {
      move(dx, dy) {
        if (finished) return;
        const k = svgScale(svg), d = Math.hypot(dx, dy);
        tx = dx * k * 0.55; ty = dy * k * 0.55;
        set(tx, ty, dx * 0.08);
        rib.setAttribute('transform', `translate(${tx * 0.15} 0)`);
        const stp = Math.floor(d / 30);
        if (stp > lastStep) { lastStep = stp; tone(260 + stp * 70, 0.06, 'triangle', 0.12); buzz(10); }
        if (d > limit) finish();
      },
      end() {
        if (finished) return;
        lastStep = 0; const x0 = tx, y0 = ty;
        tween(300, t => { const e = easeOut(t); set(x0 * (1 - e), y0 * (1 - e), 0); rib.removeAttribute('transform'); });
      },
    });
    function finish() {
      finished = true; sfx.pop(); sfx.rip(); buzz(80); burst(st, 24);
      const x0 = tx, y0 = ty, dir = Math.sign(tx) || 1;
      tween(700, t => {
        const e = easeOut(t);
        set(x0 + dir * 140 * e, y0 - 280 * e, dir * 220 * e);
        bow.style.opacity = 1 - t; rib.style.opacity = 1 - t;
      });
      done(450);
    }
  },

  /* 2. Déchirer le papier */
  papier(p, done, ctx) {
    const s = screen(`${ctx.dots}
      <div class="hint">Déchire le papier cadeau ! ✋</div>
      <div class="stage" id="st">${kraftSVG(p.prenom)}<canvas></canvas></div>
      <div class="small">Frotte partout avec ton doigt</div>`);
    const st = s.querySelector('#st'), cv = st.querySelector('canvas');
    const rect = st.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.width = Math.round(rect.width * dpr), H = cv.height = Math.round(rect.height * dpr);
    const g = cv.getContext('2d', { willReadFrequently: true }), k = W / 300;
    const rr = (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x * k, y * k, w * k, h * k, r * k); else g.rect(x * k, y * k, w * k, h * k); };

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
    g.fillStyle = g.createPattern(pc, 'repeat');
    rr(45, 125, 210, 155, 8); g.fill();
    rr(35, 100, 230, 38, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(45 * k, 138 * k, 210 * k, 12 * k);

    const sample = () => { const d = g.getImageData(0, 0, W, H).data; let c = 0; for (let i = 3; i < d.length; i += 36) if (d[i] > 10) c++; return c; };
    const base = sample() || 1;
    g.globalCompositeOperation = 'destination-out';
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#000'; g.fillStyle = '#000';
    const threshold = p.simple ? 0.45 : 0.62;
    let last = null, moves = 0, ripT = 0, finished = false;
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr]; };

    function scratch(a, b, e) {
      g.lineWidth = rand(38, 56) * k;
      g.beginPath(); g.moveTo(a[0], a[1]);
      g.quadraticCurveTo((a[0] + b[0]) / 2 + rand(-7, 7) * k, (a[1] + b[1]) / 2 + rand(-7, 7) * k, b[0], b[1]);
      g.stroke();
      for (let i = 0; i < 2; i++) { g.beginPath(); g.arc(b[0] + rand(-26, 26) * k, b[1] + rand(-26, 26) * k, rand(4, 13) * k, 0, 7); g.fill(); }
      const now = performance.now();
      if (now - ripT > 110 && Math.hypot(b[0] - a[0], b[1] - a[1]) > 2) { ripT = now; sfx.rip(); buzz(8); scraps(e.clientX, e.clientY); }
      if (++moves % 8 === 0 && 1 - sample() / base > threshold) finish();
    }
    cv.addEventListener('pointerdown', e => { if (finished) return; ac(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} last = pos(e); scratch(last, last, e); });
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
    const N = p.simple ? 5 : 8;
    const s = screen(`${ctx.dots}
      <div class="hint">Une boîte du Pôle Nord !<br>Secoue ton téléphone pour l'ouvrir 📳</div>
      <div class="stage" id="st">${kraftSVG(p.prenom)}</div>
      <div class="bar"><i></i></div>
      <div class="col">
        <button class="btn ghost" id="perm" hidden>📳 Activer la secousse</button>
        <div class="small" id="sub">…ou tapote la boîte</div>
      </div>`);
    const st = s.querySelector('#st'), svg = st.querySelector('svg'), bar = s.querySelector('.bar i');
    const perm = s.querySelector('#perm'), sub = s.querySelector('#sub'), lid = svg.querySelector('.klid');
    let count = 0, finished = false, lastHit = 0, prev = null;

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
      count++; bar.style.width = (count / N * 100) + '%';
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

  /* 4. Ouvrir les poupées russes */
  poupee(p, done, ctx) {
    const pal = DOLLS[ctx.nth % DOLLS.length];
    const title = ctx.nth === 0 ? 'Une poupée russe ! 🪆<br>Ouvre-la' : 'Encore une poupée ! 🪆<br>Ouvre-la aussi';
    const s = screen(`${ctx.dots}
      <div class="hint">${title}</div>
      <div class="stage" id="st">${dollSVG({ ...pal, id: 'd' + ctx.nth })}</div>
      <div class="small">Fais glisser le haut de la poupée vers le haut ⬆️</div>`);
    const st = s.querySelector('#st'), svg = st.querySelector('svg'), top = svg.querySelector('.top'), bot = svg.querySelector('.bot');
    let tx = 0, ty = 0, rot = 0, finished = false, lastStep = 0;
    const set = (x, y, r) => top.setAttribute('transform', `translate(${x} ${y}) rotate(${r} 100 168)`);
    drag(st, {
      move(dx, dy) {
        if (finished) return;
        const k = svgScale(svg);
        ty = Math.min(0, dy * k * 0.8); tx = dx * k * 0.2; rot = Math.max(-20, Math.min(20, dx * k * 0.12));
        set(tx, ty, rot);
        const stp = Math.floor(-ty / 15);
        if (stp > lastStep) { lastStep = stp; tone(170 + stp * 25, 0.05, 'square', 0.05); buzz(6); }
        if (ty < -75) finish();
      },
      end() {
        if (finished) return;
        lastStep = 0; const x0 = tx, y0 = ty, r0 = rot;
        tween(280, t => { const e = easeOut(t); set(x0 * (1 - e), y0 * (1 - e), r0 * (1 - e)); });
        tone(140, 0.08, 'triangle', 0.15);
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
    let strength = 0, level = 0, holding = false, finished = false, analyser = null, buf = null, raf = 0;

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
      if (level > 0.07) push += Math.min(1, (level - 0.07) * 6) * 0.03;
      if (holding) push += p.simple ? 0.016 : 0.011;
      strength = Math.max(0, strength + push - 0.003);
      const wobble = push > 0 ? rand(-25, 25) * Math.min(1, push * 40) : 0;
      fh.style.setProperty('--s', Math.max(0.15, 1 - strength * 0.85));
      fh.style.setProperty('--k', wobble + 'deg');
      glow.style.opacity = Math.max(0.1, 1 - strength);
      if (push > 0 && performance.now() - lastWhoosh > 250) { lastWhoosh = performance.now(); noise(0.25, 0.08, 400); buzz(10); }
      if (strength >= 1) return finish();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    onCleanup(() => { finished = true; cancelAnimationFrame(raf); });

    function finish() {
      finished = true;
      fh.style.transition = 'opacity .2s'; fh.style.opacity = 0; glow.style.opacity = 0;
      s.querySelector('.smoke').classList.add('on');
      sfx.whoosh(); setTimeout(sfx.win, 300); buzz([40, 30, 80]);
      sub.textContent = 'Bravo ! 👏';
      done(1300);
    }
  },

  /* 6. La dernière poupée s'ouvre : le personnage apparaît ! */
  personnage(p, done, ctx) {
    const N = 3;
    const s = screen(`${ctx.dots}
      <div class="hint" id="h">La toute dernière poupée tremble…<br>Tapote-la ! 👆</div>
      <div class="stage" id="st"><div class="doll-wrap">${dollSVG({ ...FINAL, id: 'last' })}</div></div>
      <div class="col" id="btns"><div class="small">Il y a quelqu'un là-dedans…</div></div>`);
    const st = s.querySelector('#st'), h = s.querySelector('#h'), btns = s.querySelector('#btns');
    let taps = 0, out = false;
    st.addEventListener('pointerdown', () => {
      ac();
      if (out) {
        const w = st.querySelector('.hero-wrap');
        w.classList.remove('jump'); void w.offsetWidth; w.classList.add('jump');
        sfx.giggle(); buzz(30); return;
      }
      taps++;
      const d = st.querySelector('.doll-wrap');
      d.style.transform = `scale(${1 + taps * 0.08})`;
      wiggle(d); sfx.rattle(); buzz(50 + taps * 30);
      if (taps >= N) reveal();
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
      ${TEST ? '<button class="link" id="again">🔁 Rejouer le déballage (mode test)</button>' : ''}`);
    const spans = [...s.querySelector('#cb').children];
    const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789★';
    if (LS.get('codeVu', false)) {
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
            if (i === chars.length - 1) { LS.set('codeVu', true); confetti(); setTimeout(sfx.jingle, 200); }
          } else sp.textContent = ALPH[Math.floor(Math.random() * ALPH.length)];
        }, 60);
        onCleanup(() => clearInterval(iv));
      });
    }
    const mh = s.querySelector('#mh');
    mh.addEventListener('pointerdown', () => { ac(); mh.classList.remove('jump'); void mh.offsetWidth; mh.classList.add('jump'); sfx.giggle(); });
    const again = s.querySelector('#again');
    if (again) again.onclick = () => { LS.set('step', 0); LS.set('codeVu', false); leave(start); };
  },
};

start();
})();
