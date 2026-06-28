// ── Cliente Supabase (null cuando no está configurado) ────────────────────
let _sb = null;
let _realtimeChannel = null;

function isSupabaseConfigured() {
  return Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
}

function initSupabase() {
  if (!isSupabaseConfigured()) return false;
  if (typeof supabase === 'undefined') {
    console.warn('[Supabase] SDK no disponible. Usando localStorage.');
    return false;
  }
  try {
    _sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    console.info('[Supabase] Conectado correctamente.');
    return true;
  } catch (e) {
    console.error('[Supabase] Error al inicializar:', e.message);
    return false;
  }
}

// ── Fallback: localStorage ─────────────────────────────────────────────────

function _lsKey(userName) {
  return `wc26_preds_${userName}`;
}

function _lsGetPreds(userName) {
  return JSON.parse(localStorage.getItem(_lsKey(userName)) || '{}');
}

function _lsSetPreds(userName, preds) {
  localStorage.setItem(_lsKey(userName), JSON.stringify(preds));
}

function _lsGetAll() {
  const all = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('wc26_preds_')) continue;
    const user_name = key.slice('wc26_preds_'.length);
    const preds = JSON.parse(localStorage.getItem(key) || '{}');
    Object.entries(preds).forEach(([match_id, predicted_winner]) => {
      all.push({ user_name, match_id: Number(match_id), predicted_winner });
    });
  }
  return all;
}

// ── API pública ────────────────────────────────────────────────────────────

/**
 * Guarda o actualiza una predicción (upsert).
 * Si Supabase no está configurado, usa localStorage.
 */
async function savePrediction(userName, matchId, predictedWinner) {
  if (!_sb) {
    const preds = _lsGetPreds(userName);
    preds[matchId] = predictedWinner;
    _lsSetPreds(userName, preds);
    return { success: true, storage: 'local' };
  }

  // Asegurar que el usuario exista
  await _sb.from('users').upsert({ user_name: userName }, { onConflict: 'user_name' });

  const { error } = await _sb
    .from('predictions')
    .upsert(
      { user_name: userName, match_id: matchId, predicted_winner: predictedWinner },
      { onConflict: 'user_name,match_id' }
    );

  if (error) {
    console.warn('[Supabase] Error al guardar, usando localStorage:', error.message);
    const preds = _lsGetPreds(userName);
    preds[matchId] = predictedWinner;
    _lsSetPreds(userName, preds);
    return { success: true, storage: 'local' };
  }

  return { success: true, storage: 'supabase' };
}

/**
 * Devuelve todas las predicciones de un usuario.
 * Formato: [{ match_id, predicted_winner, user_name }]
 */
async function getUserPredictions(userName) {
  if (!_sb) {
    const preds = _lsGetPreds(userName);
    return Object.entries(preds).map(([match_id, predicted_winner]) => ({
      match_id: Number(match_id), predicted_winner, user_name: userName
    }));
  }

  const { data, error } = await _sb
    .from('predictions')
    .select('*')
    .eq('user_name', userName);

  if (error) {
    console.warn('[Supabase] Error al leer predicciones:', error.message);
    const preds = _lsGetPreds(userName);
    return Object.entries(preds).map(([match_id, predicted_winner]) => ({
      match_id: Number(match_id), predicted_winner, user_name: userName
    }));
  }

  return data || [];
}

/**
 * Devuelve todas las predicciones de todos los usuarios.
 */
async function getAllPredictions() {
  if (!_sb) return _lsGetAll();

  const { data, error } = await _sb.from('predictions').select('*');
  if (error) {
    console.warn('[Supabase] Error al leer todas las predicciones:', error.message);
    return _lsGetAll();
  }
  return data || [];
}

/**
 * Calcula el ranking global.
 * Devuelve array ordenado: [{ name, correct, wrong, pending, total }]
 */
async function getRanking(matchesData) {
  const allPreds = await getAllPredictions();
  const map = {};

  allPreds.forEach(pred => {
    if (!map[pred.user_name]) {
      map[pred.user_name] = { name: pred.user_name, correct: 0, wrong: 0, pending: 0, total: 0 };
    }
    const u = map[pred.user_name];
    const match = matchesData.find(m => m.id === pred.match_id);
    if (!match) return;

    const result = getMatchResult(match);
    if (result === null) {
      u.pending++;
    } else if (pred.predicted_winner === result) {
      u.correct++;
      u.total++;
    } else {
      u.wrong++;
      u.total++;
    }
  });

  return Object.values(map).sort((a, b) =>
    b.correct - a.correct || (b.correct + b.wrong) - (a.correct + a.wrong)
  );
}

/**
 * Suscribe a cambios en tiempo real en la tabla predictions (Supabase Realtime).
 * Llama a callback cada vez que hay un INSERT, UPDATE o DELETE.
 */
function subscribeToRankingUpdates(callback) {
  if (!_sb) return null;

  if (_realtimeChannel) {
    _sb.removeChannel(_realtimeChannel);
  }

  _realtimeChannel = _sb
    .channel('ranking-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, callback)
    .subscribe();

  return _realtimeChannel;
}
