// Vercel serverless function — proxy para football-data.org
// Evita el bloqueo CORS que ocurre cuando el navegador llama directamente a la API.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const API_KEY = 'fd01075a76f44d0d954557f521a3f9cd';
  const BASE    = 'https://api.football-data.org/v4';
  const STAGES  = ['LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];
  const headers = { 'X-Auth-Token': API_KEY };

  try {
    // Intento 1: todos los partidos de la temporada 2026
    let r = await fetch(`${BASE}/competitions/WC/matches?season=2026`, { headers });

    // Intento 2: solo LAST_16 si el primero falla o no trae datos knockout
    if (!r.ok || r.status === 404) {
      r = await fetch(`${BASE}/competitions/WC/matches?stage=LAST_16`, { headers });
    }

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: `API error ${r.status}`, detail: text });
    }

    const data    = await r.json();
    const matches = (data.matches || []).filter(m => STAGES.includes(m.stage));

    return res.status(200).json({ matches });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
