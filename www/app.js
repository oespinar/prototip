// PROVA · prototipo 0.1
(function () {
  'use strict';
  const L = window.Logic, P = window.PUZZLE_DATA || PUZZLE_DATA;
  const KEY = 'prova.v1';
  const $app = document.getElementById('app');

  // ---------- Estado ----------
  const defaults = () => ({
    lang: 'es',
    onboarded: false, avatar: null, progress: {}, hintDays: {}, teo: null, envelopes: {},
    wardrobe: [], docs: [], scenesSeen: [], testOffset: 0, testUnlocked: false, lastPlayed: null, welcomedFor: null,
  });
  let S = load();
  function load() { try { return Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return defaults(); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  const T = () => TEXTS[S.lang];
  const today = () => L.addDays(L.toISO(new Date()), S.testOffset);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const fmtDate = iso => { const d = L.fromISO(iso); return d.toLocaleDateString(S.lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' }); };

  let view = { name: 'home' };
  let cleanup = null;
  function go(v) { if (cleanup) { cleanup(); cleanup = null; } view = v; render(); window.scrollTo(0, 0); }

  // ---------- Utilidades de interfaz ----------
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast fade'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
  }
  function haptic() { try { if (navigator.vibrate) navigator.vibrate(25); } catch (e) { } }
  function modal(html, wire) {
    const o = document.createElement('div'); o.className = 'overlay';
    o.innerHTML = `<div class="modal fade">${html}</div>`; document.body.appendChild(o);
    const close = () => o.remove(); wire(o, close); return close;
  }
  function confirmBox(msg, onYes) {
    modal(`<p>${esc(msg)}</p><div class="row"><button class="btn ghost grow" data-n>${T().no}</button><button class="btn grow" data-y>${T().yes}</button></div>`,
      (o, close) => { o.querySelector('[data-n]').onclick = close; o.querySelector('[data-y]').onclick = () => { close(); onYes(); }; });
  }
  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  // ---------- Avatar (SVG) ----------
  const COAT_COLORS = ['#8a5a2b', '#b5502e', '#6b6b3a', '#3a3330'];
  function avatarSVG(a, size = 64) {
    a = a || { sil: 1, coat: 0, color: 0 };
    const c = COAT_COLORS[a.color], w = [26, 32, 38][a.sil];
    const x = 50 - w / 2; const len = [78, 58, 74][a.coat];
    const hood = a.coat === 2 ? `<path d="M34 34 Q50 8 66 34" fill="${c}" />` : '';
    const belt = a.coat === 0 ? `<rect x="${x}" y="56" width="${w}" height="4" fill="rgba(0,0,0,.25)"/>` : '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="#e9dcc3"/>
      <rect x="${x + 4}" y="${len + 4}" width="${w - 8}" height="${92 - len}" fill="#3a3330"/>
      <path d="M${x} 40 Q50 32 ${x + w} 40 L${x + w + 3} ${len + 6} L${x - 3} ${len + 6} Z" fill="${c}"/>
      ${belt}
      <line x1="50" y1="40" x2="50" y2="${len + 4}" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>
      ${hood}<circle cx="50" cy="27" r="11" fill="#d9b48f"/>
    </svg>`;
  }

  // ---------- Sello ----------
  function sealSVG(kind, size = 120) {
    const col = { gold: '#b08a2e', silver: '#9a968c', gray: '#bdb5a6' }[kind] || '#b5502e';
    return `<svg class="sealbig pop" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M60 6 C78 4 92 14 100 24 C112 36 116 52 112 66 C114 84 102 102 84 110 C70 118 50 118 36 110 C18 104 6 86 8 66 C2 48 10 28 26 18 C36 10 48 6 60 6Z" fill="${col}"/>
      <circle cx="60" cy="60" r="34" fill="none" stroke="rgba(255,248,236,.55)" stroke-width="2"/>
      <path d="M52 82 L52 48 L46 48 L60 30 L74 48 L68 48 L68 82 Z" fill="rgba(255,248,236,.8)"/>
      <rect x="44" y="82" width="32" height="5" fill="rgba(255,248,236,.8)"/>
    </svg>`;
  }

  // ---------- Pantallas ----------
  function render() {
    if (!S.onboarded && !['prologue', 'quiz', 'look'].includes(view.name)) view = { name: 'prologue' };
    const screens = { prologue, quiz, look, home, puzzle, result, scene, envelope, notebook, profile };
    (screens[view.name] || home)();
  }

  function prologue() {
    $app.innerHTML = `<div class="topbar"><span class="logo">PROVA</span></div>
      <div class="center fade">${sealSVG('', 110)}</div>
      <div class="card fade"><h2>${T().prologueTitle}</h2><div class="spacer"></div><div class="paper-text">${esc(T().prologue)}</div></div>
      <div class="spacer"></div><button class="btn" id="go">${T().accept}</button>
      <div class="spacer"></div>${langSeg()}`;
    $app.querySelector('#go').onclick = () => go({ name: 'quiz', i: 0, answers: [] });
    wireLang();
  }
  function langSeg() {
    return `<div class="seg"><button data-lang="es" class="${S.lang === 'es' ? 'on' : ''}">Castellano</button><button data-lang="en" class="${S.lang === 'en' ? 'on' : ''}">English</button></div>`;
  }
  function wireLang() { $app.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { S.lang = b.dataset.lang; save(); render(); }); }

  function quiz() {
    const q = T().questions[view.i];
    $app.innerHTML = `<div class="topbar"><span class="logo">PROVA</span><span class="stamp">${view.i + 1} / 3</span></div>
      <h2>${T().avatarTitle}</h2><p class="muted">${T().avatarIntro}</p><div class="spacer"></div>
      <div class="card fade"><h3>${esc(q.q)}</h3><div class="spacer"></div>
      ${q.a.map((a, i) => `<button class="choice" data-i="${i}">${esc(a)}</button>`).join('')}</div>`;
    $app.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const answers = view.answers.concat(+b.dataset.i);
      if (answers.length < 3) go({ name: 'quiz', i: view.i + 1, answers });
      else {
        const keys = ['analitico', 'intuitivo', 'audaz']; const count = [0, 0, 0]; answers.forEach(a => count[a]++);
        const trait = keys[count.indexOf(Math.max(...count))];
        go({ name: 'look', draft: { sil: 1, coat: 0, color: 0, trait } });
      }
    });
  }

  function look() {
    const d = view.draft, t = T();
    const opts = (label, key, list) => `<div class="spacer"></div><div class="small muted">${label}</div>
      <div class="seg">${list.map((n, i) => `<button data-k="${key}" data-v="${i}" class="${d[key] === i ? 'on' : ''}">${esc(n)}</button>`).join('')}</div>`;
    $app.innerHTML = `<div class="topbar"><span class="logo">PROVA</span></div>
      <h2>${t.lookTitle}</h2>
      <div class="center">${avatarSVG(d, 150)}</div>
      <div class="card"><div class="row"><span class="stamp">${t.traits[d.trait]}</span><span class="small muted">${t.traitHelp[d.trait]}</span></div>
      ${opts(t.silhouette, 'sil', ['I', 'II', 'III'])}${opts(t.coat, 'coat', t.coats)}${opts(t.color, 'color', t.colors)}</div>
      <div class="spacer"></div><button class="btn" id="fin">${t.finish}</button>`;
    $app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { d[b.dataset.k] = +b.dataset.v; look(); });
    $app.querySelector('#fin').onclick = () => { S.avatar = d; S.onboarded = true; save(); go({ name: 'home' }); };
  }

  function home() {
    const t = T(), td = today(), dates = L.weekDates(td), round = L.roundOf(td), tIdx = L.dayIndex(td);
    // ¿Hay una semana anterior sin abrir su sobre?
    const prevMon = L.addDays(L.mondayOf(td), -7);
    if (L.sealsInWeek(S.progress, prevMon) > 0 && !S.envelopes[prevMon]) { go({ name: 'envelope', monday: prevMon, closed: true }); return; }
    const total = L.totalSeals(S.progress), rank = L.rankOf(total), next = L.nextRank(total);
    const pct = next ? Math.round(((total - rank.min) / (next.min - rank.min)) * 100) : 100;
    const todayDone = !!S.progress[td];
    const pending = dates.slice(0, tIdx).filter(d => !S.progress[d]).length;
    const away = S.lastPlayed && (L.fromISO(td) - L.fromISO(S.lastPlayed)) / 86400000 >= 8 && S.welcomedFor !== L.mondayOf(td);
    const sundayDone = !!S.progress[dates[6]], envPending = sundayDone && !S.envelopes[dates[0]];

    $app.innerHTML = `<div class="topbar"><span class="logo">PROVA</span><span class="stamp">${t.round} ${round}</span></div>
      ${away ? `<div class="card fade" style="border-color:var(--teja)"><h3>${t.welcomeBack}</h3><p class="small">${t.welcomeBackBody}</p><button class="btn small ghost" id="wb">OK</button></div><div class="spacer"></div>` : ''}
      <div class="card who">${avatarSVG(S.avatar, 58)}<div class="grow">
        <div class="row"><strong>${t.ranks[rank.id]}</strong><span class="small muted grow" style="text-align:right">${total} ${t.totalSeals.toLowerCase()}</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="small muted" style="margin-top:4px">${next ? t.toNext(next.min - total, t.ranks[next.id]) : ''}</div></div></div>
      <div class="week">${dates.map((d, i) => {
        const pr = S.progress[d], future = i > tIdx, isT = i === tIdx;
        return `<div class="daycell ${isT ? 'today' : ''} ${future ? 'locked' : ''} ${i === 6 ? 'sunday' : ''}" data-day="${i}">
          <div class="d">${t.daysShort[i]}</div><div class="n">${L.fromISO(d).getDate()}</div>
          <div class="dot ${pr ? pr.seal : (!future ? 'open' : '')}"></div></div>`;
      }).join('')}</div>
      ${envPending ? `<button class="btn secondary" id="env">✉ ${t.envelope}</button><div class="spacer"></div>` : ''}
      <div class="card">
        <div class="small muted">${t.days[tIdx]} · ${fmtDate(td)}</div>
        <h2 style="margin:4px 0 10px">${esc(t.puzzles[tIdx].title)}</h2>
        ${todayDone
        ? `<div class="row"><span class="stamp" style="color:var(--ok);border-color:var(--ok)">✓ ${t.done}</span><span class="small muted grow" style="text-align:right">${t.nextIn} <span id="cd" class="mono"></span></span></div>`
        : `<button class="btn" id="play">${t.play}</button>`}
        ${pending ? `<p class="small muted" style="margin:10px 0 0">${t.recover}: ${pending}</p>` : ''}
      </div>
      <div class="nav"><button class="btn ghost" id="nb">${t.notebook}</button><button class="btn ghost" id="pf">${t.profile}</button></div>
      <div class="version" id="ver">${t.version}${S.testUnlocked ? '' : ''}</div>
      ${S.testUnlocked ? testPanel() : ''}`;

    const q = s => $app.querySelector(s);
    if (q('#wb')) q('#wb').onclick = () => { S.welcomedFor = L.mondayOf(td); save(); render(); };
    if (q('#play')) q('#play').onclick = () => openDay(tIdx);
    if (q('#env')) q('#env').onclick = () => go({ name: 'envelope', monday: dates[0] });
    $app.querySelectorAll('[data-day]').forEach(el => el.onclick = () => { const i = +el.dataset.day; if (i <= tIdx) openDay(i); });
    q('#nb').onclick = () => go({ name: 'notebook' }); q('#pf').onclick = () => go({ name: 'profile' });
    let taps = 0; q('#ver').onclick = () => { if (++taps >= 5) { S.testUnlocked = !S.testUnlocked; save(); render(); } };
    if (S.testUnlocked) wireTest();
    if (q('#cd')) {
      const tick = () => { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); const s = Math.floor((m - n) / 1000);
        const el = q('#cd'); if (el) el.textContent = `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
      tick(); const id = setInterval(tick, 1000); cleanup = () => clearInterval(id);
    }
  }

  function openDay(i) {
    const date = L.weekDates(today())[i];
    if (S.progress[date]) go({ name: 'scene', dayIdx: i, date });
    else go({ name: 'puzzle', dayIdx: i, date, level: 'medium' });
  }

  function testPanel() {
    const t = T();
    return `<div class="testpanel"><div class="row"><strong>${t.testTitle}</strong><span class="grow"></span><span class="mono small">${t.testToday}: ${today()} (${t.daysShort[L.dayIndex(today())]})</span></div>
      <div class="grid2">
        <button class="btn ghost" data-t="prev">${t.testPrev}</button><button class="btn ghost" data-t="next">${t.testNext}</button>
        <button class="btn ghost" data-t="mon">${t.testMon}</button><button class="btn ghost" data-t="sun">${t.testSun}</button>
        <button class="btn ghost" data-t="week">${t.testNextWeek}</button><button class="btn ghost" data-t="real">${t.testReal}</button>
      </div></div>`;
  }
  function wireTest() {
    $app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      const k = b.dataset.t, i = L.dayIndex(today());
      if (k === 'prev') S.testOffset--; if (k === 'next') S.testOffset++;
      if (k === 'mon') S.testOffset -= i; if (k === 'sun') S.testOffset += 6 - i;
      if (k === 'week') S.testOffset += 7 - i; if (k === 'real') S.testOffset = 0;
      save(); render();
    });
  }

  // ---------- Pantalla de puzle ----------
  function puzzle() {
    const t = T(), i = view.dayIdx, hasLevels = i === 0 || i === 2;
    $app.innerHTML = `<div class="topbar"><button class="back" id="bk">← ${t.back}</button><span class="timer" id="tm">0:00</span></div>
      <div class="small muted">${t.days[i]} · ${t.round} ${L.roundOf(view.date)}</div>
      <h2>${esc(t.puzzles[i].title)}</h2>
      ${hasLevels ? `<div class="levels">${['easy', 'medium', 'hard'].map(l => `<button data-l="${l}" class="${view.level === l ? 'on' : ''}">${t.levels[l]}</button>`).join('')}</div>` : ''}
      <p class="how">${esc(t.puzzles[i].how)}</p>
      <div class="board" id="board"></div>
      <div class="actions"><button class="btn ghost" id="h1"></button><button class="btn ghost" id="h2">▶ ${t.hintAd}</button><button class="btn ghost" id="gu">${t.giveUp}</button></div>`;
    const board = $app.querySelector('#board');
    let hints = 0, solved = false; const t0 = Date.now();
    const finish = (seal) => {
      if (solved) return; solved = true;
      const secs = Math.round((Date.now() - t0) / 1000);
      S.progress[view.date] = { seal, level: view.level, time: secs, hints };
      S.lastPlayed = today(); save(); haptic();
      setTimeout(() => go({ name: 'result', dayIdx: i, date: view.date }), seal === 'gray' ? 1300 : 650);
    };
    const ctx = { level: view.level, solved: () => finish(hints ? 'silver' : 'gold'), wrong: () => { shake(board); toast(t.wrong); } };
    const mod = PUZZLES[i](board, ctx);
    const freeLeft = () => !S.hintDays[today()];
    const h1 = $app.querySelector('#h1');
    const setH1 = () => { h1.textContent = `💡 ${t.hintFree} (${freeLeft() ? 1 : 0})`; h1.disabled = !freeLeft(); };
    setH1();
    const useHint = () => { if (solved) return; hints++; if (!mod.hint()) { hints--; toast('—'); } };
    h1.onclick = () => { if (!freeLeft()) { toast(t.noHints); return; } S.hintDays[today()] = 1; save(); setH1(); useHint(); };
    $app.querySelector('#h2').onclick = () => {
      let n = 3;
      const close = modal(`<h3>${t.adTitle}</h3><div class="adbox" id="ad">${n}</div><p class="small muted">${t.adBody}</p>`, () => { });
      const id = setInterval(() => { n--; const el = document.getElementById('ad'); if (el) el.textContent = n; if (n <= 0) { clearInterval(id); close(); useHint(); } }, 1000);
    };
    $app.querySelector('#gu').onclick = () => confirmBox(t.giveUpConfirm, () => { finish('gray'); mod.reveal(); });
    $app.querySelector('#bk').onclick = () => go({ name: 'home' });
    $app.querySelectorAll('[data-l]').forEach(b => b.onclick = () => go(Object.assign({}, view, { level: b.dataset.l })));
    const tm = $app.querySelector('#tm');
    const id = setInterval(() => { if (!solved) tm.textContent = fmtTime(Math.round((Date.now() - t0) / 1000)); }, 1000);
    cleanup = () => { clearInterval(id); if (mod.destroy) mod.destroy(); };
  }

  // ---------- Resultado ----------
  function result() {
    const t = T(), pr = S.progress[view.date], i = view.dayIdx;
    $app.innerHTML = `<div class="topbar"><span class="logo">PROVA</span><span class="stamp">${t.days[i]}</span></div>
      <div class="center">${sealSVG(pr.seal, 140)}<h2>${t.seal[pr.seal]}</h2><p class="muted">${t.sealHelp[pr.seal]} · ${t.time} <span class="mono">${fmtTime(pr.time)}</span></p></div>
      <div class="spacer"></div><button class="btn secondary" id="sh">↗ ${t.share}</button><button class="btn" id="ct">${t.cont}</button>`;
    $app.querySelector('#sh').onclick = () => {
      const g = { gold: '🟫', silver: '⬜', gray: '▫️' };
      const row = L.weekDates(view.date).map(d => S.progress[d] ? g[S.progress[d].seal] : '·').join('');
      const text = `${t.shareHead(L.roundOf(view.date), i + 1)}\n${row}\n⏱ ${fmtTime(pr.time)}`;
      const copy = () => { try { navigator.clipboard.writeText(text).then(() => toast(t.copied), () => toast(text)); } catch (e) { toast(text); } };
      if (navigator.share) navigator.share({ text }).catch(err => { if (!err || err.name !== 'AbortError') copy(); });
      else copy();
    };
    $app.querySelector('#ct').onclick = () => go({ name: 'scene', dayIdx: i, date: view.date });
  }

  // ---------- Escena ----------
  function scene() {
    const t = T(), i = view.dayIdx;
    if (!S.scenesSeen.includes(i)) { S.scenesSeen.push(i); save(); }
    let text = t.scenes[i];
    if (i === 0 && S.avatar) text += '\n\n' + t.traitLine[S.avatar.trait];
    if (i === 6 && S.teo !== null) text = t.teoSunday[S.teo] + '\n\n' + text;
    const teoAsk = i === 5 && S.teo === null;
    const teoDone = i === 5 && S.teo !== null;
    $app.innerHTML = `<div class="topbar"><button class="back" id="bk">← ${t.back}</button><span class="stamp">${t.days[i]}</span></div>
      <div class="card fade"><div class="paper-text">${esc(text)}</div>
      ${teoDone ? `<div class="spacer"></div><div class="paper-text muted">${esc(t.teoAfter[S.teo])}</div>` : ''}</div>
      <div class="spacer"></div>
      ${teoAsk ? t.teoChoice.map((c, k) => `<button class="choice" data-teo="${k}">${esc(c)}</button>`).join('') : `<button class="btn" id="ct">${t.cont}</button>`}`;
    $app.querySelector('#bk').onclick = () => go({ name: 'home' });
    $app.querySelectorAll('[data-teo]').forEach(b => b.onclick = () => { S.teo = +b.dataset.teo; save(); scene(); });
    const ct = $app.querySelector('#ct');
    if (ct) ct.onclick = () => {
      const mon = L.mondayOf(view.date);
      if (i === 6 && !S.envelopes[mon]) go({ name: 'envelope', monday: mon }); else go({ name: 'home' });
    };
  }

  // ---------- Sobre lacrado ----------
  function envelope() {
    const t = T(), mon = view.monday, n = L.sealsInWeek(S.progress, mon), e = S.envelopes[mon];
    if (!e) {
      $app.innerHTML = `<div class="topbar"><span class="logo">PROVA</span><span class="stamp">${view.closed ? t.weekClosed : t.round + ' ' + L.roundOf(mon)}</span></div>
        <div class="center fade"><h2>${t.envelope}</h2><p class="muted">${t.round} ${L.roundOf(mon)} · ${t.sealsThisWeek(n)}${n === 7 ? ' · ' + t.perfect : ''}</p>
        <svg width="220" height="160" viewBox="0 0 220 160" aria-hidden="true"><rect x="10" y="20" width="200" height="130" rx="6" fill="#e2cfa9" stroke="#b79e74"/>
        <path d="M10 26 L110 96 L210 26" fill="none" stroke="#b79e74" stroke-width="2"/></svg>
        <div style="margin-top:-118px">${sealSVG('', 84)}</div><div class="spacer-l"></div></div>
        <button class="btn" id="op">${t.openEnvelope}</button>`;
      $app.querySelector('#op').onclick = () => {
        const rarity = L.envelopeRarity(n, Math.random);
        const item = rarity === 'raro' ? 'gabardina' : 'bufanda';
        S.envelopes[mon] = { rarity, item, seals: n };
        if (!S.wardrobe.includes(item)) S.wardrobe.push(item);
        if (!S.docs.includes('doc1')) S.docs.push('doc1');
        save(); haptic(); envelope();
      };
      return;
    }
    $app.innerHTML = `<div class="topbar"><span class="logo">PROVA</span><span class="stamp">${t.envelope}</span></div>
      <div class="doc fade"><div class="small mono muted">${esc(t.doc1Title)}</div><div class="spacer"></div>${esc(t.doc1Body)}</div>
      <div class="item fade">${avatarSVG(S.avatar, 44)}<div class="grow">${esc(t.items[e.item])}</div><span class="tag ${e.rarity === 'raro' ? 'rare' : ''}">${e.rarity === 'raro' ? t.rare : t.common}</span></div>
      <div class="spacer"></div><button class="btn" id="ct">${t.cont}</button>`;
    $app.querySelector('#ct').onclick = () => go({ name: 'home' });
  }

  // ---------- Cuaderno ----------
  function notebook() {
    const t = T();
    const sc = S.scenesSeen.slice().sort();
    $app.innerHTML = `<div class="topbar"><button class="back" id="bk">← ${t.back}</button><span class="stamp">${t.notebook}</span></div>
      <h3>${t.documents}</h3><div class="spacer"></div>
      ${S.docs.length ? `<div class="doc"><div class="small mono muted">${esc(t.doc1Title)}</div><div class="spacer"></div>${esc(t.doc1Body)}</div>` : `<p class="muted">${t.empty}</p>`}
      <div class="spacer-l"></div><h3>${t.scenes}</h3><div class="spacer"></div>
      ${sc.length ? sc.map(i => `<div class="card"><details><summary>${t.days[i]} · ${esc(t.puzzles[i].title)}</summary><div class="paper-text" style="font-size:16px">${esc(t.scenes[i])}</div></details></div>`).join('') : `<p class="muted">${t.empty}</p>`}`;
    $app.querySelector('#bk').onclick = () => go({ name: 'home' });
  }

  // ---------- Ficha ----------
  function profile() {
    const t = T(), total = L.totalSeals(S.progress), rank = L.rankOf(total), a = S.avatar;
    $app.innerHTML = `<div class="topbar"><button class="back" id="bk">← ${t.back}</button><span class="stamp">${t.profile}</span></div>
      <div class="center">${avatarSVG(a, 140)}</div>
      <div class="card"><div class="row"><span class="stamp">${t.traits[a.trait]}</span><span class="small muted">${t.traitHelp[a.trait]}</span></div>
      <div class="spacer"></div>
      <div class="row"><span class="grow">${t.rank}</span><strong>${t.ranks[rank.id]}</strong></div>
      <div class="row"><span class="grow">${t.totalSeals}</span><strong>${total}</strong></div>
      <div class="row"><span class="grow">${t.streak}<br><span class="small muted">${t.streakHelp}</span></span><strong>${L.weeklyStreak(S.progress, today())}</strong></div></div>
      <div class="card"><h3>${t.wardrobe}</h3>${S.wardrobe.length ? S.wardrobe.map(w => `<div class="item">${esc(t.items[w])}</div>`).join('') : `<p class="muted small">${t.empty}</p>`}</div>
      <div class="card"><div class="small muted">${t.language}</div>${langSeg()}</div>
      <div class="spacer"></div><button class="btn ghost" id="rs">${t.reset}</button>
      <p class="small muted center">${t.testUnlock}</p>`;
    $app.querySelector('#bk').onclick = () => go({ name: 'home' });
    $app.querySelector('#rs').onclick = () => confirmBox(t.resetConfirm, () => { const lang = S.lang; S = defaults(); S.lang = lang; save(); go({ name: 'prologue' }); });
    wireLang();
  }

  // =====================================================================
  // PUZLES. Cada uno recibe (board, ctx) y devuelve { hint(), reveal(), destroy? }.
  // hint() devuelve true si ha dado una pista nueva.
  // =====================================================================
  const GLYPH = ['●', '▲', '■', '◆', '★', '✚'];

  // 1 · Lunes: el plano (recorrido único)
  function puzzleRoute(board, ctx) {
    const p = P.route[ctx.level], n = p.n, free = n * n - p.blocks.length;
    let path = [p.start], ghost = 0, drag = false;
    board.innerHTML = `<div class="rgrid" style="grid-template-columns:repeat(${n},1fr);width:min(100%,${n * 64}px);margin:0 auto">
      ${[...Array(n * n)].map((_, k) => `<div class="rcell ${p.blocks.includes(k) ? 'block' : ''}" data-k="${k}">
        ${k === p.start ? '<span class="mark">●</span>' : k === p.end ? '<span class="mark">⚑</span>' : ''}</div>`).join('')}
      <svg class="rsvg" viewBox="0 0 ${n} ${n}" preserveAspectRatio="none"><polyline id="pl" fill="none" stroke="#8a5a2b" stroke-width="0.16" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
    const grid = board.querySelector('.rgrid'), cells = [...board.querySelectorAll('.rcell')], pl = board.querySelector('#pl');
    const adj = (a, b) => Math.abs(a % n - b % n) + Math.abs(((a / n) | 0) - ((b / n) | 0)) === 1;
    function draw() {
      cells.forEach((c, k) => { c.classList.toggle('on', path.includes(k)); c.classList.toggle('ghost', ghost > 0 && p.solution.slice(0, Math.ceil(free * ghost / 3)).includes(k) && !path.includes(k)); });
      pl.setAttribute('points', path.map(k => `${k % n + 0.5},${((k / n) | 0) + 0.5}`).join(' '));
      if (L.routeSolved(p, path)) ctx.solved();
    }
    function touch(k, isDown) {
      if (k == null || p.blocks.includes(k)) return;
      const idx = path.indexOf(k);
      if (isDown && idx >= 0) { path = path.slice(0, idx + 1); return draw(); }
      if (idx >= 0 && idx === path.length - 2) { path.pop(); return draw(); }
      if (path.length === 0) { path = [p.start]; }
      const last = path[path.length - 1];
      if (idx < 0 && last !== p.end && adj(last, k)) { path.push(k); draw(); }
    }
    const cellAt = e => { const el = document.elementFromPoint(e.clientX, e.clientY); const c = el && el.closest('.rcell'); return c ? +c.dataset.k : null; };
    grid.addEventListener('pointerdown', e => { drag = true; grid.setPointerCapture(e.pointerId); touch(cellAt(e), true); });
    grid.addEventListener('pointermove', e => { if (drag) touch(cellAt(e), false); });
    grid.addEventListener('pointerup', () => drag = false); grid.addEventListener('pointercancel', () => drag = false);
    draw();
    return { hint() { if (ghost >= 2) return false; ghost++; draw(); return true; }, reveal() { path = p.solution.slice(); draw(); } };
  }

  // 2 · Martes: relojes parados (secuencia)
  function puzzleClocks(board, ctx) {
    let sel = null, hintN = 0;
    const clock = (cx, cy, r, h, extra = '') => {
      const a = (h % 12) * 30 * Math.PI / 180;
      const hand = h == null ? '' : `<line x1="${cx}" y1="${cy}" x2="${cx + Math.sin(a) * r * 0.55}" y2="${cy - Math.cos(a) * r * 0.55}" stroke="#2b2118" stroke-width="${r * 0.09}" stroke-linecap="round"/>`;
      const ticks = [...Array(12)].map((_, i) => { const b = i * 30 * Math.PI / 180; return `<circle cx="${cx + Math.sin(b) * r * 0.82}" cy="${cy - Math.cos(b) * r * 0.82}" r="${i % 3 ? r * 0.03 : r * 0.06}" fill="#5a4a3a"/>`; }).join('');
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fbf6ea" stroke="#2b2118" stroke-width="${r * 0.06}"/>${ticks}
        <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - r * 0.78}" stroke="#8a7a66" stroke-width="${r * 0.04}" stroke-linecap="round"/>${hand}<circle cx="${cx}" cy="${cy}" r="${r * 0.06}" fill="#2b2118"/>${extra}`;
    };
    function draw() {
      const sh = L.CLOCKS.shown, diffs = ['+1', '+2', '+3', '+4'];
      let small = sh.map((h, i) => clock(40 + i * 80, 45, 32, h)).join('');
      if (hintN >= 1) small += diffs.slice(0, 3).map((d, i) => `<text x="${80 + i * 80}" y="102" text-anchor="middle" font-size="15" fill="#b5502e">${d}</text>`).join('');
      if (hintN >= 2) small += `<text x="160" y="124" text-anchor="middle" font-size="15" fill="#b5502e">… +4 ?</text>`;
      const R = 100, cx = 160, cy = 250;
      const taps = [...Array(12)].map((_, i) => { const b = i * 30 * Math.PI / 180; const h = i === 0 ? 12 : i;
        return `<g data-h="${h}" style="cursor:pointer"><circle cx="${cx + Math.sin(b) * R * 0.82}" cy="${cy - Math.cos(b) * R * 0.82}" r="15" fill="${sel === h ? '#b5502e' : 'transparent'}" opacity=".35"/>
        <text x="${cx + Math.sin(b) * R * 0.82}" y="${cy - Math.cos(b) * R * 0.82 + 5}" text-anchor="middle" font-size="15" fill="#2b2118">${h}</text></g>`; }).join('');
      board.innerHTML = `<svg viewBox="0 0 320 370" width="100%" style="max-width:380px;display:block;margin:0 auto">${small}
        <text x="160" y="140" text-anchor="middle" font-size="22" fill="#8a7a66">↓</text>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="#fbf6ea" stroke="#2b2118" stroke-width="5"/>
        ${sel ? `<line x1="${cx}" y1="${cy}" x2="${cx + Math.sin(sel * Math.PI / 6) * 50}" y2="${cy - Math.cos(sel * Math.PI / 6) * 50}" stroke="#2b2118" stroke-width="8" stroke-linecap="round"/>` : `<text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="30" fill="#8a7a66">?</text>`}
        <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 70}" stroke="#8a7a66" stroke-width="4" stroke-linecap="round"/>
        ${taps}</svg>
        <button class="btn" id="ck" ${sel ? '' : 'disabled'}>${T().check}</button>`;
      board.querySelectorAll('[data-h]').forEach(g => g.onclick = () => { sel = +g.dataset.h; draw(); });
      board.querySelector('#ck').onclick = () => { if (L.clocksSolved(sel % 12 === 0 ? 12 : sel)) ctx.solved(); else ctx.wrong(); };
    }
    draw();
    return { hint() { if (hintN >= 2) return false; hintN++; draw(); return true; }, reveal() { sel = L.CLOCKS.answer; draw(); } };
  }

  // 3 · Miércoles: la balanza
  const SHAPE = {
    tri: (x, y, s) => `<path d="M${x} ${y - s * .6} L${x + s * .6} ${y + s * .45} L${x - s * .6} ${y + s * .45}Z" fill="#b5502e"/>`,
    sq: (x, y, s) => `<rect x="${x - s * .5}" y="${y - s * .5}" width="${s}" height="${s}" rx="2" fill="#2f5d62"/>`,
    circ: (x, y, s) => `<circle cx="${x}" cy="${y}" r="${s * .52}" fill="#6b6b3a"/>`,
    dia: (x, y, s) => `<path d="M${x} ${y - s * .65} L${x + s * .55} ${y} L${x} ${y + s * .65} L${x - s * .55} ${y}Z" fill="#c08a2e"/>`,
  };
  const BAL_HINTS = {
    easy: ['■■ = ▲▲▲ + ▲▲▲'],
    medium: ['■ = ▲▲', '● = ■ + ▲ = ▲▲▲'],
    hard: ['● = ▲▲', '◆ = ● + ■ → ◆◆ = ●● + ■■'],
  };
  function puzzleBalance(board, ctx) {
    const b = L.BALANCE[ctx.level]; let val = 1, hintN = 0;
    const pan = (items, cx, y) => { const s = 22, gap = 26, w = (items.length - 1) * gap; return items.map((it, i) => SHAPE[it](cx - w / 2 + i * gap, y - 14, s)).join(''); };
    const scale = (l, r, y, q) => `<g>
      <line x1="160" y1="${y - 40}" x2="160" y2="${y + 32}" stroke="#5a4a3a" stroke-width="4"/>
      <path d="M140 ${y + 34} L180 ${y + 34} L170 ${y + 26} L150 ${y + 26}Z" fill="#5a4a3a"/>
      <line x1="40" y1="${y - 40}" x2="280" y2="${y - 40}" stroke="#2b2118" stroke-width="4"/>
      <line x1="60" y1="${y - 40}" x2="60" y2="${y - 6}" stroke="#8a7a66"/><line x1="260" y1="${y - 40}" x2="260" y2="${y - 6}" stroke="#8a7a66"/>
      <path d="M10 ${y - 6} Q60 ${y + 14} 110 ${y - 6}" fill="#e2cfa9" stroke="#8a7a66"/><path d="M210 ${y - 6} Q260 ${y + 14} 310 ${y - 6}" fill="#e2cfa9" stroke="#8a7a66"/>
      ${pan(l, 60, y)}${q ? `<text x="260" y="${y - 12}" text-anchor="middle" font-size="22" fill="#2b2118">? × </text>${SHAPE.tri(292, y - 20, 18)}` : pan(r, 260, y)}</g>`;
    function draw() {
      const H = 100 * (b.scales.length + 1) + 10;
      board.innerHTML = `<svg viewBox="0 0 320 ${H}" width="100%" style="max-width:380px;display:block;margin:0 auto">
        ${b.scales.map(([l, r], i) => scale(l, r, 70 + i * 100)).join('')}
        <line x1="20" y1="${b.scales.length * 100 + 22}" x2="300" y2="${b.scales.length * 100 + 22}" stroke="#8a7a66" stroke-dasharray="4 4"/>
        ${scale(b.question, null, 70 + b.scales.length * 100, true)}</svg>
        ${hintN ? `<div class="card small mono center" style="margin-top:6px">${BAL_HINTS[ctx.level].slice(0, hintN).join('<br>')}</div>` : ''}
        <div class="stepper"><button id="mn">−</button><span class="val">${val}</span><button id="pl">+</button></div>
        <button class="btn" id="ck">${T().check}</button>`;
      board.querySelector('#mn').onclick = () => { val = Math.max(1, val - 1); draw(); };
      board.querySelector('#pl').onclick = () => { val = Math.min(15, val + 1); draw(); };
      board.querySelector('#ck').onclick = () => { if (L.balanceSolved(ctx.level, val)) ctx.solved(); else ctx.wrong(); };
    }
    draw();
    return { hint() { if (hintN >= BAL_HINTS[ctx.level].length) return false; hintN++; draw(); return true; }, reveal() { val = b.answer; draw(); } };
  }

  // 4 · Jueves: la estantería
  const BOOK = [{ c: '#b5502e', g: '●' }, { c: '#6b6b3a', g: '▲' }, { c: '#2f5d62', g: '■' }, { c: '#c08a2e', g: '◆' }, { c: '#3a3330', g: '★' }];
  function puzzleShelf(board, ctx) {
    const p = P.shelf; let order = [0, 1, 2, 3, 4], sel = null; const locked = new Set();
    const chip = i => `<span class="chip" style="background:${BOOK[i].c}">${BOOK[i].g}</span>`;
    const clueHTML = c => {
      if (c.t === 'adj') return `<span class="joined">${chip(c.a)}${chip(c.b)}</span>`;
      if (c.t === 'left') return `${chip(c.a)}<span class="sep">· · ·</span>${chip(c.b)}`;
      if (c.t === 'far') return `${chip(c.a)}<span class="sep" style="color:#b5502e">✕</span>${chip(c.b)}`;
      if (c.t === 'pos') return [0, 1, 2, 3, 4].map(k => k === c.k ? chip(c.a) : '<span class="slot"></span>').join('');
    };
    function draw() {
      board.innerHTML = `<div class="clues">${p.clues.map(c => `<div class="clue ${L.shelfClueOk(c, order) ? 'sat' : ''}">${clueHTML(c)}<span class="ok">✓</span></div>`).join('')}</div>
        <div class="shelf">${order.map((b, k) => `<div class="book ${sel === k ? 'sel' : ''} ${locked.has(k) ? 'lock' : ''}" data-k="${k}" style="background:${BOOK[b].c}"><span class="bar2"></span><span>${BOOK[b].g}</span><span class="bar2"></span></div>`).join('')}</div>
        <p class="small muted center" style="margin-top:10px">${esc(T().shelfLegend)}</p>`;
      board.querySelectorAll('[data-k]').forEach(el => el.onclick = () => {
        const k = +el.dataset.k; if (locked.has(k)) return;
        if (sel === null) sel = k; else if (sel === k) sel = null;
        else { [order[sel], order[k]] = [order[k], order[sel]]; sel = null; }
        draw(); if (L.shelfSolved(p, order)) ctx.solved();
      });
    }
    draw();
    return {
      hint() {
        if (locked.size >= 3) return false;
        const k = order.findIndex((b, i) => b !== p.solution[i] && !locked.has(i)); if (k < 0) return false;
        const j = order.indexOf(p.solution[k]);[order[k], order[j]] = [order[j], order[k]]; locked.add(k); sel = null; draw();
        if (L.shelfSolved(p, order)) ctx.solved(); return true;
      },
      reveal() { order = p.solution.slice(); draw(); },
    };
  }

  // 5 · Viernes: espejos
  function puzzleMirrors(board, ctx) {
    const p = P.mirrors, n = p.n; let orient = p.start.slice(); const locked = new Set();
    const mIdx = []; for (let k = 0; k < p.grid.length; k++) if (p.grid[k] === 'M') mIdx.push(k);
    function draw() {
      const bm = L.beam(p, orient), ok = L.mirrorsSolved(p, orient);
      let cells = '';
      for (let k = 0; k < n * n; k++) {
        const x = k % n, y = (k / n) | 0, c = p.grid[k];
        cells += `<rect x="${x + .04}" y="${y + .04}" width=".92" height=".92" rx=".08" fill="${c === '#' ? '#3a3330' : '#f8f1e3'}" stroke="rgba(43,33,24,.16)" stroke-width=".02"/>`;
        if (c === 'M') {
          const i = mIdx.indexOf(k), o = orient[i];
          const [x1, y1, x2, y2] = o === '/' ? [x + .18, y + .82, x + .82, y + .18] : [x + .18, y + .18, x + .82, y + .82];
          cells += `<g data-m="${i}" style="cursor:pointer"><rect x="${x}" y="${y}" width="1" height="1" fill="transparent"/>
            <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${locked.has(i) ? '#b08a2e' : '#2f5d62'}" stroke-width=".12" stroke-linecap="round"/></g>`;
        }
      }
      const pts = bm.pts.map(([a, b]) => `${a},${b}`).join(' ');
      board.innerHTML = `<svg viewBox="-1.1 -1.4 ${n + 1.6} ${n + 1.8}" width="100%" style="max-width:380px;display:block;margin:0 auto">
        ${cells}
        <path d="M${-0.95} ${p.source + .3} L${-0.55} ${p.source + .5} L${-0.95} ${p.source + .7}Z" fill="#c08a2e"/>
        <g transform="translate(${p.target + .5} -0.75)"><path d="M-.18 .35 L-.18 -.2 L-.3 -.2 L0 -.55 L.3 -.2 L.18 -.2 L.18 .35Z" fill="${ok ? '#c08a2e' : '#5a4a3a'}"/></g>
        <polyline points="${pts}" pointer-events="none" fill="none" stroke="#e0a537" stroke-width=".09" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
      </svg>`;
      board.querySelectorAll('[data-m]').forEach(g => g.onclick = () => { const i = +g.dataset.m; if (locked.has(i)) return; orient[i] = orient[i] === '/' ? '\\' : '/'; draw(); if (L.mirrorsSolved(p, orient)) ctx.solved(); });
    }
    draw();
    return {
      hint() { const i = orient.findIndex((o, k) => o !== p.solution[k] && !locked.has(k)); if (i < 0 || locked.size >= 3) return false; orient[i] = p.solution[i]; locked.add(i); draw(); if (L.mirrorsSolved(p, orient)) ctx.solved(); return true; },
      reveal() { orient = p.solution.slice(); draw(); },
    };
  }

  // 6 · Sábado: la combinación
  const SYM_COL = ['#b5502e', '#6b6b3a', '#2f5d62', '#c08a2e', '#3a3330', '#8a5a2b'];
  const sym = (i, big) => i == null ? '' : `<span style="color:${SYM_COL[i]};font-size:${big ? 30 : 20}px">${GLYPH[i]}</span>`;
  function puzzleCode(board, ctx) {
    const p = P.code; let guess = [null, null, null]; const locked = new Set(); const tries = [];
    const pegs = (b, w) => `<span class="pegs">${'<i class="peg b"></i>'.repeat(b)}${'<i class="peg"></i>'.repeat(w)}${!b && !w ? '<span class="small muted">—</span>' : ''}</span>`;
    function draw() {
      board.innerHTML = `${p.rows.map(r => `<div class="coderow">${r.guess.map(g => `<span class="sym">${sym(g)}</span>`).join('')}${pegs(r.black, r.white)}</div>`).join('')}
        ${tries.map(r => `<div class="coderow" style="opacity:.7">${r.guess.map(g => `<span class="sym">${sym(g)}</span>`).join('')}${pegs(r.b, r.w)}</div>`).join('')}
        <div class="inputrow">${guess.map((g, k) => `<span class="sym input ${locked.has(k) ? 'lock' : ''}" data-k="${k}">${sym(g, true)}</span>`).join('')}</div>
        <button class="btn" id="ck" ${guess.includes(null) ? 'disabled' : ''}>${T().check}</button>`;
      board.querySelectorAll('[data-k]').forEach(el => el.onclick = () => { const k = +el.dataset.k; if (locked.has(k)) return; guess[k] = guess[k] == null ? 0 : (guess[k] + 1) % 6; draw(); });
      board.querySelector('#ck').onclick = () => {
        if (L.codeSolved(p, guess)) return ctx.solved();
        const [b, w] = L.codeFeedback(p.code, guess); tries.push({ guess: guess.slice(), b, w }); ctx.wrong(); draw();
      };
    }
    draw();
    return {
      hint() { if (locked.size >= 2) return false; const k = [0, 1, 2].find(i => !locked.has(i) && guess[i] !== p.code[i]) ?? [0, 1, 2].find(i => !locked.has(i)); guess[k] = p.code[k]; locked.add(k); draw(); return true; },
      reveal() { guess = p.code.slice(); draw(); },
    };
  }

  // 7 · Domingo: los tres diales
  function puzzleRings(board, ctx) {
    const p = P.rings; const turns = [0, 0, 0, 0]; const locked = new Set([0]); let anim = -1;
    const cur = () => p.rings.map((r, i) => L.rotateRing(r, turns[i]));
    const RAD = [[46, 74], [74, 102], [102, 130], [130, 158]];
    function draw() {
      const rs = cur(), sums = L.ringSums(rs), ok = L.ringsSolved(p, rs);
      let g = '';
      rs.forEach((ring, ri) => {
        const [r0, r1] = RAD[ri], fill = ri === 0 ? '#d9c6a3' : (locked.has(ri) ? '#ecd9a8' : ['#f8f1e3', '#f1e6d0', '#e9dcc3', '#e2d3b6'][ri]);
        let seg = `<circle r="${(r0 + r1) / 2}" fill="none" stroke="${fill}" stroke-width="${r1 - r0}"/><circle r="${r1}" fill="none" stroke="#8a7a66" stroke-width="1"/>`;
        ring.forEach((v, s) => { const a = s * Math.PI / 3, rm = (r0 + r1) / 2; seg += `<text x="${Math.sin(a) * rm}" y="${-Math.cos(a) * rm + 7}" text-anchor="middle" font-size="19" fill="#2b2118">${v}</text>`; });
        g += `<g data-r="${ri}" style="transform-origin:0 0;${anim === ri ? 'transform:rotate(60deg)' : ''};transition:transform .25s">${seg}</g>`;
      });
      let spokes = '';
      for (let s = 0; s < 6; s++) { const a = s * Math.PI / 3 + Math.PI / 6; spokes += `<line x1="${Math.sin(a) * 46}" y1="${-Math.cos(a) * 46}" x2="${Math.sin(a) * 158}" y2="${-Math.cos(a) * 158}" stroke="#8a7a66" stroke-width="1"/>`; }
      const sumTxt = sums.map((v, s) => { const a = s * Math.PI / 3; return `<text x="${Math.sin(a) * 178}" y="${-Math.cos(a) * 178 + 6}" text-anchor="middle" font-size="16" font-weight="700" fill="${v === p.target ? '#4f7a3a' : '#b5502e'}">${v}</text>`; }).join('');
      board.innerHTML = `<svg id="rs" viewBox="-200 -200 400 400" width="100%" style="max-width:380px;display:block;margin:0 auto">
        ${g}${spokes}<circle r="46" fill="${ok ? '#4f7a3a' : '#2b2118'}"/><text y="-6" text-anchor="middle" font-size="13" fill="#e9dcc3">Σ</text>
        <text y="20" text-anchor="middle" font-size="28" fill="#f2e8d5">${p.target}</text>${sumTxt}</svg>`;
      if (anim >= 0) { const el = board.querySelector(`[data-r="${anim}"]`); anim = -1; requestAnimationFrame(() => requestAnimationFrame(() => { if (el) el.style.transform = 'rotate(0deg)'; })); }
      board.querySelector('#rs').onclick = e => {
        const svg = e.currentTarget, rc = svg.getBoundingClientRect();
        const x = (e.clientX - rc.left) / rc.width * 400 - 200, y = (e.clientY - rc.top) / rc.height * 400 - 200, d = Math.hypot(x, y);
        const ri = RAD.findIndex(([a, b]) => d >= a && d < b);
        if (ri <= 0 || locked.has(ri)) return;
        turns[ri] = (turns[ri] + 1) % 6; anim = ri; draw();
        if (L.ringsSolved(p, cur())) ctx.solved();
      };
    }
    draw();
    return {
      hint() { const ri = [1, 2, 3].find(i => !locked.has(i) && turns[i] !== p.solutionTurns[i]); if (ri == null || locked.size >= 3) return false; turns[ri] = p.solutionTurns[ri]; locked.add(ri); draw(); if (L.ringsSolved(p, cur())) ctx.solved(); return true; },
      reveal() { [1, 2, 3].forEach(i => turns[i] = p.solutionTurns[i]); draw(); },
    };
  }

  const PUZZLES = [puzzleRoute, puzzleClocks, puzzleBalance, puzzleShelf, puzzleMirrors, puzzleCode, puzzleRings];

  // ---------- Arranque ----------
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && view.name === 'home') render(); });
})();
