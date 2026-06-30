// Vercel serverless proxy para football-data.org
// Incluye propagación completa de ganadores en el servidor,
// así el cliente recibe datos ya correctos sin depender de JS en memoria.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const API_KEY = 'fd01075a76f44d0d954557f521a3f9cd';
  const BASE    = 'https://api.football-data.org/v4';
  const STAGES  = ['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'];
  const headers = { 'X-Auth-Token': API_KEY };

  try {
    const r = await fetch(`${BASE}/competitions/WC/matches?season=2026`, { headers });
    if (!r.ok) return res.status(r.status).json({ error: `API error ${r.status}` });

    const data  = await r.json();
    let matches = (data.matches || []).filter(m => STAGES.includes(m.stage));

    if (matches.length === 0) {
      const all = [];
      for (const stage of STAGES) {
        const r2 = await fetch(`${BASE}/competitions/WC/matches?stage=${stage}`, { headers });
        if (r2.ok) { const d2 = await r2.json(); all.push(...(d2.matches || [])); }
      }
      matches = all;
    }

    // 1. Normalizar nombres nulos desde TLA/shortName
    matches = matches.map(m => ({
      ...m,
      homeTeam: normalizeTeam(m.homeTeam),
      awayTeam: normalizeTeam(m.awayTeam),
    }));

    // 2. Propagar ganadores (ID-based + posición) — la API tarda horas en actualizar LAST_16
    matches = propagateWinners(matches);

    return res.status(200).json({ matches });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

const TLA_NAMES = {
  'ARG':'Argentina','BRA':'Brazil','URU':'Uruguay','COL':'Colombia','ECU':'Ecuador',
  'VEN':'Venezuela','CHI':'Chile','PAR':'Paraguay','BOL':'Bolivia','PER':'Peru',
  'USA':'United States','MEX':'Mexico','CAN':'Canada','PAN':'Panama','CRC':'Costa Rica',
  'HON':'Honduras','SLV':'El Salvador','JAM':'Jamaica','CUB':'Cuba','TRI':'Trinidad and Tobago',
  'HAI':'Haiti','CUR':'Curaçao','GUA':'Guatemala','NCA':'Nicaragua',
  'FRA':'France','GER':'Germany','ESP':'Spain','ENG':'England','POR':'Portugal',
  'NED':'Netherlands','BEL':'Belgium','CRO':'Croatia','SUI':'Switzerland',
  'POL':'Poland','DEN':'Denmark','SRB':'Serbia','AUT':'Austria','TUR':'Turkey',
  'UKR':'Ukraine','ROU':'Romania','SVK':'Slovakia','SVN':'Slovenia','ALB':'Albania',
  'GEO':'Georgia','HUN':'Hungary','CZE':'Czech Republic','NOR':'Norway','SWE':'Sweden',
  'FIN':'Finland','IRL':'Ireland','ISL':'Iceland','GRE':'Greece','SCO':'Scotland',
  'WAL':'Wales','BIH':'Bosnia and Herzegovina','MNE':'Montenegro','MKD':'North Macedonia',
  'LUX':'Luxembourg',
  'MAR':'Morocco','SEN':'Senegal','NGA':'Nigeria','EGY':'Egypt','ALG':'Algeria',
  'TUN':'Tunisia','CMR':'Cameroon','GHA':'Ghana','CIV':"Côte d'Ivoire",'RSA':'South Africa',
  'MLI':'Mali','CPV':'Cape Verde','COD':'DR Congo','CON':'Congo','CNG':'Congo',
  'JPN':'Japan','KOR':'Korea Republic','IRN':'Iran','KSA':'Saudi Arabia','AUS':'Australia',
  'IRQ':'Iraq','UZB':'Uzbekistan','JOR':'Jordan','IDN':'Indonesia','QAT':'Qatar',
  'CHN':'China','NZL':'New Zealand',
};

function normalizeTeam(team) {
  if (!team) return { id: null, name: null, shortName: null, tla: null, crest: null };
  const name = (team.name && team.name.length > 3)
    ? team.name
    : (team.tla && TLA_NAMES[team.tla]) || team.shortName || team.tla || null;
  return { id: team.id || null, name, shortName: team.shortName || null,
           tla: team.tla || null, crest: team.crest || null };
}

function hasInfo(team) {
  return team && (team.name || team.tla);
}

// Propagación completa en dos pasos:
// PASO 1 — Por ID de equipo: si LAST_16 tiene { id:X, name:null }, busca X en otros partidos.
//           La API aveces asigna el id del ganador antes de poner el nombre.
// PASO 2 — Por posición (index): los partidos de una ronda se ordenan por id y se emparejan
//           de a pares con la siguiente ronda. Verificado con el debug: Canada (LAST_32[2])
//           → LAST_16[1] = id 537376. La misma fórmula aplica a todos.
function propagateWinners(matches) {

  // ── PASO 1: id-based ──────────────────────────────────────────────────
  const byId = {};
  matches.forEach(m => {
    [m.homeTeam, m.awayTeam].forEach(t => {
      if (t && t.id && (t.name || t.tla)) byId[t.id] = t;
    });
  });
  matches.forEach(m => {
    ['homeTeam', 'awayTeam'].forEach(slot => {
      const t = m[slot];
      if (t && t.id && !t.name && !t.tla && byId[t.id]) {
        const k = byId[t.id];
        m[slot] = { ...t, name: k.name, tla: k.tla, shortName: k.shortName, crest: k.crest };
      }
    });
  });

  // ── PASO 2: posición-based ────────────────────────────────────────────
  // Estructura verificada: LAST_32 matches ordenados por id, de a pares → LAST_16
  //   [0,1]→LAST_16[0]  [2,3]→LAST_16[1]  ...  [8,9]→LAST_16[4]  etc.
  const stageOrder = ['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','FINAL'];

  for (let si = 0; si < stageOrder.length - 1; si++) {
    const fromStage = stageOrder[si];
    const toStage   = stageOrder[si + 1];

    const from = matches.filter(m => m.stage === fromStage).sort((a, b) => a.id - b.id);
    const to   = matches.filter(m => m.stage === toStage).sort((a, b) => a.id - b.id);

    if (from.length === 0 || to.length === 0) continue;

    from.forEach((match, idx) => {
      if (match.status !== 'FINISHED' || !match.score || !match.score.winner) return;

      const winner = match.score.winner === 'HOME_TEAM' ? match.homeTeam
                   : match.score.winner === 'AWAY_TEAM' ? match.awayTeam : null;
      if (!hasInfo(winner)) return;

      const toMatch = to[Math.floor(idx / 2)];
      if (!toMatch) return;
      const slot = idx % 2 === 0 ? 'homeTeam' : 'awayTeam';

      // Solo rellenar si el slot no tiene datos útiles aún
      if (!hasInfo(toMatch[slot])) {
        toMatch[slot] = { id: winner.id, name: winner.name, tla: winner.tla,
                          shortName: winner.shortName, crest: winner.crest };
      }
    });
  }

  // Perdedores de semis → 3er lugar
  const semis  = matches.filter(m => m.stage === 'SEMI_FINALS').sort((a, b) => a.id - b.id);
  const thirds = matches.filter(m => m.stage === 'THIRD_PLACE').sort((a, b) => a.id - b.id);
  if (semis.length >= 2 && thirds.length >= 1) {
    semis.forEach((match, idx) => {
      if (match.status !== 'FINISHED' || !match.score || !match.score.winner) return;
      const loser = match.score.winner === 'HOME_TEAM' ? match.awayTeam
                  : match.score.winner === 'AWAY_TEAM' ? match.homeTeam : null;
      if (!hasInfo(loser)) return;
      const slot = idx === 0 ? 'homeTeam' : 'awayTeam';
      if (!hasInfo(thirds[0][slot])) {
        thirds[0][slot] = { id: loser.id, name: loser.name, tla: loser.tla,
                             shortName: loser.shortName, crest: loser.crest };
      }
    });
  }

  return matches;
}
