// Diagnóstico: muestra datos RAW de la API y datos POST-propagación
// Visitar: /api/debug
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const API_KEY = 'fd01075a76f44d0d954557f521a3f9cd';
  const STAGES  = ['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'];

  try {
    const raw = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': API_KEY } }
    );
    const data    = await raw.json();
    const matches = (data.matches || []).filter(m => STAGES.includes(m.stage));

    // Datos RAW de la API (sin ningún procesamiento nuestro)
    const rawSummary = matches
      .sort((a, b) => {
        const o = STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage);
        return o !== 0 ? o : a.id - b.id;
      })
      .map(m => ({
        id:     m.id,
        stage:  m.stage,
        status: m.status,
        home:   { id: m.homeTeam?.id, name: m.homeTeam?.name, tla: m.homeTeam?.tla },
        away:   { id: m.awayTeam?.id, name: m.awayTeam?.name, tla: m.awayTeam?.tla },
        winner: m.score?.winner || null,
        score:  m.score?.fullTime || null,
      }));

    const byStage = {};
    rawSummary.forEach(m => {
      if (!byStage[m.stage]) byStage[m.stage] = [];
      byStage[m.stage].push(m);
    });

    return res.status(200).json({ source: 'RAW API (sin propagación)', total: rawSummary.length, byStage });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
