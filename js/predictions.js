// ── Tab: Mis Predicciones ──────────────────────────────────────────────────
async function renderMyPredictions() {
  const el       = document.getElementById('pred-content');
  const loginMsg = document.getElementById('pred-login-msg');

  if (!State.currentUser) {
    loginMsg.style.display = 'block';
    el.innerHTML = '';
    return;
  }
  loginMsg.style.display = 'none';
  el.innerHTML = '<div class="loading-msg"><div class="spinner"></div></div>';

  let predsArray;
  try {
    predsArray = await getUserPredictions(State.currentUser);
  } catch (e) {
    el.innerHTML = `<div class="notice">⚠️ Error al cargar predicciones: ${e.message}</div>`;
    return;
  }

  if (predsArray.length === 0) {
    el.innerHTML = `<div class="notice">
      Aún no tienes predicciones registradas.
      Ve al <strong>Bracket</strong> y toca un partido para predecir.
    </div>`;
    return;
  }

  let correct = 0, wrong = 0, pending = 0;
  let rows = '';

  predsArray.forEach(pred => {
    const match = State.matchesData.find(m => m.id === pred.match_id);
    if (!match) return;

    const result = getMatchResult(match);
    let pill = '';

    if (result === null) {
      pending++;
      pill = `<span class="status-pill pill-blue">⏳ Pendiente</span>`;
    } else if (pred.predicted_winner === result) {
      correct++;
      pill = `<span class="status-pill pill-green">✓ Acertaste</span>`;
    } else {
      wrong++;
      pill = `<span class="status-pill pill-red">✗ Fallaste</span>`;
    }

    const hTeam = match.homeTeam, aTeam = match.awayTeam;
    const h     = hTeam && hTeam.name || '?';
    const a     = aTeam && aTeam.name || '?';
    const hf    = getFlagFromTeam(hTeam);
    const af    = getFlagFromTeam(aTeam);

    // Bandera de la predicción: buscar el objeto equipo para usar TLA
    const predTeam = (hTeam && hTeam.name === pred.predicted_winner) ? hTeam
                   : (aTeam && aTeam.name === pred.predicted_winner) ? aTeam
                   : null;
    const predFlag = predTeam ? getFlagFromTeam(predTeam) : getFlag(pred.predicted_winner);

    // Bandera del resultado real
    const realTeam = result && ((hTeam && hTeam.name === result) ? hTeam
                   : (aTeam && aTeam.name === result) ? aTeam : null);
    const realFlag = realTeam ? getFlagFromTeam(realTeam) : getFlag(result || '');
    const real = result ? `${realFlag} ${getDisplayName(result)}` : '—';

    rows += `<tr>
      <td>${hf} ${getDisplayName(h)} vs ${af} ${getDisplayName(a)}</td>
      <td>${predFlag} ${getDisplayName(pred.predicted_winner)}</td>
      <td>${real}</td>
      <td>${pill}</td>
    </tr>`;
  });

  el.innerHTML = `
    <div id="score-summary">
      <div class="score-card sc-blue"><div class="sc-num">${predsArray.length}</div><div class="sc-label">Predicciones</div></div>
      <div class="score-card sc-green"><div class="sc-num">${correct}</div><div class="sc-label">Correctas</div></div>
      <div class="score-card sc-red"><div class="sc-num">${wrong}</div><div class="sc-label">Incorrectas</div></div>
      <div class="score-card sc-gold"><div class="sc-num">${pending}</div><div class="sc-label">Pendientes</div></div>
    </div>
    <div class="section-title">Historial de predicciones</div>
    <table class="predictions-table">
      <thead><tr>
        <th>Partido</th>
        <th>Tu predicción</th>
        <th>Resultado real</th>
        <th>Estado</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Tab: Ranking Global ────────────────────────────────────────────────────
async function renderRanking() {
  const el = document.getElementById('ranking-content');
  el.innerHTML = '<div class="loading-msg"><div class="spinner"></div><p style="margin-top:12px">Cargando ranking...</p></div>';

  let ranking;
  try {
    ranking = await getRanking(State.matchesData);
  } catch (e) {
    el.innerHTML = `<div class="notice">⚠️ Error al cargar el ranking: ${e.message}</div>`;
    return;
  }

  if (ranking.length === 0) {
    el.innerHTML = `<div class="notice">
      Aún no hay predicciones registradas.
      ${isSupabaseConfigured()
        ? 'Comparte la app con amigos para competir en tiempo real.'
        : 'Configura Supabase para un ranking global compartido.'
      }
    </div>`;
    return;
  }

  const storageMsg = isSupabaseConfigured()
    ? '🌐 <strong>Ranking global</strong> — en tiempo real vía Supabase. Cada predicción de cualquier usuario aparece aquí.'
    : '💾 <strong>Ranking local</strong> — solo visible en este navegador. <a href="README.md" style="color:var(--gold)">Configura Supabase</a> para un ranking global.';

  const medals = ['🥇', '🥈', '🥉'];

  const rows = ranking.map((u, i) => {
    const pct  = u.total > 0 ? Math.round(u.correct / u.total * 100) + '%' : '—';
    const isMe = u.name === State.currentUser;
    const medal = medals[i] || `<span style="color:var(--muted)">${i + 1}</span>`;
    return `<tr>
      <td style="font-size:1.2rem">${medal}</td>
      <td style="font-weight:700;color:${isMe ? 'var(--gold)' : 'var(--text)'}">
        ${u.name}${isMe ? ' <span style="color:var(--muted);font-weight:400">(tú)</span>' : ''}
      </td>
      <td style="text-align:center"><span class="status-pill pill-green">${u.correct}</span></td>
      <td style="text-align:center"><span class="status-pill pill-red">${u.wrong}</span></td>
      <td style="text-align:center"><span class="status-pill pill-blue">${u.pending}</span></td>
      <td style="text-align:center;font-weight:700;color:var(--gold)">${pct}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="section-title">Tabla de posiciones</div>
    <div class="notice">${storageMsg}</div>
    <table class="predictions-table">
      <thead><tr>
        <th>#</th>
        <th>Jugador</th>
        <th style="text-align:center">✓ Correctas</th>
        <th style="text-align:center">✗ Incorrectas</th>
        <th style="text-align:center">⏳ Pendientes</th>
        <th style="text-align:center">% Acierto</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}
