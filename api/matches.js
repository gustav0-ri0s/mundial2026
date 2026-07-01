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

// Reordena 'from' para que las posiciones de display coincidan con la siguiente
// ronda — igual que orderRoundForDisplay en bracket.js.
// Los partidos con ganador confirmado en 'to' se ubican primero (en su slot real),
// los demás llenan los huecos en orden de ID.
function orderForPropagation(from, to) {
  const teamPos = {};
  to.forEach((mn, ni) => {
    if (mn.homeTeam && mn.homeTeam.id) teamPos[mn.homeTeam.id] = ni * 2;
    if (mn.awayTeam && mn.awayTeam.id) teamPos[mn.awayTeam.id] = ni * 2 + 1;
  });

  const n = from.length;
  const result  = new Array(n).fill(null);
  const placed  = new Set();

  from.forEach(m => {
    if (m.status !== 'FINISHED' || !m.score || !m.score.winner) return;
    const w = m.score.winner === 'HOME_TEAM' ? m.homeTeam : m.awayTeam;
    if (!w || !w.id) return;
    const pos = teamPos[w.id];
    if (pos !== undefined && pos < n && result[pos] === null) {
      result[pos] = m;
      placed.add(m.id);
    }
  });

  const remaining = from.filter(m => !placed.has(m.id));
  let ri = 0;
  for (let i = 0; i < n; i++) {
    if (result[i] === null && ri < remaining.length) result[i] = remaining[ri++];
  }
  return result.filter(Boolean);
}

function propagateWinners(matches) {

  // ── PASO 1: id-based ─────────────────────────────────────────────────
  // Resuelve slots { id:X, name:null } que la API crea como estado intermedio
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

  // ── PASO 2: posición-based (con orden de bracket correcto) ────────────
  // Reordena LAST_32 según la asignación real de LAST_16 (confirmada por la API),
  // luego aplica pares secuenciales. El alreadyPlaced previene duplicados cuando
  // PASO 1 ya colocó al equipo (o la API ya lo asignó con nombre completo).
  const stageOrder = ['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','FINAL'];

  for (let si = 0; si < stageOrder.length - 1; si++) {
    const from = matches.filter(m => m.stage === stageOrder[si]).sort((a, b) => a.id - b.id);
    const to   = matches.filter(m => m.stage === stageOrder[si + 1]).sort((a, b) => a.id - b.id);
    if (!from.length || !to.length) continue;
    if (!from.some(m => m.status === 'FINISHED' && m.score && m.score.winner)) continue;

    const ordered = orderForPropagation(from, to);

    ordered.forEach((match, idx) => {
      if (!match || match.status !== 'FINISHED' || !match.score || !match.score.winner) return;
      const winner = match.score.winner === 'HOME_TEAM' ? match.homeTeam : match.awayTeam;
      if (!hasInfo(winner)) return;

      // Si ya está en cualquier slot de la siguiente ronda, no duplicar
      if (to.some(m => sameTeam(m.homeTeam, winner) || sameTeam(m.awayTeam, winner))) return;

      const toMatch = to[Math.floor(idx / 2)];
      if (!toMatch) return;
      const slot = idx % 2 === 0 ? 'homeTeam' : 'awayTeam';
      if (!hasInfo(toMatch[slot])) {
        toMatch[slot] = { id: winner.id, name: winner.name, tla: winner.tla,
                          shortName: winner.shortName, crest: winner.crest };
      }
    });
  }

  return matches;
}
