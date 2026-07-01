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

// Dos equipos son el mismo si coinciden por id, tla o nombre
function sameTeam(a, b) {
  if (!hasInfo(a) || !hasInfo(b)) return false;
  if (a.id   && b.id   && a.id   === b.id)   return true;
  if (a.tla  && b.tla  && a.tla  === b.tla)  return true;
  if (a.name && b.name && a.name === b.name)  return true;
  return false;
}

// Propagación solo por ID de equipo.
// La API asigna el ganador al siguiente partido con { id: X, name: null } primero,
// luego lo actualiza con el nombre completo. Aquí resolvemos ese estado intermedio.
// NO usamos propagación por posición/índice — el bracket del Mundial 2026 no es
// simplemente secuencial por ID y causaría equipos en posiciones incorrectas.
function propagateWinners(matches) {

  // Construir mapa teamId → datos completos desde todos los partidos
  const byId = {};
  matches.forEach(m => {
    [m.homeTeam, m.awayTeam].forEach(t => {
      if (t && t.id && (t.name || t.tla)) byId[t.id] = t;
    });
  });

  // Rellenar slots que tienen id pero no nombre/tla
  matches.forEach(m => {
    ['homeTeam', 'awayTeam'].forEach(slot => {
      const t = m[slot];
      if (t && t.id && !t.name && !t.tla && byId[t.id]) {
        const k = byId[t.id];
        m[slot] = { ...t, name: k.name, tla: k.tla, shortName: k.shortName, crest: k.crest };
      }
    });
  });

  return matches;
}
