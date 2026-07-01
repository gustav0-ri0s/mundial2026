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

// Propagación solo por ID de equipo.
// La API asigna el ganador al siguiente partido con { id: X, name: null } primero;
// aquí resolvemos ese estado intermedio. NO propagamos por posición/índice porque
// el bracket del Mundial 2026 no es secuencial y causaría equipos en slot incorrecto.
function propagateWinners(matches) {
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
        const k = teamById[t.id];
        m[slot] = { ...t, name: k.name, tla: k.tla, shortName: k.shortName, crest: k.crest };
      }
    });
  });

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
