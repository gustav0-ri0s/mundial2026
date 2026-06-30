// Endpoint de diagnóstico — muestra los datos después de normalizar y propagar
// Visitar: https://tu-app.vercel.app/api/debug
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  try {
    // Llama al mismo proxy de matches para ver el resultado final
    const origin = `https://${req.headers.host}`;
    const r = await fetch(`${origin}/api/matches`);
    if (!r.ok) return res.status(r.status).json({ error: `proxy error ${r.status}` });

    const data = await r.json();
    const KNOCKOUT = ['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'];

    const summary = (data.matches || [])
      .filter(m => KNOCKOUT.includes(m.stage))
      .sort((a, b) => {
        const order = KNOCKOUT.indexOf(a.stage) - KNOCKOUT.indexOf(b.stage);
        return order !== 0 ? order : a.id - b.id;
      })
      .map(m => ({
        id:     m.id,
        stage:  m.stage,
        status: m.status,
        home:   { id: m.homeTeam?.id, name: m.homeTeam?.name, tla: m.homeTeam?.tla },
        away:   { id: m.awayTeam?.id, name: m.awayTeam?.name, tla: m.awayTeam?.tla },
        winner: m.score?.winner || null,
      }));

    // Agrupar por stage para lectura fácil
    const byStage = {};
    summary.forEach(m => {
      if (!byStage[m.stage]) byStage[m.stage] = [];
      byStage[m.stage].push(m);
    });

    return res.status(200).json({ total: summary.length, byStage });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
