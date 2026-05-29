/**
 * AXIOM — Advanced Smart Calculator
 * script.js — Modular Vanilla JS
 * Features: Basic, Scientific, Currency, History,
 *           Voice, Memory, Keyboard, Sound, Dark/Light,
 *           Particles, Toast, Clock, LocalStorage
 */

/* =====================================================
   STATE
   ===================================================== */
const State = {
  // Basic calculator
  expression: '0',
  result: '',
  justCalculated: false,
  memory: 0,
  hasMemory: false,

  // Scientific calculator
  sciExpression: '0',
  sciResult: '',
  sciJustCalc: false,
  angleDeg: true,  // true = DEG, false = RAD

  // Settings
  darkMode: true,
  soundEnabled: true,

  // Currency
  rates: {},
  ratesFetched: false,

  // History
  history: [],

  // Voice
  voiceActive: false,
};

/* =====================================================
   DOM CACHE
   ===================================================== */
const $ = id => document.getElementById(id);

const DOM = {
  splash: $('splashScreen'),
  app: $('app'),
  themeToggle: $('themeToggle'),
  themeIcon: $('themeIcon'),
  soundToggle: $('soundToggle'),
  soundIcon: $('soundIcon'),
  clockTime: $('clockTime'),
  clockDate: $('clockDate'),
  toastContainer: $('toastContainer'),

  // Calculator
  calcExpression: $('calcExpression'),
  calcResult: $('calcResult'),
  memIndicator: $('memIndicator'),
  copyBtn: $('copyBtn'),
  voiceBtn: $('voiceBtn'),

  // Scientific
  sciExpression: $('sciExpression'),
  sciResult: $('sciResult'),
  sciMemIndicator: $('sciMemIndicator'),
  angleModeToggle: $('angleModeToggle'),
  angleMode: $('angleMode'),

  // Currency
  fromCurrency: $('fromCurrency'),
  toCurrency: $('toCurrency'),
  fromAmount: $('fromAmount'),
  toAmount: $('toAmount'),
  swapCurrency: $('swapCurrency'),
  rateDisplay: $('rateDisplay'),
  rateText: $('rateText'),
  rateGrid: $('rateGrid'),
  rateUpdateTime: $('rateUpdateTime'),
  currencyError: $('currencyError'),

  // History
  historyList: $('historyList'),
  historyBadge: $('historyBadge'),
  clearHistory: $('clearHistory'),
};

/* =====================================================
   AUDIO ENGINE
   ===================================================== */
const Audio = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function play(freq = 440, type = 'sine', duration = 0.08, gain = 0.15) {
    if (!State.soundEnabled) return;
    try {
      const a = getCtx();
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.connect(g);
      g.connect(a.destination);
      osc.frequency.value = freq;
      osc.type = type;
      g.gain.setValueAtTime(gain, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + duration);
      osc.start(a.currentTime);
      osc.stop(a.currentTime + duration);
    } catch (e) {}
  }

  return {
    key: () => play(600, 'sine', 0.05, 0.08),
    op: () => play(480, 'triangle', 0.07, 0.1),
    eq: () => { play(880, 'sine', 0.06, 0.12); setTimeout(() => play(1100, 'sine', 0.08, 0.1), 60); },
    err: () => play(220, 'sawtooth', 0.15, 0.12),
    clear: () => play(350, 'sine', 0.06, 0.08),
  };
})();

/* =====================================================
   TOAST
   ===================================================== */
function showToast(msg, type = 'info', duration = 2800) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  DOM.toastContainer.appendChild(t);
  setTimeout(() => {
    t.classList.add('fade-out');
    setTimeout(() => t.remove(), 350);
  }, duration);
}

/* =====================================================
   CLOCK
   ===================================================== */
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  DOM.clockTime.textContent = `${h}:${m}`;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  DOM.clockDate.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

/* =====================================================
   THEME
   ===================================================== */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', State.darkMode ? 'dark' : 'light');
  DOM.themeIcon.textContent = State.darkMode ? '🌙' : '☀️';
  localStorage.setItem('axiom-theme', State.darkMode ? 'dark' : 'light');
}

function toggleTheme() {
  State.darkMode = !State.darkMode;
  applyTheme();
  showToast(`${State.darkMode ? 'Dark' : 'Light'} mode activated`, 'info', 1600);
}

/* =====================================================
   SOUND TOGGLE
   ===================================================== */
function toggleSound() {
  State.soundEnabled = !State.soundEnabled;
  DOM.soundIcon.textContent = State.soundEnabled ? '🔊' : '🔇';
  localStorage.setItem('axiom-sound', State.soundEnabled ? '1' : '0');
  showToast(`Sound ${State.soundEnabled ? 'on' : 'off'}`, 'info', 1400);
}

/* =====================================================
   RIPPLE EFFECT
   ===================================================== */
function addRipple(btn, e) {
  const rect = btn.getBoundingClientRect();
  const x = (e.clientX || rect.left + rect.width / 2) - rect.left;
  const y = (e.clientY || rect.top + rect.height / 2) - rect.top;
  const r = document.createElement('span');
  r.className = 'ripple';
  const size = Math.max(rect.width, rect.height) * 1.5;
  r.style.cssText = `width:${size}px;height:${size}px;left:${x - size/2}px;top:${y - size/2}px`;
  btn.appendChild(r);
  setTimeout(() => r.remove(), 600);
  // CSS var for hover glow
  btn.style.setProperty('--rx', `${(x / rect.width * 100).toFixed(0)}%`);
  btn.style.setProperty('--ry', `${(y / rect.height * 100).toFixed(0)}%`);
}

/* =====================================================
   HISTORY
   ===================================================== */
function addToHistory(expr, result) {
  const entry = { expr, result, time: new Date().toLocaleTimeString() };
  State.history.unshift(entry);
  if (State.history.length > 50) State.history.pop();
  localStorage.setItem('axiom-history', JSON.stringify(State.history));
  renderHistory();
}

function renderHistory() {
  const count = State.history.length;
  DOM.historyBadge.textContent = count;
  DOM.historyBadge.classList.toggle('hidden', count === 0);

  if (count === 0) {
    DOM.historyList.innerHTML = `
      <div class="history-empty">
        <span class="history-empty-icon">📋</span>
        <p>No calculations yet.</p>
        <p class="history-empty-sub">Start computing to see history here.</p>
      </div>`;
    return;
  }

  DOM.historyList.innerHTML = State.history.map((item, i) => `
    <div class="history-item" data-index="${i}">
      <div class="history-expr">${escHtml(item.expr)}</div>
      <div class="history-res">= ${escHtml(item.result)}</div>
      <div class="history-time">${item.time}</div>
    </div>`).join('');

  DOM.historyList.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => {
      const item = State.history[+el.dataset.index];
      State.expression = item.result;
      State.result = '';
      State.justCalculated = true;
      updateCalcDisplay();
      switchTab('calculator');
      showToast('Loaded from history', 'success', 1600);
    });
  });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* =====================================================
   BASIC CALCULATOR LOGIC
   ===================================================== */
function updateCalcDisplay(animate = false) {
  DOM.calcExpression.textContent = State.expression || '0';
  DOM.calcResult.textContent = State.result;
  if (animate) {
    DOM.calcResult.classList.remove('result-pop');
    void DOM.calcResult.offsetWidth;
    DOM.calcResult.classList.add('result-pop');
  }
  DOM.memIndicator.classList.toggle('hidden', !State.hasMemory);
}

function formatNum(n) {
  if (!isFinite(n)) return n > 0 ? 'Infinity' : '-Infinity';
  if (isNaN(n)) return 'Error';
  // Limit display length
  if (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-7 && n !== 0)) {
    return n.toExponential(6);
  }
  const str = parseFloat(n.toPrecision(12)).toString();
  return str;
}

function safeEval(expr) {
  // Replace display symbols with JS operators
  let e = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, String(Math.PI))
    .replace(/e(?![0-9])/g, String(Math.E));

  // Basic validation: only allow safe characters
  if (!/^[0-9+\-*/.()%e\s]+$/.test(e)) throw new Error('Invalid expression');

  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + e + ')')();
    if (!isFinite(result) && result !== Infinity && result !== -Infinity) throw new Error('Math Error');
    return result;
  } catch (err) {
    throw new Error('Math Error');
  }
}

function calcAction(action) {
  Audio.key();

  const isOp = ['÷', '×', '−', '+'].includes(action);
  const lastChar = State.expression.slice(-1);

  if (State.justCalculated && !isOp && !['=', 'clear', 'backspace'].includes(action)) {
    // Start fresh after result, unless chaining with operator
    if (!isOp) {
      State.expression = '0';
    }
    State.justCalculated = false;
  }

  switch (action) {
    case 'clear':
      Audio.clear();
      State.expression = '0';
      State.result = '';
      State.justCalculated = false;
      break;

    case 'backspace':
      if (State.expression.length > 1) {
        State.expression = State.expression.slice(0, -1);
      } else {
        State.expression = '0';
      }
      State.result = '';
      break;

    case 'sign':
      if (State.expression !== '0') {
        if (State.expression.startsWith('-')) {
          State.expression = State.expression.slice(1);
        } else {
          State.expression = '-' + State.expression;
        }
      }
      break;

    case 'percent':
      try {
        const pv = safeEval(State.expression);
        State.expression = formatNum(pv / 100);
      } catch (e) { Audio.err(); }
      break;

    case '÷':
    case '×':
    case '−':
    case '+':
      Audio.op();
      if (['+', '−', '×', '÷'].includes(lastChar)) {
        State.expression = State.expression.slice(0, -1) + action;
      } else if (State.justCalculated && State.result) {
        State.expression = State.result + action;
        State.result = '';
        State.justCalculated = false;
      } else {
        State.expression += action;
      }
      break;

    case '.':
      // Only add dot if last number segment doesn't have one
      const parts = State.expression.split(/[+−×÷]/);
      if (!parts[parts.length - 1].includes('.')) {
        if (State.expression === '0' || State.justCalculated) {
          State.expression = '0.';
          State.justCalculated = false;
        } else {
          State.expression += '.';
        }
      }
      break;

    case '=':
      Audio.eq();
      try {
        const res = safeEval(State.expression);
        const formatted = formatNum(res);
        addToHistory(State.expression, formatted);
        State.result = formatted;
        State.expression = formatted;
        State.justCalculated = true;
        updateCalcDisplay(true);
        // Save last calculation
        localStorage.setItem('axiom-last', JSON.stringify({ expr: State.expression, res: formatted }));
        return;
      } catch (err) {
        Audio.err();
        State.result = 'Error';
        State.justCalculated = true;
        updateCalcDisplay(true);
        return;
      }

    case 'sqrt':
      try {
        const sv = safeEval(State.expression);
        const sr = Math.sqrt(sv);
        State.result = formatNum(sr);
        State.expression = `√(${State.expression})`;
        State.justCalculated = true;
        addToHistory(`√(${State.expression.replace('√(','').replace(')','')})`, State.result);
        updateCalcDisplay(true);
        return;
      } catch (e) { Audio.err(); }
      break;

    case 'square':
      try {
        const qv = safeEval(State.expression);
        State.result = formatNum(qv ** 2);
        State.expression = `(${State.expression})²`;
        State.justCalculated = true;
        addToHistory(State.expression, State.result);
        updateCalcDisplay(true);
        return;
      } catch (e) { Audio.err(); }
      break;

    case 'pow':
      if (!['+','−','×','÷','^'].includes(lastChar)) {
        State.expression += '^';
        Audio.op();
      }
      break;

    default:
      // Digit
      if (State.expression === '0' && action !== '.') {
        State.expression = action;
      } else if (State.justCalculated) {
        State.expression = action;
        State.result = '';
        State.justCalculated = false;
      } else {
        State.expression += action;
      }
      // Auto-preview
      try {
        const prev = safeEval(State.expression);
        if (!isNaN(prev) && isFinite(prev)) {
          State.result = '= ' + formatNum(prev);
        } else {
          State.result = '';
        }
      } catch (e) { State.result = ''; }
  }

  updateCalcDisplay();
}

/* =====================================================
   MEMORY BUTTONS
   ===================================================== */
function memAction(action) {
  Audio.key();
  const current = parseFloat(State.expression) || 0;

  switch (action) {
    case 'mc':
      State.memory = 0;
      State.hasMemory = false;
      showToast('Memory cleared', 'info', 1400);
      break;
    case 'mr':
      if (State.hasMemory) {
        State.expression = formatNum(State.memory);
        State.result = '';
        State.justCalculated = false;
      } else {
        showToast('Memory is empty', 'info', 1400);
      }
      break;
    case 'm+':
      State.memory += current;
      State.hasMemory = true;
      showToast(`M+ = ${formatNum(State.memory)}`, 'success', 1600);
      break;
    case 'm-':
      State.memory -= current;
      State.hasMemory = true;
      showToast(`M− = ${formatNum(State.memory)}`, 'success', 1600);
      break;
  }
  updateCalcDisplay();
}

/* =====================================================
   SCIENTIFIC CALCULATOR LOGIC
   ===================================================== */
function toRad(deg) { return deg * Math.PI / 180; }

function updateSciDisplay(animate = false) {
  DOM.sciExpression.textContent = State.sciExpression || '0';
  DOM.sciResult.textContent = State.sciResult;
  if (animate) {
    DOM.sciResult.classList.remove('result-pop');
    void DOM.sciResult.offsetWidth;
    DOM.sciResult.classList.add('result-pop');
  }
  DOM.angleModeToggle.textContent = State.angleDeg ? 'DEG' : 'RAD';
}

function sciAction(rawAction) {
  // Strip "-sci" suffix
  const action = rawAction.replace(/-sci$/, '');
  Audio.key();

  const lastChar = State.sciExpression.slice(-1);
  const isOp = ['+', '−', '×', '÷'].includes(action);

  if (State.sciJustCalc && !isOp) {
    State.sciExpression = '0';
    State.sciJustCalc = false;
  }

  // Helper: get current value
  const getCurrent = () => {
    const e = State.sciExpression
      .replace(/×/g, '*').replace(/÷/g, '/')
      .replace(/−/g, '-').replace(/π/g, String(Math.PI))
      .replace(/e(?![0-9])/g, String(Math.E));
    return Function('"use strict"; return (' + e + ')')();
  };

  // Scientific functions that transform current expression
  const sciUnary = {
    'sin': v => State.angleDeg ? Math.sin(toRad(v)) : Math.sin(v),
    'cos': v => State.angleDeg ? Math.cos(toRad(v)) : Math.cos(v),
    'tan': v => State.angleDeg ? Math.tan(toRad(v)) : Math.tan(v),
    'asin': v => { const r = Math.asin(v); return State.angleDeg ? r * 180 / Math.PI : r; },
    'acos': v => { const r = Math.acos(v); return State.angleDeg ? r * 180 / Math.PI : r; },
    'atan': v => { const r = Math.atan(v); return State.angleDeg ? r * 180 / Math.PI : r; },
    'log': v => Math.log10(v),
    'ln': v => Math.log(v),
    'log2': v => Math.log2(v),
    'exp': v => Math.exp(v),
    'sqrt': v => Math.sqrt(v),
    'cbrt': v => Math.cbrt(v),
    'square': v => v ** 2,
    'cube': v => v ** 3,
    'factorial': v => {
      if (v < 0 || !Number.isInteger(v) || v > 170) throw new Error('Domain Error');
      let f = 1; for (let i = 2; i <= v; i++) f *= i; return f;
    },
    'inv': v => 1 / v,
    'abs': v => Math.abs(v),
  };

  if (sciUnary[action]) {
    try {
      const v = getCurrent();
      const res = sciUnary[action](v);
      const label = { sin:'sin',cos:'cos',tan:'tan',asin:'sin⁻¹',acos:'cos⁻¹',atan:'tan⁻¹',
        log:'log',ln:'ln',log2:'log₂',exp:'eˣ',sqrt:'√',cbrt:'∛',square:'²',cube:'³',
        factorial:'!',inv:'1/',abs:'|'
      }[action] || action;
      State.sciResult = formatNum(res);
      State.sciExpression = `${label}(${State.sciExpression})`;
      State.sciJustCalc = true;
      addToHistory(State.sciExpression, State.sciResult);
      Audio.eq();
      updateSciDisplay(true);
    } catch (e) {
      State.sciResult = 'Domain Error';
      Audio.err();
      updateSciDisplay();
    }
    return;
  }

  switch (action) {
    case 'clear': Audio.clear(); State.sciExpression = '0'; State.sciResult = ''; State.sciJustCalc = false; break;
    case 'backspace':
      State.sciExpression = State.sciExpression.length > 1 ? State.sciExpression.slice(0, -1) : '0';
      State.sciResult = '';
      break;
    case 'sign':
      if (State.sciExpression !== '0') {
        State.sciExpression = State.sciExpression.startsWith('-') ? State.sciExpression.slice(1) : '-' + State.sciExpression;
      }
      break;
    case 'percent':
      try { State.sciExpression = formatNum(getCurrent() / 100); } catch (e) {}
      break;
    case '÷': case '×': case '−': case '+':
      Audio.op();
      if (['+','−','×','÷'].includes(lastChar)) {
        State.sciExpression = State.sciExpression.slice(0,-1) + action;
      } else {
        State.sciExpression += action;
      }
      break;
    case '^':
      if (!['+',' −','×','÷','^'].includes(lastChar)) State.sciExpression += '^';
      break;
    case '.':
      const pts = State.sciExpression.split(/[+−×÷^]/);
      if (!pts[pts.length-1].includes('.')) State.sciExpression += '.';
      break;
    case '(': State.sciExpression += '('; break;
    case ')': State.sciExpression += ')'; break;
    case 'pi': State.sciExpression = State.sciExpression === '0' ? 'π' : State.sciExpression + '×π'; break;
    case 'e': State.sciExpression = State.sciExpression === '0' ? 'e' : State.sciExpression + '×e'; break;
    case 'pow': if (!['+','−','×','÷','^'].includes(lastChar)) State.sciExpression += '^'; break;
    case '=':
      Audio.eq();
      try {
        let expr = State.sciExpression
          .replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-')
          .replace(/π/g, String(Math.PI)).replace(/e(?![0-9+\-])/g, String(Math.E))
          .replace(/\^/g,'**');
        const res = Function('"use strict"; return (' + expr + ')')();
        State.sciResult = formatNum(res);
        addToHistory(State.sciExpression, State.sciResult);
        State.sciExpression = State.sciResult;
        State.sciJustCalc = true;
        updateSciDisplay(true);
        return;
      } catch (e) {
        State.sciResult = 'Math Error';
        Audio.err();
        updateSciDisplay(true);
        return;
      }
    default:
      // digits
      if (State.sciExpression === '0' && /[0-9]/.test(action)) {
        State.sciExpression = action;
      } else {
        State.sciExpression += action;
      }
      break;
  }
  updateSciDisplay();
}

/* =====================================================
   CURRENCY CONVERTER
   ===================================================== */

// Fallback rates (USD base, approximate)
const FALLBACK_RATES = {
  USD:1, INR:83.5, EUR:0.92, GBP:0.79, JPY:149.5,
  CNY:7.24, AED:3.67, SGD:1.35, KRW:1320, PKR:278,
  BDT:110, LKR:310, NPR:133, CAD:1.36, AUD:1.53
};

async function fetchRates() {
  try {
    // Using open.er-api.com (free, no key needed)
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    if (data.result !== 'success') throw new Error('API error');
    State.rates = data.rates;
    State.ratesFetched = true;
    DOM.currencyError.classList.add('hidden');
    const updated = new Date(data.time_last_update_utc).toLocaleString();
    DOM.rateUpdateTime.textContent = `Updated: ${updated}`;
    renderRateGrid();
    convertCurrency();
    showToast('Live rates fetched ✓', 'success', 2000);
  } catch (err) {
    // Use fallback
    State.rates = FALLBACK_RATES;
    DOM.currencyError.classList.remove('hidden');
    DOM.rateUpdateTime.textContent = 'Using fallback rates (offline)';
    renderRateGrid();
    convertCurrency();
  }
}

function convertCurrency() {
  const from = DOM.fromCurrency.value;
  const to = DOM.toCurrency.value;
  const amount = parseFloat(DOM.fromAmount.value);

  if (!State.rates[from] || !State.rates[to] || isNaN(amount)) {
    DOM.toAmount.textContent = '—';
    DOM.rateText.textContent = 'Select valid currencies';
    return;
  }

  const usdAmount = amount / State.rates[from];
  const result = usdAmount * State.rates[to];
  const rate = State.rates[to] / State.rates[from];

  DOM.toAmount.textContent = result >= 1000
    ? result.toLocaleString('en', { maximumFractionDigits: 2 })
    : result.toFixed(4);

  DOM.rateText.textContent = `1 ${from} = ${rate >= 1000
    ? rate.toLocaleString('en', { maximumFractionDigits: 2 })
    : rate.toFixed(4)} ${to}`;
}

function renderRateGrid() {
  const currencies = ['INR','EUR','GBP','JPY','CNY','AED','SGD','KRW'];
  DOM.rateGrid.innerHTML = currencies.map(code => {
    const rate = State.rates[code];
    return `<div class="rate-item">
      <div class="rate-item-label">1 USD → ${code}</div>
      <div class="rate-item-value">${rate >= 1000 ? rate.toLocaleString('en', {maximumFractionDigits:2}) : rate?.toFixed(4) ?? '—'}</div>
    </div>`;
  }).join('');
}

/* =====================================================
   TAB SWITCHING
   ===================================================== */
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.tab-content').forEach(s => s.classList.toggle('active', s.id === `tab-${tabName}`));
}

/* =====================================================
   COPY RESULT
   ===================================================== */
function copyResult() {
  const val = State.result.replace('= ','') || State.expression;
  navigator.clipboard.writeText(val).then(() => {
    showToast('Copied to clipboard!', 'success', 1600);
  }).catch(() => {
    showToast('Copy failed', 'error', 1600);
  });
}

/* =====================================================
   VOICE INPUT
   ===================================================== */
function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    DOM.voiceBtn.style.opacity = '0.4';
    DOM.voiceBtn.title = 'Voice not supported in this browser';
    return;
  }

  const recog = new SpeechRecognition();
  recog.lang = 'en-US';
  recog.continuous = false;
  recog.interimResults = false;

  recog.onstart = () => {
    State.voiceActive = true;
    DOM.voiceBtn.textContent = '🔴 Listening…';
    showToast('Listening… say a calculation', 'info', 3000);
  };

  recog.onresult = e => {
    const transcript = e.results[0][0].transcript.toLowerCase();
    const parsed = parseVoiceInput(transcript);
    if (parsed) {
      State.expression = parsed;
      State.result = '';
      State.justCalculated = false;
      updateCalcDisplay();
      showToast(`Heard: "${transcript}"`, 'success', 2000);
    } else {
      showToast(`Couldn't parse: "${transcript}"`, 'error', 2400);
    }
  };

  recog.onerror = () => showToast('Voice error. Try again.', 'error', 2000);
  recog.onend = () => {
    State.voiceActive = false;
    DOM.voiceBtn.textContent = '🎤 Voice';
  };

  DOM.voiceBtn.addEventListener('click', () => {
    if (!State.voiceActive) recog.start();
    else recog.stop();
  });
}

function parseVoiceInput(text) {
  return text
    .replace(/plus/g, '+').replace(/minus|subtract/g, '−')
    .replace(/times|multiplied by/g, '×').replace(/divided by/g, '÷')
    .replace(/percent/g, '%').replace(/point/g, '.')
    .replace(/zero/g,'0').replace(/one/g,'1').replace(/two/g,'2')
    .replace(/three/g,'3').replace(/four/g,'4').replace(/five/g,'5')
    .replace(/six/g,'6').replace(/seven/g,'7').replace(/eight/g,'8')
    .replace(/nine/g,'9').replace(/[^0-9+−×÷%.]/g,'');
}

/* =====================================================
   KEYBOARD SUPPORT
   ===================================================== */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    const activeTab = document.querySelector('.tab-content.active')?.id;
    const isSci = activeTab === 'tab-scientific';

    if (e.key >= '0' && e.key <= '9') {
      isSci ? sciAction(e.key + '-sci') : calcAction(e.key);
    } else if (e.key === '+') {
      isSci ? sciAction('+-sci') : calcAction('+');
    } else if (e.key === '-') {
      isSci ? sciAction('−-sci') : calcAction('−');
    } else if (e.key === '*') {
      isSci ? sciAction('×-sci') : calcAction('×');
    } else if (e.key === '/') {
      e.preventDefault();
      isSci ? sciAction('÷-sci') : calcAction('÷');
    } else if (e.key === '.') {
      isSci ? sciAction('.-sci') : calcAction('.');
    } else if (e.key === '%') {
      isSci ? sciAction('percent-sci') : calcAction('percent');
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      isSci ? sciAction('=-sci') : calcAction('=');
    } else if (e.key === 'Backspace') {
      isSci ? sciAction('backspace-sci') : calcAction('backspace');
    } else if (e.key === 'Escape') {
      isSci ? sciAction('clear-sci') : calcAction('clear');
    } else if (e.key === '^') {
      isSci ? sciAction('^-sci') : calcAction('pow');
    } else if (e.key === '(') {
      if (isSci) sciAction('(-sci');
    } else if (e.key === ')') {
      if (isSci) sciAction(')-sci');
    }
  });
}

/* =====================================================
   PARTICLES BACKGROUND
   ===================================================== */
function initParticles() {
  const canvas = $('particleCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Particle() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.r = Math.random() * 1.5 + 0.3;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.alpha = Math.random() * 0.5 + 0.1;
    this.color = Math.random() > 0.5 ? '0,245,196' : '124,92,252';
  }

  function init() {
    particles = [];
    const count = Math.min(60, Math.floor(W * H / 20000));
    for (let i = 0; i < count; i++) particles.push(new Particle());
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
    });
    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0,245,196,${0.05 * (1 - dist/100)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); init(); });
  resize(); init(); draw();
}

/* =====================================================
   SPLASH SCREEN
   ===================================================== */
function initSplash() {
  setTimeout(() => {
    DOM.splash.classList.add('fade-out');
    setTimeout(() => {
      DOM.splash.style.display = 'none';
      DOM.app.classList.remove('hidden');
      DOM.app.style.animation = 'fadeSlideIn 0.5s ease';
    }, 600);
  }, 2200);
}

/* =====================================================
   EVENT BINDINGS
   ===================================================== */
function bindEvents() {
  // Theme & sound
  DOM.themeToggle.addEventListener('click', toggleTheme);
  DOM.soundToggle.addEventListener('click', toggleSound);

  // Tab nav
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Basic calculator keys
  document.querySelectorAll('#tab-calculator .key').forEach(btn => {
    btn.addEventListener('click', e => {
      addRipple(btn, e);
      calcAction(btn.dataset.action);
    });
  });

  // Memory buttons
  document.querySelectorAll('.mem-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      addRipple(btn, e);
      memAction(btn.dataset.action);
    });
  });

  // Copy & Voice
  DOM.copyBtn.addEventListener('click', copyResult);

  // Scientific keys
  document.querySelectorAll('#tab-scientific .key').forEach(btn => {
    btn.addEventListener('click', e => {
      addRipple(btn, e);
      sciAction(btn.dataset.action);
    });
  });

  // Angle mode toggle
  DOM.angleModeToggle.addEventListener('click', () => {
    State.angleDeg = !State.angleDeg;
    DOM.angleModeToggle.textContent = State.angleDeg ? 'DEG' : 'RAD';
    showToast(`Angle mode: ${State.angleDeg ? 'Degrees' : 'Radians'}`, 'info', 1600);
  });

  // Currency
  DOM.fromCurrency.addEventListener('change', convertCurrency);
  DOM.toCurrency.addEventListener('change', convertCurrency);
  DOM.fromAmount.addEventListener('input', convertCurrency);
  DOM.swapCurrency.addEventListener('click', () => {
    const tmp = DOM.fromCurrency.value;
    DOM.fromCurrency.value = DOM.toCurrency.value;
    DOM.toCurrency.value = tmp;
    convertCurrency();
    showToast('Currencies swapped', 'info', 1400);
  });

  // History clear
  DOM.clearHistory.addEventListener('click', () => {
    if (State.history.length === 0) { showToast('History is already empty', 'info', 1400); return; }
    State.history = [];
    localStorage.removeItem('axiom-history');
    renderHistory();
    showToast('History cleared', 'info', 1400);
  });
}

/* =====================================================
   LOAD SAVED STATE
   ===================================================== */
function loadSaved() {
  const theme = localStorage.getItem('axiom-theme');
  if (theme) { State.darkMode = theme === 'dark'; applyTheme(); }

  const sound = localStorage.getItem('axiom-sound');
  if (sound !== null) {
    State.soundEnabled = sound === '1';
    DOM.soundIcon.textContent = State.soundEnabled ? '🔊' : '🔇';
  }

  const hist = localStorage.getItem('axiom-history');
  if (hist) { try { State.history = JSON.parse(hist); } catch (e) {} }

  const last = localStorage.getItem('axiom-last');
  if (last) {
    try {
      const { expr, res } = JSON.parse(last);
      State.expression = expr;
      State.result = '= ' + res;
      State.justCalculated = true;
    } catch (e) {}
  }

  renderHistory();
  updateCalcDisplay();
  updateSciDisplay();
}

/* =====================================================
   INIT
   ===================================================== */
function init() {
  loadSaved();
  initSplash();
  initParticles();
  initKeyboard();
  initVoice();
  bindEvents();
  fetchRates();

  // Clock — update every second
  updateClock();
  setInterval(updateClock, 1000);

  // Initial rate grid with fallbacks
  State.rates = FALLBACK_RATES;
  renderRateGrid();
  convertCurrency();
}

document.addEventListener('DOMContentLoaded', init);
