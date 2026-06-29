// Endpoint de diagnóstico — muestra los datos crudos de la API
// Visitar: https://tu-app.vercel.app/api/debug
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const API_KEY = 'fd01075a76f44d0d954557f521a3f9cd';
  const BASE    = 'https://api.football-data.org/v4';
  const headers = { 'X-Auth-Token': API_KEY };

  try {
    const r = await fetch(`${BASE}/competitions/WC/matches?season=2026`, { headers });
    if (!r.ok) return res.status(r.status).json({ error: `API error ${r.status}` });

    const data = await r.json();
    const KNOCKOUT = ['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'];

    const summary = (data.matches || [])
      .filter(m => KNOCKOUT.includes(m.stage))
      .map(m => ({
        id:       m.id,
        stage:    m.stage,
        status:   m.status,
        utcDate:  m.utcDate,
        venue:    m.venue || null,
        home: { id: m.homeTeam?.id, name: m.homeTeam?.name, tla: m.homeTeam?.tla },
        away: { id: m.awayTeam?.id, name: m.awayTeam?.name, tla: m.awayTeam?.tla },
        winner:   m.score?.winner || null,
        score:    m.score?.fullTime || null,
      }));

    return res.status(200).json({ total: summary.length, matches: summary });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
