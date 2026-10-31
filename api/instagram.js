'use strict';

/**
 * /api/instagram — @elbellocubano
 * - Prioridad: API oficial de Instagram cuando el propietario configura token.
 * - Respaldo: JSON de Livecounts, dos versiones verificadas de Livecounts y Mixerno.
 * - No se inventan cifras, ni se aceptan cifras de cuentas ajenas o de demostración.
 * - Caché de memoria por instancia + CDN; el navegador guarda su último dato propio.
 *   NOTA: las funciones sin estado de Vercel NO garantizan memoria entre arranques.
 */
const HANDLE = 'elbellocubano';
const LIVE_API = `https://livecounts.nl/api/instagram/${HANDLE}`;
const EMBED = `https://livecounts.nl/instagram-realtime/embed/?u=${HANDLE}&theme=light&size=m`;
const PAGE = `https://livecounts.nl/instagram-realtime/?u=${HANDLE}`;
const MIXERNO = `https://mixerno.space/instagram-user-counter/${HANDLE}`;

const CACHE_MS = 90 * 1000;
const LAST_GOOD_MS = 30 * 24 * 60 * 60 * 1000;
const RETRY_ON_FAILURE_MS = 30 * 1000;
const LIVE_FETCH_MS = 3500;
const OFFICIAL_FETCH_MS = 3000;
const MIXERNO_FETCH_MS = 2300;

let cache = null;       // último dato fiable obtenido en ESTA instancia de Vercel
let pending = null;     // impide repetir consultas simultáneas en la misma instancia
let nextRetryAt = 0;
let lastError = '';
let lastWarningAt = 0;

function validCount(raw) {
  const input = String(raw ?? '').replace(/[\u00a0\u202f]/g, ' ').trim();
  // Ni 4.5K ni 1.000K son números exactos de seguidores.
  if (!/^(?:\d{1,12}|\d{1,3}(?:[., ]\d{3}){1,4})$/.test(input)) {
    throw new Error('Cifra aproximada o no válida');
  }
  const value = Number(input.replace(/[., ]/g, ''));
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Cifra fuera de rango');
  return value;
}

function plain(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|#160|#xA0);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ').trim();
}
const COUNT = '(\\d{1,3}(?:[., ]\\d{3}){1,4}|\\d{1,12})';
function parseNearFollowers(text) {
  // Usar solo la sección identificada con @elbellocubano, no los trending users.
  const marker = '@' + HANDLE;
  const index = text.toLowerCase().indexOf(marker);
  if (index < 0) throw new Error('No se identifica el perfil @' + HANDLE);
  const before = text.slice(Math.max(0, index - 180), index);
  let after = text.slice(index + marker.length, index + marker.length + 500);
  const other = after.search(/@[a-z0-9._]{2,32}/i);
  if (other >= 0) after = after.slice(0, other);
  const regions = [after, before];
  const suffix = new RegExp('\\b' + COUNT + '\\s*(?:followers|seguidores)\\b', 'i');
  const prefix = new RegExp('\\b(?:followers|seguidores)(?:\\s+(?:count|total))?\\s*[:=-]?\\s*' + COUNT + '\\b', 'i');
  for (const region of regions) for (const re of [suffix, prefix]) {
    const m = region.match(re);
    if (m) return validCount(m[1]);
  }
  throw new Error('No hay cifra de seguidores asociada al perfil');
}
function parseLivecounts(html) {
  if (typeof html !== 'string' || html.length < 30) throw new Error('HTML de Livecounts incompleto');
  if (/(?:cf-chl-|just a moment|checking your browser|verify you are human)/i.test(html)) {
    throw new Error('Livecounts solicita verificación del navegador');
  }
  const visible = plain(html);
  return {
    count: parseNearFollowers(visible),
    source_stale: /(?:latest available|updates delayed|último dato disponible|last public figure we pulled|last recorded count|última cifra)/i.test(visible)
  };
}
function parseMixerno(html) {
  if (typeof html !== 'string' || html.length < 30) throw new Error('HTML de Mixerno incompleto');
  if (/(?:cf-chl-|just a moment|checking your browser)/i.test(html)) throw new Error('Mixerno solicita verificación del navegador');
  return { count: parseNearFollowers(plain(html)), source_stale: true };
}

async function textResponse(url, ms = LIVE_FETCH_MS) {
  // Temporizador que incluye también la lectura del cuerpo, no solo la cabecera.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: controller.signal, redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.7',
        'Accept-Language': 'es-PE,es;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; ElBelloCubanoCounter/1.1)'
      }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const type = r.headers.get('content-type') || '';
    if (type && !/(?:html|text)/i.test(type)) throw new Error('El proveedor devolvió un formato inesperado');
    const body = await r.text();
    if (body.length > 1_500_000) throw new Error('HTML demasiado grande');
    return body;
  } finally { clearTimeout(timeout); }
}
async function officialCount() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return null;
  const url = 'https://graph.instagram.com/v24.0/me?fields=id,username,followers_count';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFFICIAL_FETCH_MS);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
    });
    if (!r.ok) throw new Error(`Graph HTTP ${r.status}`);
    const data = await r.json();
    if (String(data.username || '').replace(/^@/, '').toLowerCase() !== HANDLE) {
      throw new Error('La autorización corresponde a otra cuenta');
    }
    return { count: validCount(data.followers_count), fuente: 'Instagram Graph API', source_stale: false };
  } finally { clearTimeout(timeout); }
}
function parseLivecountsJSON(data) {
  const username = String(data?.username || '').replace(/^@/, '').toLowerCase();
  if (username !== HANDLE) throw new Error('Livecounts devolvió otra cuenta');
  if (typeof data.followers !== 'number' || !Number.isSafeInteger(data.followers) || data.followers <= 0) {
    throw new Error('El JSON no contiene una cifra exacta');
  }
  let stamp = Number(data.fetched_at);
  if (stamp > 0 && stamp < 1e12) stamp *= 1000; // algunas APIs devuelven segundos UNIX
  const validDate = Number.isFinite(stamp) && stamp > 0 && stamp <= Date.now() + 60_000;
  return {
    count: data.followers,
    fuente: 'Livecounts.nl · JSON',
    updated_at: validDate ? new Date(stamp).toISOString() : null,
    source_stale: data.delayed === true || (validDate && Date.now() - stamp > 120_000)
  };
}
async function livecountsCount() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LIVE_FETCH_MS);
  try {
    const r = await fetch(LIVE_API, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`JSON HTTP ${r.status}`);
    const data = await r.json();
    return parseLivecountsJSON(data);
  } finally { clearTimeout(timeout); }
}
function compatible(a, b) {
  return Math.abs(a - b) <= Math.max(30, Math.max(a, b) * 0.08);
}
async function obtain() {
  const errors = [];
  try {
    const official = await officialCount();
    if (official) return official;
  } catch (err) { errors.push('Graph: ' + (err.name === 'AbortError' ? 'timeout' : err.message)); }

  // Consultas simultáneas: el peor caso de Livecounts tarda ~3,5 s, no ~10 s.
  const providers = [
    { label: 'Livecounts JSON', run: livecountsCount },
    { label: 'Livecounts iframe', run: async () => ({ ...parseLivecounts(await textResponse(EMBED)), fuente: 'Livecounts.nl · iframe' }) },
    { label: 'Livecounts página', run: async () => ({ ...parseLivecounts(await textResponse(PAGE)), fuente: 'Livecounts.nl · página' }) }
  ];
  const attempts = await Promise.allSettled(providers.map(p => p.run()));
  const good = [];
  for (let i = 0; i < attempts.length; i++) {
    const result = attempts[i];
    if (result.status === 'fulfilled') good.push(result.value);
    else errors.push(providers[i].label + ': ' + (result.reason?.name === 'AbortError' ? 'timeout' : result.reason?.message || 'error'));
  }
  // JSON válido de la cuenta tiene prioridad si coincide con la página, o si no
  // aparece ninguna lectura fiable de HTML. Se rechaza 1000 sin corroboración.
  const json = good.find(v => v.fuente === 'Livecounts.nl · JSON');
  const html = good.filter(v => v !== json);
  const htmlConflict = html.length === 2 && !compatible(html[0].count, html[1].count);
  if (json && json.count !== 1000) {
    if (!html.length || html.some(v => compatible(json.count, v.count))) return json;
  }
  if (html.length && !htmlConflict) {
    const chosen = html.find(v => v.count !== 1000) || (html.length === 2 && html.every(v => v.count === 1000) ? html[0] : null);
    if (chosen && (!json || compatible(json.count, chosen.count))) return chosen;
  }
  if (json && json.count === 1000 && html.some(v => v.count === 1000)) return json;

  // Respaldo independiente solo cuando Livecounts no ofrece un dato concordante.
  try {
    const secondary = { ...parseMixerno(await textResponse(MIXERNO, MIXERNO_FETCH_MS)), fuente: 'Mixerno.Space (respaldo, posiblemente antiguo)' };
    const match = good.find(v => compatible(v.count, secondary.count) && v.count !== 1000);
    if (match) return { ...match, source_stale: match.source_stale || secondary.source_stale };
    // Mixerno es un dato histórico; nunca presentarlo como cifra en tiempo real.
    if (good.length === 0) return secondary;
    errors.push('Cifras incompatibles entre Livecounts y Mixerno');
  } catch (err) { errors.push('Mixerno: ' + (err.name === 'AbortError' ? 'timeout' : err.message)); }
  throw new Error(errors.join(' | ') || 'Ningún proveedor proporcionó una cifra verificable');
}

function warnOnce(message) {
  const now = Date.now();
  if (now - lastWarningAt < 10 * 60 * 1000) return;
  lastWarningAt = now;
  console.warn('[instagram] No se pudo actualizar el contador:', message);
}
async function read() {
  const now = Date.now();
  if (cache && now - cache.time < CACHE_MS) return cache.data;
  if (now < nextRetryAt) {
    if (cache && now - cache.time < LAST_GOOD_MS) return { ...cache.data, source_stale: true,
      nota: 'Última cifra verificable de esta instancia (fuentes temporalmente no disponibles)' };
    throw new Error(lastError || 'Reintento pendiente');
  }
  if (pending) return pending;
  pending = (async () => {
    try {
      const value = await obtain();
      const checkedAt = value.updated_at || (value.source_stale ? null : new Date().toISOString());
      const data = {
        consulta_ok: true, platform: 'instagram', cuenta: HANDLE,
        count: value.count, fuente: value.fuente, source_stale: value.source_stale === true,
        updated_at: checkedAt, queried_at: new Date().toISOString(), estimated: false
      };
      // No borrar un dato reciente verificado con una cifra antigua sin fecha.
      if (!cache || !data.source_stale || (data.updated_at && !cache.data.updated_at) ||
          (data.updated_at && cache.data.updated_at && Date.parse(data.updated_at) >= Date.parse(cache.data.updated_at))) {
        cache = { data, time: Date.now() };
      }
      nextRetryAt = 0;
      lastError = '';
      return (cache && cache.data !== data && cache.data.count !== data.count)
        ? { ...cache.data, source_stale: true, nota: 'Se conservó la última cifra fiable' }
        : data;
    } catch (err) {
      lastError = err.message;
      nextRetryAt = Date.now() + RETRY_ON_FAILURE_MS;
      warnOnce(lastError);
      if (cache && Date.now() - cache.time < LAST_GOOD_MS) return {
        ...cache.data, source_stale: true,
        nota: 'Última cifra verificable de esta instancia; los proveedores fallaron ahora'
      };
      throw err;
    }
  })();
  try { return await pending; } finally { pending = null; }
}
async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ consulta_ok: false, nota: 'Solo GET' });
  }
  try {
    const data = await read();
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=90, stale-while-revalidate=240');
    return res.status(200).json(data);
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      consulta_ok: false, platform: 'instagram', cuenta: HANDLE,
      count: null, estimated: false, source_stale: true,
      nota: 'No hay una cifra verificable ahora; conservar el respaldo visual en el navegador.',
      source_error: err.message
    });
  }
}
module.exports = handler;
module.exports._test = { validCount, parseNearFollowers, parseLivecounts, parseMixerno,
  parseLivecountsJSON, livecountsCount, obtain, read };
