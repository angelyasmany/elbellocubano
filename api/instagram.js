'use strict';

/**
 * API /api/instagram — Instagram @elbellocubano
 * 1) Instagram Graph (solo cuando se configura INSTAGRAM_ACCESS_TOKEN en Vercel)
 * 2) Livecounts embed (enlace facilitado por el propietario)
 * 3) Livecounts página del contador (otro formato del MISMO proveedor)
 * 4) Mixerno, fuente independiente de último recurso.
 *
 * Nunca se interpreta un iframe como JSON ni se usa un número de prueba
 * (1000, metas, visualizaciones o contadores de otras cuentas).
 */
const HANDLE = 'elbellocubano';
// Es la dirección JSON utilizada por el widget original de Livecounts.
const LIVE_API = `https://livecounts.nl/api/instagram/${HANDLE}`;
const EMBED = `https://livecounts.nl/instagram-realtime/embed/?u=${HANDLE}&theme=light&size=m`;
const PAGE = `https://livecounts.nl/instagram-realtime/?u=${HANDLE}`;
const MIXERNO = `https://mixerno.space/instagram-user-counter/${HANDLE}`;
const CACHE_MS = 5_000;
const LAST_GOOD_MS = 60 * 60 * 1000;
const FETCH_MS = 5200;
let cache = null;
let pending = null;

function validCount(raw) {
  const input = String(raw ?? '').replace(/[\u00a0\u202f]/g, ' ').trim();
  // Solo enteros completos; las cifras aproximadas como 4.5K/4,5K no sirven.
  if (!/^(?:\d{1,12}|\d{1,3}(?:[., ]\d{3}){1,4})$/.test(input)) {
    throw new Error('Cifra no exacta o incompleta');
  }
  const value = Number(input.replace(/[., ]/g, ''));
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Cifra no válida');
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
function withinAccountSection(text) {
  const at = text.toLowerCase().indexOf('@' + HANDLE);
  if (at < 0) throw new Error('La página no identifica el perfil @' + HANDLE);
  // No tomar estadísticas de cuentas comparadas/populares en otra sección.
  const after = text.slice(at + HANDLE.length + 1, at + HANDLE.length + 1 + 500);
  const nextAccount = after.search(/@[a-z0-9._]{2,32}/i);
  return nextAccount >= 0 ? after.slice(0, nextAccount) : after;
}
function parseNearFollowers(text) {
  const account = withinAccountSection(text);
  const before = new RegExp('\\b' + COUNT + '\\s*(?:followers|seguidores)\\b', 'i');
  const after = new RegExp('\\b(?:followers|seguidores)(?:\\s+(?:count|total))?\\s*[:=-]?\\s*' + COUNT + '\\b', 'i');
  for (const regex of [before, after]) {
    const m = account.match(regex);
    if (m) return validCount(m[1]);
  }
  throw new Error('No se encontró el número junto al perfil y a la etiqueta de seguidores');
}

function parseLivecounts(html) {
  if (typeof html !== 'string' || html.length < 30) throw new Error('Livecounts no respondió con HTML válido');
  if (/(?:cf-chl-|just a moment|checking your browser|verify you are human)/i.test(html)) {
    throw new Error('Livecounts requiere una verificación de navegador');
  }
  const visible = plain(html);
  const count = parseNearFollowers(visible);
  const source_stale = /(?:latest available|updates delayed|último dato disponible)/i.test(visible) ||
    /(?:last public figure we pulled|last recorded count|última cifra)/i.test(visible);
  return { count, source_stale };
}

function parseMixerno(html) {
  if (typeof html !== 'string' || html.length < 30) throw new Error('Mixerno no respondió con HTML válido');
  if (/(?:cf-chl-|just a moment|checking your browser)/i.test(html)) throw new Error('Mixerno requiere navegador');
  const visible = plain(html);
  const count = parseNearFollowers(visible);
  // Mixerno suele mostrar una cifra histórica; conservar esa advertencia.
  const source_stale = /(?:latest available|updates delayed|last count|último dato|retrasado)/i.test(visible);
  return { count, source_stale };
}

async function textResponse(url, timeoutMs = FETCH_MS) {
  const timerAbort = new AbortController();
  const timer = setTimeout(() => timerAbort.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: timerAbort.signal,
      redirect: 'follow',
      headers: {
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.7',
        'Accept-Language': 'es-PE,es;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; ElBelloCubanoCounter/1.0)'
      }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const type = r.headers.get('content-type') || '';
    if (type && !/(?:html|text|json)/i.test(type)) throw new Error('Formato inesperado del proveedor');
    const data = await r.text();
    if (data.length > 1_500_000) throw new Error('Documento demasiado grande');
    return data;
  } finally { clearTimeout(timer); }
}

async function officialCount() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return null;
  const url = new URL('https://graph.instagram.com/v24.0/me');
  url.searchParams.set('fields', 'id,username,followers_count');
  url.searchParams.set('access_token', token);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetch(url.href, { signal: controller.signal, headers: {Accept:'application/json'} });
    if (!r.ok) throw new Error(`Instagram Graph HTTP ${r.status}`);
    const data = await r.json();
    if (String(data.username || '').replace(/^@/, '').toLowerCase() !== HANDLE) {
      throw new Error('El token pertenece a otra cuenta');
    }
    return { count: validCount(data.followers_count), fuente: 'Instagram Graph API', source_stale: false };
  } finally { clearTimeout(timer); }
}

function parseLivecountsJSON(data) {
  const username = String(data?.username || '').replace(/^@/, '').toLowerCase();
  if (username !== HANDLE) throw new Error('Livecounts respondió por otra cuenta');
  if (typeof data.followers !== 'number' || !Number.isSafeInteger(data.followers) || data.followers <= 0) {
    throw new Error('Livecounts no devolvió un contador válido');
  }
  const stamp = Number(data.fetched_at);
  const validDate = Number.isFinite(stamp) && stamp > 0 && stamp <= Date.now() + 60_000;
  return { count: data.followers, fuente: 'Livecounts.nl · API del widget',
    updated_at: validDate ? new Date(stamp).toISOString() : null,
    source_stale: data.delayed === true || (validDate && Date.now() - stamp > 60_000) };
}

async function livecountsCount() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const response = await fetch(LIVE_API, {signal:controller.signal, headers:{Accept:'application/json'}});
    if (!response.ok) throw new Error(`Livecounts API HTTP ${response.status}`);
    return parseLivecountsJSON(await response.json());
  } finally { clearTimeout(timer); }
}

async function obtain() {
  const errors = [];
  // La API oficial requiere una autorización propia; sin token no se consulta.
  try {
    const official = await officialCount();
    if (official) return official;
  } catch (err) { errors.push(`Meta: ${err.message}`); }

  try { return await livecountsCount(); }
  catch (err) { errors.push(err.name === 'AbortError' ? 'Livecounts API: timeout' : err.message); }

  // Ambas direcciones Livecounts son de un mismo proveedor; se prueban en
  // paralelo para que el fallo de una no retrase la carga en el navegador.
  const routes = [
    { url: EMBED, label: 'Livecounts Instagram embed' },
    { url: PAGE, label: 'Livecounts Instagram página' }
  ];
  const attempts = await Promise.allSettled(routes.map(route => textResponse(route.url)
    .then(html => parseLivecounts(html))));
  const valid = [];
  for (let i = 0; i < attempts.length; i++) {
    const result = attempts[i];
    if (result.status === 'fulfilled') {
      valid.push({ ...result.value, fuente: routes[i].label });
    } else {
      errors.push(`${routes[i].label}: ${result.reason?.name === 'AbortError' ? 'timeout' : result.reason?.message || 'error'}`);
    }
  }

  // Si el embed reporta un valor de demostración (p. ej. 1.000) y la página
  // principal informa otro muy distinto, no tomar ciegamente el primero.
  const conflict = valid.length === 2 &&
    Math.abs(valid[0].count - valid[1].count) > Math.max(100, Math.max(valid[0].count, valid[1].count) * 0.12);
  const suspiciousSingle = valid.length === 1 && valid[0].count === 1000;
  if (valid.length && !conflict && !suspiciousSingle) return valid[0];

  try {
    const result = parseMixerno(await textResponse(MIXERNO));
    const secondary = { ...result, fuente: 'Mixerno.Space Instagram (respaldo)' };
    if (!valid.length) return secondary;
    // La fuente independiente decide ante dos lecturas contradictorias.
    const matched = valid.find(v => Math.abs(v.count - secondary.count) <=
      Math.max(30, secondary.count * 0.08));
    if (matched) return { ...matched, source_stale: matched.source_stale || secondary.source_stale };
    if (valid.length === 1) return secondary;
    throw new Error('Tres fuentes presentaron cantidades incompatibles');
  } catch (err) {
    errors.push(`Mixerno: ${err.name === 'AbortError' ? 'timeout' : err.message}`);
  }
  if (conflict) throw new Error(`Livecounts embed y página mostraron cifras contradictorias | ${errors.join(' | ')}`);
  if (suspiciousSingle) throw new Error(`La única lectura fue 1.000 sin corroboración | ${errors.join(' | ')}`);
  throw new Error(errors.join(' | '));
}

async function read() {
  if (cache && Date.now() - cache.time < CACHE_MS) return cache.data;
  if (pending) return pending;
  pending = (async () => {
    try {
      const value = await obtain();
      const data = {
        consulta_ok: true, platform: 'instagram', cuenta: HANDLE,
        count: value.count, fuente: value.fuente, source_stale: value.source_stale,
        updated_at: value.updated_at || null, queried_at: new Date().toISOString()
      };
      cache = { data, time: Date.now() };
      return data;
    } catch (err) {
      if (cache && Date.now() - cache.time < LAST_GOOD_MS) {
        return { ...cache.data, source_stale: true,
          nota: 'Última cifra verificada en este servidor; los proveedores fallaron ahora' };
      }
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
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=5');
    return res.status(200).json(data);
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ consulta_ok: false, platform: 'instagram', cuenta: HANDLE,
      count: null, estimated: false, source_stale: true,
      nota: 'No hay una cifra de seguidores verificable en este momento.',
      source_error: err.message });
  }
}
module.exports = handler;
module.exports._test = { validCount, parseLivecounts, parseMixerno, parseLivecountsJSON, livecountsCount, obtain, read };
