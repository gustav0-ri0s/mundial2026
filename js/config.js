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

// ── Utilidades globales ────────────────────────────────────────────────────
function getFlag(name) {
  return FLAGS[name] || '🏳';
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
