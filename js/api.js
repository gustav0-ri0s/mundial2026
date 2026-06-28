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
  _matchesCache = data.matches || [];
  _cacheTime = Date.now();
  return _matchesCache;
}

async function _fetchDirect() {
  const stages  = ['LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];
  const headers = { 'X-Auth-Token': CONFIG.API_KEY };

  let res = await fetch(`${CONFIG.API_BASE}/competitions/WC/matches?season=2026`, { headers });

  if (res.status === 429) throw new Error('Límite de solicitudes alcanzado. Espera un minuto e intenta de nuevo.');
  if (res.status === 401 || res.status === 403) throw new Error('API Key inválida. Verifica config.js.');
  if (!res.ok) throw new Error(`Error del servidor (${res.status}).`);

  const data = await res.json();
  let matches = (data.matches || []).filter(m => stages.includes(m.stage));

  if (matches.length === 0) {
    res = await fetch(`${CONFIG.API_BASE}/competitions/WC/matches?stage=LAST_16`, { headers });
    if (res.ok) {
      const d2 = await res.json();
      matches = d2.matches || [];
    }
  }

  _matchesCache = matches;
  _cacheTime = Date.now();
  return _matchesCache;
}

function clearMatchesCache() {
  _matchesCache = null;
  _cacheTime = 0;
}

// ── Datos de demostración ──────────────────────────────────────────────────
function getDemoMatches() {
  const bracket = [
    { home: 'Argentina',     away: 'France',      winner: 'HOME_TEAM', hs: 2, as: 1 },
    { home: 'Brazil',        away: 'Germany',     winner: 'AWAY_TEAM', hs: 0, as: 1 },
    { home: 'Spain',         away: 'England',     winner: 'HOME_TEAM', hs: 3, as: 1 },
    { home: 'Portugal',      away: 'Netherlands', winner: 'AWAY_TEAM', hs: 1, as: 2 },
    { home: 'Morocco',       away: 'Senegal',     winner: null },
    { home: 'Japan',         away: 'South Korea', winner: null },
    { home: 'United States', away: 'Mexico',      winner: null },
    { home: 'Croatia',       away: 'Switzerland', winner: null }
  ];

  return bracket.map((b, i) => ({
    id: 9000 + i,
    utcDate: new Date(Date.UTC(2026, 6, 2 + i * 2, 20, 0, 0)).toISOString(),
    stage: 'LAST_16',
    status: b.winner ? 'FINISHED' : 'TIMED',
    homeTeam: { name: b.home },
    awayTeam: { name: b.away },
    score: {
      winner: b.winner || null,
      fullTime: { home: b.hs ?? null, away: b.as ?? null }
    }
  }));
}
