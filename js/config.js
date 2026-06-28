// ── Configuración principal ────────────────────────────────────────────────
// Edita estas variables antes de usar la app.
const CONFIG = {
  API_KEY:          'fd01075a76f44d0d954557f521a3f9cd',
  API_BASE:         'https://api.football-data.org/v4',
  SUPABASE_URL:     'https://tzlbxasoyreyvuuvaagk.supabase.co',
  SUPABASE_ANON_KEY:'sb_publishable_TkQLFt_lHoEiXIhmf2n3aQ_bllMh2GN',
  CACHE_TTL:        60000,   // 60 s — límite gratis de football-data.org
  AUTO_REFRESH_MS:  90000    // 90 s — refresco automático si hay partido en vivo
};

// ── Banderas por nombre de equipo (inglés + variantes de la API) ───────────
const FLAGS = {
  // Américas
  'Argentina': '🇦🇷', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽', 'México': '🇲🇽',
  'USA': '🇺🇸', 'United States': '🇺🇸', 'Canada': '🇨🇦',
  'Uruguay': '🇺🇾', 'Colombia': '🇨🇴', 'Ecuador': '🇪🇨',
  'Venezuela': '🇻🇪', 'Chile': '🇨🇱', 'Paraguay': '🇵🇾',
  'Bolivia': '🇧🇴', 'Peru': '🇵🇪', 'Panama': '🇵🇦',
  'Honduras': '🇭🇳', 'El Salvador': '🇸🇻', 'Costa Rica': '🇨🇷',
  'Cuba': '🇨🇺', 'Jamaica': '🇯🇲', 'Trinidad and Tobago': '🇹🇹',

  // Europa
  'France': '🇫🇷', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Portugal': '🇵🇹', 'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪', 'Croatia': '🇭🇷', 'Switzerland': '🇨🇭',
  'Poland': '🇵🇱', 'Denmark': '🇩🇰', 'Sweden': '🇸🇪',
  'Norway': '🇳🇴', 'Austria': '🇦🇹', 'Ukraine': '🇺🇦',
  'Turkey': '🇹🇷', 'Romania': '🇷🇴', 'Serbia': '🇷🇸',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Albania': '🇦🇱',
  'Slovenia': '🇸🇮', 'Slovakia': '🇸🇰', 'Czechia': '🇨🇿',
  'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺', 'Georgia': '🇬🇪',
  'Bosnia and Herzegovina': '🇧🇦', 'Greece': '🇬🇷', 'Iceland': '🇮🇸',
  'Montenegro': '🇲🇪', 'North Macedonia': '🇲🇰', 'Kosovo': '🇽🇰',
  'Finland': '🇫🇮', 'Ireland': '🇮🇪', 'Northern Ireland': '🇬🇧',
  'Luxembourg': '🇱🇺', 'Latvia': '🇱🇻', 'Lithuania': '🇱🇹', 'Estonia': '🇪🇪',

  // África
  'Morocco': '🇲🇦', 'Senegal': '🇸🇳', 'Nigeria': '🇳🇬',
  'Ghana': '🇬🇭', 'Cameroon': '🇨🇲', 'Ivory Coast': '🇨🇮',
  "Côte d'Ivoire": '🇨🇮', 'South Africa': '🇿🇦', 'Algeria': '🇩🇿',
  'Egypt': '🇪🇬', 'Tunisia': '🇹🇳', 'Mali': '🇲🇱', 'Cape Verde': '🇨🇻',
  'Congo DR': '🇨🇩', 'DR Congo': '🇨🇩',

  // Asia & Oceanía
  'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Korea Republic': '🇰🇷',
  'Iran': '🇮🇷', 'IR Iran': '🇮🇷', 'Saudi Arabia': '🇸🇦',
  'Australia': '🇦🇺', 'Qatar': '🇶🇦', 'Indonesia': '🇮🇩',
  'Uzbekistan': '🇺🇿', 'Iraq': '🇮🇶', 'Jordan': '🇯🇴',
  'China PR': '🇨🇳', 'China': '🇨🇳', 'New Zealand': '🇳🇿',
  'Thailand': '🇹🇭', 'Vietnam': '🇻🇳', 'Oman': '🇴🇲',
  'Bahrain': '🇧🇭', 'Kuwait': '🇰🇼', 'UAE': '🇦🇪',
  'United Arab Emirates': '🇦🇪', 'Syria': '🇸🇾',
  'Palestine': '🇵🇸', 'Lebanon': '🇱🇧', 'Kyrgyzstan': '🇰🇬',
  'Tajikistan': '🇹🇯', 'Myanmar': '🇲🇲', 'Philippines': '🇵🇭',

  // África adicional
  'Zambia': '🇿🇲', 'Zimbabwe': '🇿🇼', 'Tanzania': '🇹🇿',
  'Uganda': '🇺🇬', 'Kenya': '🇰🇪', 'Ethiopia': '🇪🇹',
  'Libya': '🇱🇾', 'Sudan': '🇸🇩', 'Mozambique': '🇲🇿',
  'Benin': '🇧🇯', 'Burkina Faso': '🇧🇫', 'Angola': '🇦🇴',
  'Guinea': '🇬🇳', 'Rwanda': '🇷🇼',

  // CONCACAF adicional
  'Curaçao': '🇨🇼', 'Haiti': '🇭🇹', 'Guatemala': '🇬🇹',
  'Nicaragua': '🇳🇮',
};

// ── Nombres de ronda ───────────────────────────────────────────────────────
const ROUND_NAMES = {
  'LAST_32':       'Ronda de 32',    // nuevo en WC 2026 (48 equipos)
  'LAST_16':       'Octavos de Final',
  'QUARTER_FINALS':'Cuartos de Final',
  'SEMI_FINALS':   'Semifinales',
  'THIRD_PLACE':   '3er Lugar',
  'FINAL':         'Final'
};

const ROUND_ORDER = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];

// ── Nombres cortos para países con nombres largos ─────────────────────────
const SHORT_NAMES = {
  'United States':          'USA',
  'Korea Republic':         'Corea',
  'South Korea':            'Corea del Sur',
  'Saudi Arabia':           'Arabia Saudita',
  'Bosnia and Herzegovina': 'Bosnia',
  'Trinidad and Tobago':    'Trinidad',
  "Côte d'Ivoire":          'Costa de Marfil',
  'Ivory Coast':            'Costa de Marfil',
  'New Zealand':            'Nueva Zelanda',
  'South Africa':           'Sudáfrica',
  'North Macedonia':        'Macedonia del Norte',
  'Congo DR':               'Congo RD',
  'DR Congo':               'Congo RD',
  'Cape Verde':             'Cabo Verde',
  'El Salvador':            'El Salvador',
  'Costa Rica':             'Costa Rica',
  'Czech Republic':         'Chequia',
  'Czechia':                'Chequia',
  'IR Iran':                'Irán',
  'China PR':               'China',
};

// ── TLA (3 letras FIFA) → ISO 3166-1 alpha-2 ──────────────────────────────
// Genera el emoji de bandera matemáticamente: no hace falta mantener un
// diccionario por nombre; el TLA que devuelve la API es suficiente.
const TLA_TO_ISO = {
  // CONMEBOL
  'ARG':'AR','BRA':'BR','URU':'UY','COL':'CO','ECU':'EC',
  'VEN':'VE','CHI':'CL','PAR':'PY','BOL':'BO','PER':'PE',
  // CONCACAF
  'USA':'US','MEX':'MX','CAN':'CA','PAN':'PA','CRC':'CR',
  'HON':'HN','SLV':'SV','JAM':'JM','CUB':'CU','TRI':'TT',
  'HAI':'HT','CUR':'CW','GUA':'GT','NCA':'NI',
  // UEFA
  'FRA':'FR','GER':'DE','ESP':'ES','POR':'PT','NED':'NL',
  'BEL':'BE','CRO':'HR','SUI':'CH','POL':'PL','DEN':'DK',
  'SRB':'RS','AUT':'AT','TUR':'TR','UKR':'UA','ROU':'RO',
  'SVK':'SK','SVN':'SI','ALB':'AL','GEO':'GE','HUN':'HU',
  'CZE':'CZ','NOR':'NO','SWE':'SE','FIN':'FI','IRL':'IE',
  'ISL':'IS','GRE':'GR','BIH':'BA','MNE':'ME','MKD':'MK',
  'LUX':'LU',
  // UK nations — banderas de subdivisión (no generables por ISO simple)
  'ENG':'_ENG','SCO':'_SCT','WAL':'_WLS','NIR':'GB',
  // CAF
  'MAR':'MA','SEN':'SN','NGA':'NG','EGY':'EG','ALG':'DZ',
  'TUN':'TN','CMR':'CM','GHA':'GH','CIV':'CI','RSA':'ZA',
  'MLI':'ML','CPV':'CV','COD':'CD','ZAM':'ZM','ZIM':'ZW',
  'TAN':'TZ','UGA':'UG','KEN':'KE','ETH':'ET','LBA':'LY',
  'BEN':'BJ','BFA':'BF','ANG':'AO','GUI':'GN','RWA':'RW',
  'MOZ':'MZ','SLE':'SL','GAM':'GM','LBR':'LR','SUD':'SD',
  // AFC
  'JPN':'JP','KOR':'KR','IRN':'IR','KSA':'SA','AUS':'AU',
  'IRQ':'IQ','UZB':'UZ','JOR':'JO','IDN':'ID','QAT':'QA',
  'CHN':'CN','OMA':'OM','BHR':'BH','KUW':'KW','UAE':'AE',
  'SYR':'SY','PAL':'PS','LBN':'LB','KGZ':'KG','TJK':'TJ',
  'MYA':'MM','PHI':'PH','THA':'TH','VIE':'VN',
  // OFC
  'NZL':'NZ',
};

// TLA → código para flagcdn.com (UK nations usan gb-eng, gb-sct, gb-wls)
const TLA_TO_FLAG_CODE = {};
const _UK_CODE = { '_ENG':'gb-eng', '_SCT':'gb-sct', '_WLS':'gb-wls' };
Object.keys(TLA_TO_ISO).forEach(tla => {
  const iso = TLA_TO_ISO[tla];
  TLA_TO_FLAG_CODE[tla] = _UK_CODE[iso] || iso.toLowerCase();
});

// Nombre completo por TLA (usado cuando la API devuelve name:null)
const TLA_TO_NAME = {
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
  'MAR':'Morocco','SEN':'Senegal','NGA':'Nigeria','EGY':'Egypt','ALG':'Algeria',
  'TUN':'Tunisia','CMR':'Cameroon','GHA':'Ghana','CIV':"Côte d'Ivoire",'RSA':'South Africa',
  'MLI':'Mali','CPV':'Cape Verde','COD':'DR Congo',
  'JPN':'Japan','KOR':'Korea Republic','IRN':'Iran','KSA':'Saudi Arabia','AUS':'Australia',
  'IRQ':'Iraq','UZB':'Uzbekistan','JOR':'Jordan','IDN':'Indonesia','QAT':'Qatar',
  'CHN':'China','NZL':'New Zealand',
};

// ── Imágenes de bandera desde flagcdn.com (funciona en todos los navegadores) ──
function _flagImg(code, alt, size) {
  const s = size || '24x18';
  return `<img src="https://flagcdn.com/${s}/${code}.png" `
       + `srcset="https://flagcdn.com/${s.replace(/\d+x\d+/, w => w.split('x').map(n=>n*2).join('x'))}/${code}.png 2x" `
       + `alt="${alt}" loading="lazy" class="team-flag-img">`;
}

// Devuelve HTML <img> de bandera usando el objeto equipo completo
function getFlagHTML(team, size) {
  if (!team) return '<span class="flag-no">🏳</span>';
  const code = TLA_TO_FLAG_CODE[team.tla];
  const name = team.name || team.shortName || team.tla || '';
  if (code) return _flagImg(code, name, size);
  return '<span class="flag-no">🏳</span>';
}

// Devuelve HTML <img> de bandera a partir del nombre o TLA del equipo
function getFlagHTMLByName(nameOrTla) {
  // Buscar por TLA directo
  if (TLA_TO_FLAG_CODE[nameOrTla]) {
    return _flagImg(TLA_TO_FLAG_CODE[nameOrTla], nameOrTla);
  }
  // Buscar por nombre en FLAGS (que tiene ISO codes guardados como emojis, así que buscamos en TLA_TO_NAME al revés)
  const tla = Object.keys(TLA_TO_NAME).find(k => TLA_TO_NAME[k] === nameOrTla);
  if (tla && TLA_TO_FLAG_CODE[tla]) return _flagImg(TLA_TO_FLAG_CODE[tla], nameOrTla);
  return '<span class="flag-no">🏳</span>';
}

// Nombre para mostrar: usa TLA_TO_NAME si el name es un código TLA o está vacío
function getTeamName(team) {
  if (!team) return 'Por definir';
  if (team.name && team.name.length > 3) return team.name; // nombre completo
  if (team.tla && TLA_TO_NAME[team.tla]) return TLA_TO_NAME[team.tla]; // lookup por TLA
  return team.name || team.shortName || team.tla || 'Por definir';
}

function getDisplayName(name) {
  return SHORT_NAMES[name] || name;
}

function getMatchResult(match) {
  if (!match || match.status !== 'FINISHED') return null;
  const w = match.score && match.score.winner;
  if (w === 'HOME_TEAM') return getTeamName(match.homeTeam);
  if (w === 'AWAY_TEAM') return getTeamName(match.awayTeam);
  return null;
}
