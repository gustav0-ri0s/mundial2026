// ── Render de tarjeta de partido ───────────────────────────────────────────
function renderMatchCard(match) {
  const h = getTeamName(match.homeTeam);
  const a = getTeamName(match.awayTeam);
  const hDisplay = getDisplayName(h);
  const aDisplay = getDisplayName(a);
  const hf = getFlagHTML(match.homeTeam);
  const af = getFlagHTML(match.awayTeam);
  const isTBD    = h === 'Por definir' || a === 'Por definir';
  const finished = match.status === 'FINISHED';
  const inPlay   = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const winner   = match.score && match.score.winner;
  const hs       = match.score && match.score.fullTime && match.score.fullTime.home;
  const as_      = match.score && match.score.fullTime && match.score.fullTime.away;

  // Estado de la predicción del usuario actual
  const pred = State.userPredictions[match.id] || null;
  let predStatus = null;
  if (pred) {
    const result = getMatchResult(match);
    predStatus = result === null ? 'pending' : (pred === result ? 'correct' : 'wrong');
  }

  let cardClass = 'match-card';
  if (isTBD)                    cardClass += ' tbd';
  if (finished)                 cardClass += ' finished-match';
  if (predStatus === 'correct') cardClass += ' correct';
  else if (predStatus === 'wrong') cardClass += ' wrong';
  else if (pred)                cardClass += ' has-prediction';

  const date    = new Date(match.utcDate);
  const tz      = 'America/Lima'; // GMT-5, Perú — sin horario de verano
  const dayStr  = date.toLocaleDateString('es-PE',  { day: '2-digit', month: 'short', timeZone: tz });
  const timeStr = date.toLocaleTimeString('es-PE',  { hour: '2-digit', minute: '2-digit', timeZone: tz });
  const dateStr = `${dayStr} · ${timeStr}`;

  let timeLabel = dateStr;
  if (finished) timeLabel = '⚽ FINALIZADO';
  else if (inPlay) timeLabel = '🔴 EN VIVO';

  let badgeHTML = '';
  if (!isTBD) {
    const predFlag = getFlagHTMLByName(pred);
    if (predStatus === 'correct') {
      badgeHTML = `<div class="pred-badge correct">✓ ¡Acertaste! ${predFlag} ${getDisplayName(pred)}</div>`;
    } else if (predStatus === 'wrong') {
      badgeHTML = `<div class="pred-badge wrong">✗ Dijiste ${predFlag} ${getDisplayName(pred)}</div>`;
    } else if (pred) {
      badgeHTML = `<div class="pred-badge pending">⏳ ${predFlag} ${getDisplayName(pred)}</div>`;
    } else if (!finished && State.currentUser) {
      badgeHTML = `<div class="pred-badge open">toca para predecir</div>`;
    }
  }

  const clickable = !isTBD && !finished && State.currentUser;
  const clickAttr = clickable ? `onclick="openModal(${match.id})"` : '';

  const hWinner = winner === 'HOME_TEAM';
  const aWinner = winner === 'AWAY_TEAM';

  return `<div class="${cardClass}" ${clickAttr} data-match="${match.id}">
    <div class="match-time${inPlay ? ' live' : ''}">${timeLabel}</div>
    <div class="team-row${hWinner ? ' winner' : ''}">
      <span class="flag">${hf}</span>
      <span class="team-name${hWinner ? ' winner-name' : ''}">${hDisplay}</span>
      <span class="team-score${hWinner ? ' winner-score' : ''}">${hs !== null && hs !== undefined ? hs : ''}</span>
    </div>
    <div class="divider"></div>
    <div class="team-row${aWinner ? ' winner' : ''}">
      <span class="flag">${af}</span>
      <span class="team-name${aWinner ? ' winner-name' : ''}">${aDisplay}</span>
      <span class="team-score${aWinner ? ' winner-score' : ''}">${as_ !== null && as_ !== undefined ? as_ : ''}</span>
    </div>
    ${badgeHTML}
  </div>`;
}

// ── Líneas SVG de conexión entre rondas ───────────────────────────────────
function drawConnectors() {
  ROUND_ORDER.slice(0, -1).forEach((round, ri) => {
    const nextRound = ROUND_ORDER[ri + 1];
    const connCol = document.getElementById('conn-' + round);
    const srcCol  = document.getElementById('round-' + round);
    const dstCol  = document.getElementById('round-' + nextRound);
    if (!connCol || !srcCol || !dstCol) return;

    connCol.style.position = 'relative';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;pointer-events:none';
    connCol.appendChild(svg);

    const line = (x1, y1, x2, y2) => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M${x1},${y1} L${x2},${y2}`);
      p.setAttribute('stroke', '#1e2d4a');
      p.setAttribute('stroke-width', '1.5');
      p.setAttribute('fill', 'none');
      svg.appendChild(p);
    };

    const srcCards = srcCol.querySelectorAll('.match-card');
    const dstCards = dstCol.querySelectorAll('.match-card');

    for (let i = 0; i < dstCards.length; i++) {
      const c1 = srcCards[i * 2];
      const c2 = srcCards[i * 2 + 1];
      const d  = dstCards[i];
      if (!c1 || !c2 || !d) continue;

      const cr = connCol.getBoundingClientRect();
      const y1 = c1.getBoundingClientRect().top + c1.getBoundingClientRect().height / 2 - cr.top;
      const y2 = c2.getBoundingClientRect().top + c2.getBoundingClientRect().height / 2 - cr.top;
      const yd = d.getBoundingClientRect().top  + d.getBoundingClientRect().height  / 2 - cr.top;
      const ym = (y1 + y2) / 2;
      const xM = cr.width / 2;

      line(0, y1, xM, y1);
      line(0, y2, xM, y2);
      line(xM, y1, xM, y2);
      line(xM, ym, cr.width, yd);
    }
  });
}

// ── Render principal del bracket ──────────────────────────────────────────
function renderBracket() {
  const container = document.getElementById('bracket-container');
  const matches   = State.matchesData;
  if (!container) return;

  if (matches.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Stats del usuario actual
  const preds    = State.userPredictions;
  const finished = matches.filter(m => m.status === 'FINISHED');
  const correct  = finished.filter(m => {
    const res = getMatchResult(m);
    return res && preds[m.id] && preds[m.id] === res;
  });

  const statsHTML = State.currentUser ? `
    <div id="score-summary">
      <div class="score-card sc-gold"><div class="sc-num">${matches.length}</div><div class="sc-label">Partidos</div></div>
      <div class="score-card sc-blue"><div class="sc-num">${Object.keys(preds).length}</div><div class="sc-label">Predicciones</div></div>
      <div class="score-card sc-green"><div class="sc-num">${correct.length}</div><div class="sc-label">Correctas</div></div>
      <div class="score-card sc-red"><div class="sc-num">${finished.length - correct.length}</div><div class="sc-label">Incorrectas</div></div>
    </div>` : '';

  // Agrupar partidos por ronda
  const rounds = {};
  ROUND_ORDER.forEach(r => { rounds[r] = matches.filter(m => m.stage === r); });

  const storageLabel = isSupabaseConfigured()
    ? '<span class="storage-badge cloud" title="Predicciones sincronizadas en la nube">☁ Supabase</span>'
    : '<span class="storage-badge local" title="Predicciones guardadas localmente">💾 Local</span>';

  let html = statsHTML;
  const hasLive = matches.some(m => m.status === 'IN_PLAY' || m.status === 'PAUSED');
  const liveNote = hasLive
    ? `<span id="live-updated" style="color:var(--green);font-size:0.75rem;margin-left:8px"></span>`
    : '';

  html += `<div class="notice">
    💡 <strong>Haz clic en cualquier partido</strong> para registrar tu predicción antes de que comience.
    Horas en hora peruana (PET · GMT-5).
    ${liveNote}
    ${storageLabel}
    <button class="btn btn-ghost refresh-btn" onclick="triggerRefresh()">↻ Actualizar</button>
  </div>`;

  html += `<div class="bracket-wrapper"><div class="bracket" id="bracket-inner">`;

  ROUND_ORDER.forEach((round, ri) => {
    const rm = rounds[round];
    if (!rm || rm.length === 0) return;

    html += `<div class="round-col">
      <div class="round-header">${ROUND_NAMES[round] || round}</div>
      <div class="round-matches" id="round-${round}">`;

    rm.forEach(m => { html += renderMatchCard(m); });

    html += `</div></div>`;

    if (ri < ROUND_ORDER.length - 1) {
      html += `<div class="connector-col" id="conn-${round}"></div>`;
    }
  });

  // Bloque Campeón
  const finalMatch = (rounds['FINAL'] || [])[0];
  let champName = '?', champFlag = '🏳';
  if (finalMatch) {
    const w = finalMatch.score && finalMatch.score.winner;
    if (w === 'HOME_TEAM') { champName = finalMatch.homeTeam.name; champFlag = getFlag(champName); }
    else if (w === 'AWAY_TEAM') { champName = finalMatch.awayTeam.name; champFlag = getFlag(champName); }
  }

  html += `<div class="champion-slot">
    <div class="trophy-icon">🏆</div>
    <div class="champion-card">
      <div class="c-label">Campeón</div>
      <div class="c-flag">${champFlag}</div>
      <div class="c-name">${champName}</div>
    </div>
  </div>`;

  html += `</div></div>`; // .bracket + .bracket-wrapper

  container.innerHTML = html;
  drawConnectors();
}
