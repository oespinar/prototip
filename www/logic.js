// Lógica pura de PROVA: fechas, progreso y comprobación de puzles.
// Sin DOM, para poder probarla aparte.
(function (root) {
  const SEASON_START = '2026-11-09'; // lunes de la Ronda 1
  const DAY = 86400000;

  // ---------- Fechas (siempre en hora local) ----------
  function toISO(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
  function fromISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(iso, n) { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
  function dayIndex(iso) { return (fromISO(iso).getDay() + 6) % 7; } // 0 = lunes
  function mondayOf(iso) { return addDays(iso, -dayIndex(iso)); }
  function roundOf(iso) {
    const diff = Math.round((fromISO(mondayOf(iso)) - fromISO(SEASON_START)) / DAY / 7);
    return Math.max(1, diff + 1);
  }
  function weekDates(iso) { const m = mondayOf(iso); return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(m, i)); }

  // ---------- Progreso ----------
  const RANKS = [
    { id: 'aspirante', min: 0 }, { id: 'candidato', min: 5 }, { id: 'elegido', min: 15 },
    { id: 'iniciado', min: 30 }, { id: 'custodio', min: 50 },
  ];
  function totalSeals(progress) { return Object.keys(progress).length; }
  function rankOf(total) { let r = RANKS[0]; for (const x of RANKS) if (total >= x.min) r = x; return r; }
  function nextRank(total) { return RANKS.find(x => x.min > total) || null; }
  function sealsInWeek(progress, iso) { return weekDates(iso).filter(d => progress[d]).length; }
  function goldInWeek(progress, iso) { return weekDates(iso).filter(d => progress[d] && progress[d].seal === 'gold').length; }
  // Racha semanal: semanas seguidas con 3 o más sellos. La semana en curso suma si ya llega a 3, pero nunca rompe.
  function weeklyStreak(progress, today) {
    let streak = 0; let m = mondayOf(today);
    if (sealsInWeek(progress, m) >= 3) streak++;
    m = addDays(m, -7);
    while (sealsInWeek(progress, m) >= 3) { streak++; m = addDays(m, -7); }
    return streak;
  }
  // Rareza del sobre: 7 sellos = raro seguro; 5-6 = raro con 50 %; menos = común.
  function envelopeRarity(nSeals, random) {
    if (nSeals >= 7) return 'raro';
    if (nSeals >= 5) return random() < 0.5 ? 'raro' : 'comun';
    return 'comun';
  }

  // ---------- Puzles: comprobación ----------
  function routeSolved(p, path) {
    const free = p.n * p.n - p.blocks.length;
    if (path.length !== free || path[0] !== p.start || path[path.length - 1] !== p.end) return false;
    const seen = new Set();
    for (let i = 0; i < path.length; i++) {
      const c = path[i];
      if (seen.has(c) || p.blocks.includes(c)) return false;
      seen.add(c);
      if (i > 0) {
        const a = path[i - 1], ax = a % p.n, ay = (a / p.n) | 0, cx = c % p.n, cy = (c / p.n) | 0;
        if (Math.abs(ax - cx) + Math.abs(ay - cy) !== 1) return false;
      }
    }
    return true;
  }

  const CLOCKS = { shown: [7, 8, 10, 1], answer: 5 };
  function clocksSolved(h) { return h === CLOCKS.answer; }

  // Balanza: valores en triángulos (tri = 1)
  const BALANCE = {
    easy: { scales: [[['sq'], ['tri', 'tri', 'tri']]], question: ['sq', 'sq'], answer: 6 },
    medium: { scales: [[['sq'], ['tri', 'tri']], [['circ'], ['sq', 'tri']]], question: ['circ', 'sq'], answer: 5 },
    hard: {
      scales: [[['sq', 'sq'], ['tri', 'tri', 'tri']], [['circ', 'tri'], ['sq', 'sq']], [['dia'], ['circ', 'sq']]],
      question: ['dia', 'dia'], answer: 7,
    },
  };
  const BALANCE_VALUES = {
    easy: { tri: 1, sq: 3 }, medium: { tri: 1, sq: 2, circ: 3 }, hard: { tri: 1, sq: 1.5, circ: 2, dia: 3.5 },
  };
  function balanceConsistent(level) { // comprueba que los datos cuadran
    const v = BALANCE_VALUES[level], b = BALANCE[level];
    const sum = arr => arr.reduce((a, x) => a + v[x], 0);
    return b.scales.every(([l, r]) => sum(l) === sum(r)) && sum(b.question) === b.answer;
  }
  function balanceSolved(level, n) { return n === BALANCE[level].answer; }

  function shelfClueOk(c, order) {
    const ia = order.indexOf(c.a), ib = c.b !== undefined ? order.indexOf(c.b) : -1;
    if (c.t === 'adj') return ib === ia + 1;
    if (c.t === 'left') return ia < ib;
    if (c.t === 'pos') return ia === c.k;
    if (c.t === 'far') return Math.abs(ia - ib) > 1;
    return false;
  }
  function shelfSolved(p, order) { return p.clues.every(c => shelfClueOk(c, order)); }

  // Espejos: el rayo entra por la izquierda en la fila `source` y debe salir por arriba en la columna `target`.
  function beam(p, orient) {
    const n = p.n, g = p.grid; const idx = {}; let mi = 0;
    for (let k = 0; k < g.length; k++) if (g[k] === 'M') idx[k] = mi++;
    let x = -1, y = p.source, dx = 1, dy = 0; const pts = [[x + 0.5, y + 0.5]];
    for (let s = 0; s < 200; s++) {
      x += dx; y += dy;
      if (x < 0 || y < 0 || x >= n || y >= n) { pts.push([x + 0.5, y + 0.5]); return { pts, exit: { x, y } }; }
      const k = y * n + x; const c = g[k];
      if (c === '#') { pts.push([x + 0.5 - dx * 0.5, y + 0.5 - dy * 0.5]); return { pts, exit: null, wall: k }; }
      const m = c === 'M' ? orient[idx[k]] : null;
      if (m === '/') { pts.push([x + 0.5, y + 0.5]);[dx, dy] = [-dy, -dx]; }
      else if (m === '\\') { pts.push([x + 0.5, y + 0.5]);[dx, dy] = [dy, dx]; }
    }
    return { pts, exit: null };
  }
  function mirrorsSolved(p, orient) { const b = beam(p, orient); return !!(b.exit && b.exit.y === -1 && b.exit.x === p.target); }

  function codeFeedback(code, guess) {
    let b = 0, w = 0; guess.forEach((g, i) => { if (code[i] === g) b++; else if (code.includes(g)) w++; }); return [b, w];
  }
  function codeSolved(p, guess) { return guess.every((g, i) => g === p.code[i]); }

  function rotateRing(r, k) { return r.map((_, i) => r[(((i + k) % 6) + 6) % 6]); }
  function ringSums(rings) { return [0, 1, 2, 3, 4, 5].map(s => rings.reduce((a, r) => a + r[s], 0)); }
  function ringsSolved(p, rings) { return ringSums(rings).every(v => v === p.target); }

  const api = {
    SEASON_START, toISO, fromISO, addDays, dayIndex, mondayOf, roundOf, weekDates,
    RANKS, totalSeals, rankOf, nextRank, sealsInWeek, goldInWeek, weeklyStreak, envelopeRarity,
    routeSolved, CLOCKS, clocksSolved, BALANCE, BALANCE_VALUES, balanceConsistent, balanceSolved,
    shelfClueOk, shelfSolved, beam, mirrorsSolved, codeFeedback, codeSolved,
    rotateRing, ringSums, ringsSolved,
  };
  if (typeof module !== 'undefined') module.exports = api; else root.Logic = api;
})(this);
