// ── Estado global de la aplicación ────────────────────────────────────────
const State = {
  currentUser:      localStorage.getItem('wc26_user') || null,
  matchesData:      [],
  userPredictions:  {},   // cache en memoria: { matchId: teamName }
  currentModalMatch: null,
  selectedTeamIndex: null,
  _refreshTimer:    null
};

// ── Gestión de usuario ─────────────────────────────────────────────────────
async function setUser() {
  const name = document.getElementById('username-input').value.trim();
  if (!name) return;
  State.currentUser = name;
  localStorage.setItem('wc26_user', name);
  await loadUserPredictions();
  updateUserUI();
  renderBracket();
}

function changeUser() {
  State.currentUser = null;
  State.userPredictions = {};
  localStorage.removeItem('wc26_user');
  updateUserUI();
  renderBracket();
}

function updateUserUI() {
  const panel  = document.getElementById('user-panel');
  const active = document.getElementById('active-user');
  if (State.currentUser) {
    panel.style.display  = 'none';
    active.style.display = 'flex';
    document.getElementById('user-display').textContent = State.currentUser;
    document.getElementById('user-avatar').textContent  = State.currentUser[0].toUpperCase();
  } else {
    panel.style.display  = 'flex';
    active.style.display = 'none';
  }
}

async function loadUserPredictions() {
  if (!State.currentUser) { State.userPredictions = {}; return; }
  try {
    const arr = await getUserPredictions(State.currentUser);
    State.userPredictions = {};
    arr.forEach(p => { State.userPredictions[p.match_id] = p.predicted_winner; });
  } catch (e) {
    console.warn('No se pudieron cargar predicciones del usuario:', e.message);
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────────
function showTab(id, tabEl) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  if (tabEl) tabEl.classList.add('active');
  if (id === 'mis-predicciones') renderMyPredictions();
  if (id === 'ranking')          renderRanking();
}

// ── Carga de datos desde la API ────────────────────────────────────────────
async function loadMatchesAndRender() {
  const loading   = document.getElementById('bracket-loading');
  const container = document.getElementById('bracket-container');
  loading.style.display   = 'block';
  container.innerHTML     = '';

  try {
    State.matchesData = await getKnockoutMatches();
    loading.style.display = 'none';
    renderBracket();
    scheduleAutoRefresh();
  } catch (e) {
    loading.style.display = 'none';
    container.innerHTML = `
      <div class="notice">
        ⚠️ <strong>Error al cargar datos:</strong> ${e.message}<br>
        <small>Verifica tu API Key en config.js o intenta de nuevo más tarde.</small>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" onclick="loadMatchesAndRender()">↺ Reintentar</button>
          <button class="btn btn-ghost" onclick="loadDemo()">👁 Ver demo</button>
        </div>
      </div>`;
  }
}

function loadDemo() {
  State.matchesData = getDemoMatches();
  document.getElementById('bracket-loading').style.display = 'none';
  renderBracket();
}

function triggerRefresh() {
  clearMatchesCache();
  loadMatchesAndRender();
}

function scheduleAutoRefresh() {
  clearInterval(State._refreshTimer);
  // Revisa cada 60 s; solo pide datos si hay partido en vivo
  State._refreshTimer = setInterval(_liveRefreshTick, 60000);
}

async function _liveRefreshTick() {
  const hasLive = State.matchesData.some(
    m => m.status === 'IN_PLAY' || m.status === 'PAUSED'
  );
  if (!hasLive) return;

  clearMatchesCache();
  try {
    const prev = State.matchesData.map(m => ({ id: m.id, status: m.status }));
    State.matchesData = await getKnockoutMatches();
    renderBracket();
    _updateLiveTimestamp();

    // Detecta partidos que acaban de terminar → re-evalúa predicciones
    const justFinished = State.matchesData.filter(m => {
      const was = prev.find(p => p.id === m.id);
      return was && was.status !== 'FINISHED' && m.status === 'FINISHED';
    });

    if (justFinished.length > 0) {
      await loadUserPredictions();
      renderBracket();
      const activeId = document.querySelector('.tab-content.active')?.id;
      if (activeId === 'tab-mis-predicciones') renderMyPredictions();
      if (activeId === 'tab-ranking')          renderRanking();
    }
  } catch (e) {
    console.warn('[Live] Error al actualizar:', e.message);
  }
}

function _updateLiveTimestamp() {
  const el = document.getElementById('live-updated');
  if (!el) return;
  const now = new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Lima'
  });
  el.textContent = `Actualizado: ${now} PET`;
}

// ── Modal de predicción ────────────────────────────────────────────────────
function openModal(matchId) {
  if (!State.currentUser) {
    alert('Ingresa tu nombre primero para poder predecir.');
    return;
  }
  const match = State.matchesData.find(m => m.id === matchId);
  if (!match || match.status === 'FINISHED') return;

  State.currentModalMatch  = match;
  State.selectedTeamIndex  = null;

  const h    = getTeamName(match.homeTeam);
  const a    = getTeamName(match.awayTeam);
  const date = new Date(match.utcDate);

  document.getElementById('modal-match-info').textContent =
    `${date.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long' })} — ¿Quién ganará?`;
  document.getElementById('modal-flag1').innerHTML = getFlagHTML(match.homeTeam, '40x30');
  document.getElementById('modal-name1').textContent = getDisplayName(h);
  document.getElementById('modal-flag2').innerHTML = getFlagHTML(match.awayTeam, '40x30');
  document.getElementById('modal-name2').textContent = getDisplayName(a);

  document.getElementById('modal-team1').classList.remove('selected');
  document.getElementById('modal-team2').classList.remove('selected');
  document.getElementById('modal-save-btn').disabled = true;

  const existing = State.userPredictions[matchId];
  const existEl  = document.getElementById('modal-existing-pred');
  existEl.innerHTML = existing
    ? `Tu predicción actual: ${getFlagHTMLByName(existing)} ${getDisplayName(existing)}`
    : '';

  if      (existing === h) selectTeam(0);
  else if (existing === a) selectTeam(1);

  document.getElementById('pred-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('pred-modal').classList.remove('open');
  State.currentModalMatch = null;
  State.selectedTeamIndex = null;
}

function selectTeam(idx) {
  State.selectedTeamIndex = idx;
  document.getElementById('modal-team1').classList.toggle('selected', idx === 0);
  document.getElementById('modal-team2').classList.toggle('selected', idx === 1);
  document.getElementById('modal-save-btn').disabled = false;
}

async function onModalSave() {
  if (!State.currentModalMatch || State.selectedTeamIndex === null) return;

  const btn      = document.getElementById('modal-save-btn');
  btn.disabled   = true;
  btn.textContent = 'Guardando...';

  const teamName = State.selectedTeamIndex === 0
    ? getTeamName(State.currentModalMatch.homeTeam)
    : getTeamName(State.currentModalMatch.awayTeam);

  try {
    await savePrediction(State.currentUser, State.currentModalMatch.id, teamName);
    State.userPredictions[State.currentModalMatch.id] = teamName;
  } catch (e) {
    console.error('Error al guardar predicción:', e.message);
  }

  closeModal();
  renderBracket();
  btn.textContent = 'Guardar predicción';
}

// ── Inicialización ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  updateUserUI();

  if (State.currentUser) {
    await loadUserPredictions();
  }

  // Suscripción realtime para actualizar el ranking automáticamente
  subscribeToRankingUpdates(() => {
    const rankingTab = document.getElementById('tab-ranking');
    if (rankingTab && rankingTab.classList.contains('active')) {
      renderRanking();
    }
  });

  // Intentar cargar datos reales; si falla, cargar demo
  try {
    await loadMatchesAndRender();
  } catch (e) {
    loadDemo();
  }

  // Enter en el input de usuario
  document.getElementById('username-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') setUser();
  });

  // Cerrar modal con Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});
