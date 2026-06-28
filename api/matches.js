// Vercel serverless function — proxy para football-data.org
// Evita CORS y normaliza los nombres de equipo para WC 2026 (48 equipos).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const API_KEY = 'fd01075a76f44d0d954557f521a3f9cd';
  const BASE    = 'https://api.football-data.org/v4';
  // WC 2026 tiene ronda nueva: LAST_32 (antes del LAST_16)
  const STAGES  = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];
  const headers = { 'X-Auth-Token': API_KEY };

  try {
    let r = await fetch(`${BASE}/competitions/WC/matches?season=2026`, { headers });

    if (!r.ok && r.status !== 404) {
      return res.status(r.status).json({ error: `API error ${r.status}` });
    }

    let matches = [];

    if (r.ok) {
      const data = await r.json();
      matches = (data.matches || []).filter(m => STAGES.includes(m.stage));
    }

    // Fallback: pedir LAST_32 directamente si no se encontraron partidos knockout
    if (matches.length === 0) {
      r = await fetch(`${BASE}/competitions/WC/matches?stage=LAST_32`, { headers });
      if (r.ok) {
        const d2 = await r.json();
        matches = d2.matches || [];
      }
    }

    // Normalizar nombres de equipo: usar shortName o tla si name es null/vacío
    matches = matches.map(m => ({
      ...m,
      homeTeam: normalizeTeam(m.homeTeam),
      awayTeam: normalizeTeam(m.awayTeam)
    }));

    return res.status(200).json({ matches });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function normalizeTeam(team) {
  if (!team) return team;
  return {
    ...team,
    name: team.name || team.shortName || team.tla || null
  };
}
