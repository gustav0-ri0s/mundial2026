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
