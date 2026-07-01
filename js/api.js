// ── Cache local para respetar el límite de 10 req/min de la API gratuita ──
let _matchesCache = null;
let _cacheTime    = 0;

// Detecta si estamos en Vercel (tiene el proxy /api/matches) o en local
function _isVercel() {
  return window.location.protocol === 'https:' && !window.location.hostname.includes('localhost');
}

async function getKnockoutMatches() {
  if (_matchesCache && (Date.now() - _cacheTime) < CONFIG.CACHE_TTL) {
    return _matchesCache;
  }

  // En Vercel usamos el proxy serverless para evitar CORS
  if (_isVercel()) {
    return _fetchViaProxy();
  }

  // En local intentamos la API directamente
  try {
    return await _fetchDirect();
  } catch (e) {
    // Si falla en local (CORS en file://) intentamos el proxy igualmente
    return _fetchViaProxy();
  }
}

async function _fetchViaProxy() {
  const res = await fetch('/api/matches');

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error del servidor (${res.status}).`);
  }

  const data = await res.json();
  _matchesCache = propagateWinners(data.matches || []);
  _cacheTime = Date.now();
  return _matchesCache;
}

async function _fetchDirect() {
  const stages  = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];
  const headers = { 'X-Auth-Token': CONFIG.API_KEY };

  let res = await fetch(`${CONFIG.API_BASE}/competitions/WC/matches?season=2026`, { headers });

  if (res.status === 429) throw new Error('Límite de solicitudes alcanzado. Espera un minuto e intenta de nuevo.');
  if (res.status === 401 || res.status === 403) throw new Error('API Key inválida. Verifica config.js.');
  if (!res.ok) throw new Error(`Error del servidor (${res.status}).`);

  const data = await res.json();
  let matches = (data.matches || []).filter(m => stages.includes(m.stage));

  if (matches.length === 0) {
    res = await fetch(`${CONFIG.API_BASE}/competitions/WC/matches?stage=LAST_32`, { headers });
    if (res.ok) {
      const d2 = await res.json();
      matches = d2.matches || [];
    }
  }

  _matchesCache = propagateWinners(matches);
  _cacheTime = Date.now();
  return _matchesCache;
}

function clearMatchesCache() {
  _matchesCache = null;
  _cacheTime = 0;
}

function _teamHasInfo(t) { return t && (t.name || t.tla); }

function _sameTeam(a, b) {
  if (!_teamHasInfo(a) || !_teamHasInfo(b)) return false;
  if (a.id   && b.id   && a.id   === b.id)   return true;
  if (a.tla  && b.tla  && a.tla  === b.tla)  return true;
  if (a.name && b.name && a.name === b.name)  return true;
  return false;
}

function _makeSyntheticMatch(stage, idx, baseId) {
  return {
    id: baseId + idx, utcDate: null, stage,
    status: 'SCHEDULED', homeTeam: null, awayTeam: null,
    score: { winner: null, fullTime: { home: null, away: null } },
    _synthetic: true
  };
}

// ── Propagación de ganadores ──────────────────────────────────────────────
// Estrategia en 2 pasos:
//
// PASO 1 — ID matching (método principal, confiable):
//   La API frecuentemente devuelve el slot del ganador en la siguiente ronda
//   como { id: X, name: null, tla: null }. Construimos un mapa teamId→datos
//   completos y rellenamos esos slots vacíos. Esto es 100% correcto porque
//   la API ya asignó el equipo correcto; solo le falta el nombre/tla.
//
// PASO 2 — Posición por índice (fallback):
//   Cuando la API no asigna el equipo en absoluto (slot null/undefined),
//   usamos la posición ordenada por id para inferir la llave. Menos confiable
//   pero cubre el caso donde la API aún no actualizó.
function propagateWinners(matches) {

  // ── PASO 1: rellena slots con id pero sin nombre ──────────────────────
  const teamById = {};
  matches.forEach(m => {
    [m.homeTeam, m.awayTeam].forEach(t => {
      if (t && t.id && (t.name || t.tla)) teamById[t.id] = t;
    });
  });

  matches.forEach(m => {
    ['homeTeam', 'awayTeam'].forEach(slot => {
      const t = m[slot];
      if (t && t.id && !t.name && !t.tla && teamById[t.id]) {
        const known = teamById[t.id];
        m[slot] = { ...t, name: known.name, tla: known.tla,
                    shortName: known.shortName, crest: known.crest };
      }
    });
  });

  // ── PASO 2: rellena slots completamente vacíos por posición ──────────
  const stageOrder = ['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','FINAL'];

  for (let si = 0; si < stageOrder.length - 1; si++) {
    const fromStage = stageOrder[si];
    const toStage   = stageOrder[si + 1];

    const from = matches.filter(m => m.stage === fromStage).sort((a, b) => a.id - b.id);
    if (!from.some(m => m.status === 'FINISHED')) continue;

    let to = matches.filter(m => m.stage === toStage).sort((a, b) => a.id - b.id);

    if (to.length === 0) {
      const needed = Math.ceil(from.length / 2);
      for (let i = 0; i < needed; i++) {
        const sm = _makeSyntheticMatch(toStage, i, 80000 + si * 1000);
        matches.push(sm);
        to.push(sm);
      }
    }

    from.forEach((match, idx) => {
      if (match.status !== 'FINISHED' || !match.score) return;
      const winner = match.score.winner === 'HOME_TEAM' ? match.homeTeam
                   : match.score.winner === 'AWAY_TEAM' ? match.awayTeam : null;
      if (!winner) return;

      // No duplicar: si el ganador ya está en algún slot de la siguiente ronda, omitir
      const alreadyPlaced = to.some(m => _sameTeam(m.homeTeam, winner) || _sameTeam(m.awayTeam, winner));
      if (alreadyPlaced) return;

      const toMatch = to[Math.floor(idx / 2)];
      if (!toMatch) return;
      const slot = idx % 2 === 0 ? 'homeTeam' : 'awayTeam';
      if (!_teamHasInfo(toMatch[slot])) {
        const ex = toMatch[slot];
        toMatch[slot] = ex ? { ...ex, ...winner } : { ...winner };
      }
    });
  }

  // Perdedores de semis → 3er lugar
  const semis  = matches.filter(m => m.stage === 'SEMI_FINALS').sort((a, b) => a.id - b.id);
  const thirds = matches.filter(m => m.stage === 'THIRD_PLACE');
  if (semis.length >= 2) {
    let third = thirds[0];
    if (!third) { third = _makeSyntheticMatch('THIRD_PLACE', 0, 89000); matches.push(third); }
    semis.forEach((match, idx) => {
      if (match.status !== 'FINISHED' || !match.score) return;
      const loser = match.score.winner === 'HOME_TEAM' ? match.awayTeam
                  : match.score.winner === 'AWAY_TEAM' ? match.homeTeam : null;
      if (!loser) return;
      const slot = idx === 0 ? 'homeTeam' : 'awayTeam';
      if (!_teamHasInfo(third[slot])) third[slot] = { ...loser };
    });
  }

  return matches;
}

// ── Datos de demostración ──────────────────────────────────────────────────
function getDemoMatches() {
  // Ronda de 32 — 4 terminados, 4 pendientes
  const last32 = [
    { home: 'Argentina',     hTla: 'ARG', away: 'France',      aTla: 'FRA', winner: 'HOME_TEAM', hs: 2, as: 1 },
    { home: 'Brazil',        hTla: 'BRA', away: 'Germany',     aTla: 'GER', winner: 'AWAY_TEAM', hs: 0, as: 1 },
    { home: 'Spain',         hTla: 'ESP', away: 'England',     aTla: 'ENG', winner: 'HOME_TEAM', hs: 3, as: 1 },
    { home: 'Portugal',      hTla: 'POR', away: 'Netherlands', aTla: 'NED', winner: 'AWAY_TEAM', hs: 1, as: 2 },
    { home: 'Morocco',       hTla: 'MAR', away: 'Senegal',     aTla: 'SEN', winner: null },
    { home: 'Japan',         hTla: 'JPN', away: 'Korea Republic', aTla: 'KOR', winner: null },
    { home: 'United States', hTla: 'USA', away: 'Mexico',      aTla: 'MEX', winner: null },
    { home: 'Croatia',       hTla: 'CRO', away: 'Switzerland', aTla: 'SUI', winner: null }
  ];

  // Octavos — equipos vacíos (la API los deja null; propagateWinners los rellena)
  const last16 = [
    { id: 9100 }, { id: 9101 }, { id: 9102 }, { id: 9103 }
  ];

  const r32 = last32.map((b, i) => ({
    id: 9000 + i,
    utcDate: new Date(Date.UTC(2026, 6, 2 + i, 20, 0, 0)).toISOString(),
    stage: 'LAST_32',
    status: b.winner ? 'FINISHED' : 'TIMED',
    homeTeam: { name: b.home, tla: b.hTla },
    awayTeam: { name: b.away, tla: b.aTla },
    score: { winner: b.winner || null, fullTime: { home: b.hs ?? null, away: b.as ?? null } }
  }));

  const r16 = last16.map((b, i) => ({
    id: b.id,
    utcDate: new Date(Date.UTC(2026, 6, 14 + i, 20, 0, 0)).toISOString(),
    stage: 'LAST_16',
    status: 'TIMED',
    homeTeam: null,
    awayTeam: null,
    score: { winner: null, fullTime: { home: null, away: null } }
  }));

  return propagateWinners([...r32, ...r16]);
}
