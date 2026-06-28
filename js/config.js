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

// Banderas de subdivisiones del Reino Unido (emoji secuencias especiales)
const _UK_FLAGS = { '_ENG':'🏴󠁧󠁢󠁥󠁮󠁧󠁿', '_SCT':'🏴󠁧󠁢󠁳󠁣󠁴󠁿', '_WLS':'🏴󠁧󠁢󠁷󠁬󠁳󠁿' };

// Convierte código ISO2 al emoji de bandera
function _iso2ToEmoji(iso2) {
  if (_UK_FLAGS[iso2]) return _UK_FLAGS[iso2];
  return [...iso2.toUpperCase()].map(c =>
    String.fromCodePoint(c.codePointAt(0) + 127397)
  ).join('');
}

// ── Utilidades globales ────────────────────────────────────────────────────

// Busca bandera primero en FLAGS (nombre), luego en TLA_TO_ISO
function getFlag(nameOrTla) {
  if (FLAGS[nameOrTla]) return FLAGS[nameOrTla];
  const iso = TLA_TO_ISO[nameOrTla];
  return iso ? _iso2ToEmoji(iso) : '🏳';
}

// Obtiene bandera desde el objeto equipo completo (usa TLA como prioridad)
function getFlagFromTeam(team) {
  if (!team) return '🏳';
  if (team.tla && TLA_TO_ISO[team.tla]) return _iso2ToEmoji(TLA_TO_ISO[team.tla]);
  return getFlag(team.name || team.shortName || '');
}

function getDisplayName(name) {
  return SHORT_NAMES[name] || name;
}

function getMatchResult(match) {
  if (!match || match.status !== 'FINISHED') return null;
  const w = match.score && match.score.winner;
  if (w === 'HOME_TEAM') return (match.homeTeam && match.homeTeam.name) || null;
  if (w === 'AWAY_TEAM') return (match.awayTeam && match.awayTeam.name) || null;
  return null; // empate no aplica en eliminatorias
}
