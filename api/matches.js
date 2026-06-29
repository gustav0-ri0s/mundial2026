// Vercel serverless function — proxy para football-data.org
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Sin cache: los datos del torneo cambian minuto a minuto
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const API_KEY = 'fd01075a76f44d0d954557f521a3f9cd';
  const BASE    = 'https://api.football-data.org/v4';
  const STAGES  = ['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'];
  const headers = { 'X-Auth-Token': API_KEY };

  try {
    // Petición principal: todos los partidos de fase eliminatoria del WC 2026
    const r = await fetch(`${BASE}/competitions/WC/matches?season=2026`, { headers });

    if (!r.ok) {
      return res.status(r.status).json({ error: `API error ${r.status}` });
    }

    const data  = await r.json();
    let matches = (data.matches || []).filter(m => STAGES.includes(m.stage));

    // Si la API no devolvió ningún partido de knockout, intentar cada stage por separado
    if (matches.length === 0) {
      const all = [];
      for (const stage of STAGES) {
        const r2 = await fetch(`${BASE}/competitions/WC/matches?stage=${stage}`, { headers });
        if (r2.ok) {
          const d2 = await r2.json();
          all.push(...(d2.matches || []));
        }
      }
      matches = all;
    }

    // Normalizar: rellenar nombres nulos desde TLA o shortName
    matches = matches.map(m => ({
      ...m,
      homeTeam: normalizeTeam(m.homeTeam),
      awayTeam: normalizeTeam(m.awayTeam),
    }));

    // Propagar ganadores en el servidor también, como segunda capa de seguridad
    matches = propagateByTeamId(matches);

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
  'MLI':'Mali','CPV':'Cape Verde','COD':'DR Congo',
  'JPN':'Japan','KOR':'Korea Republic','IRN':'Iran','KSA':'Saudi Arabia','AUS':'Australia',
  'IRQ':'Iraq','UZB':'Uzbekistan','JOR':'Jordan','IDN':'Indonesia','QAT':'Qatar',
  'CHN':'China','NZL':'New Zealand',
};

function normalizeTeam(team) {
  if (!team) return team;
  const name = (team.name && team.name.length > 3)
    ? team.name
    : (team.tla && TLA_NAMES[team.tla]) || team.name || team.shortName || team.tla || null;
  return { ...team, name };
}

// Estrategia principal de propagación: si un slot tiene id pero sin nombre,
// busca ese id entre los equipos conocidos de otras partidos y rellena.
// Esto es lo que pasa cuando la API asigna al ganador a la siguiente ronda
// pero aún no rellena el nombre completo (devuelve { id: X, name: null }).
function propagateByTeamId(matches) {
  // 1. Construir mapa teamId → equipo completo
  const byId = {};
  matches.forEach(m => {
    [m.homeTeam, m.awayTeam].forEach(t => {
      if (t && t.id && (t.name || t.tla)) byId[t.id] = t;
    });
  });

  // 2. Rellenar slots con id pero sin nombre
  matches.forEach(m => {
    ['homeTeam', 'awayTeam'].forEach(slot => {
      const t = m[slot];
      if (t && t.id && !t.name && !t.tla && byId[t.id]) {
        m[slot] = { ...t, name: byId[t.id].name, tla: byId[t.id].tla,
                    shortName: byId[t.id].shortName, crest: byId[t.id].crest };
      }
    });
  });

  return matches;
}
