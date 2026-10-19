'use strict';

// Facebook de El Bello Cubano. La URL /embed/ es un documento HTML para iframes,
// NO una API JSON. Solo devolvemos un número si está publicado en su respuesta HTTP.
// Si Livecounts lo dibuja exclusivamente mediante JavaScript, no podemos leerlo
// desde una función Node de Vercel (ni desde otro iframe por la política same-origin).
const HANDLE = 'elbellocubano';
const EMBED = `https://livecounts.nl/facebook-realtime/embed/?u=${HANDLE}`;
const PAGE = `https://livecounts.nl/facebook-realtime/?u=${HANDLE}`;
const SOURCES = [EMBED, PAGE];
const CACHE_MS = 30_000;
const STALE_MS = 15 * 60_000;
let previous = null;
let inFlight = null;

function validCount(raw) {
  const input = String(raw ?? '').trim().replace(/[\u00a0\u202f]/g, ' ');
  if (!/^(?:\d+|\d{1,3}(?:[,. ]\d{3})+)$/.test(input)) throw new Error('Cifra inválida');
  const count = Number(input.replace(/[,. ]/g, ''));
  // No confundir el 0 inicial de un contador aún no cargado con una cifra real.
  if (!Number.isSafeInteger(count) || count <= 0) throw new Error('Sin seguidores verificables');
  return count;
}

function attributes(tag) {
  const out = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3];
  }
  return out;
}

function metaFrom(html) {
  const out = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = attributes(tag);
    if (attrs.property || attrs.name) out[(attrs.property || attrs.name).toLowerCase()] = attrs.content || '';
  }
  return out;
}

function extractCount(html, expectedUrl) {
  const meta = metaFrom(html);
  const canonicalText = meta['og:url'] || '';
  let urlVerified = false;
  if (canonicalText) {
    try {
      const canonical = new URL(canonicalText);
      urlVerified = canonical.hostname === 'livecounts.nl' &&
        ['/facebook-realtime/', '/facebook-realtime/embed/'].includes(canonical.pathname) &&
        canonical.searchParams.get('u')?.toLowerCase() === HANDLE;
      if (!urlVerified) throw new Error('Livecounts muestra otra cuenta');
    } catch (e) { throw new Error('Livecounts no confirmó esta cuenta'); }
  }
  const noScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  const visible = noScripts.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  const title = meta['og:title'] || '';
  const description = meta['og:description'] || meta.description || '';
  const handleSeen = new RegExp(`\\b${HANDLE}\\b`, 'i').test(`${title} ${description} ${visible} ${html}`);
  if (!urlVerified && !handleSeen) throw new Error('Livecounts no confirmó el perfil elbellocubano');

  // Primero metadatos de la cuenta. Algunas versiones muestran la cifra aquí,
  // aunque el contador visible se actualiza después por JavaScript.
  const fields = [description, title, visible];
  const patterns = [
    /(?:seguidores|followers)\s*(?:de|on|count|:|=|—|-)?\s*([\d][\d,. ]{0,18})\b/i,
    /\b([\d][\d,. ]{0,18})\s*(?:seguidores|followers)\b/i,
  ];
  for (const field of fields) {
    for (const pattern of patterns) {
      const m = field.match(pattern);
      if (m) {
        try { return validCount(m[1]); } catch (_) { /* ignorar 0 o marcadores */ }
      }
    }
  }

  // Contadores publicados directamente en HTML, no valores de ejemplo genéricos.
  for (const match of noScripts.matchAll(/<([a-z][\w:-]*)\b([^>]*)>([\d][\d,. ]{0,18})<\/\1>/gi)) {
    const attr = match[2];
    if (/\b(?:follower(?:s|count)?|seguidores)\b/i.test(attr)) {
      try { return validCount(match[3]); } catch (_) { /* siguiente */ }
    }
  }

  // Estado inicial en JSON embebido. Se requiere que la página corresponda
  // a la cuenta pedida; no se leen números arbitrarios de otros scripts.
  const statePatterns = [
    /["'](?:followerCount|followers_count|followersCount|follower_count)["']\s*:\s*["']?(\d+(?:[,. ]\d+)*)/gi,
    /["']followers["']\s*:\s*["']?(\d+(?:[,. ]\d+)*)/gi,
  ];
  for (const pattern of statePatterns) {
    for (const match of html.matchAll(pattern)) {
      try { return validCount(match[1]); } catch (_) { /* siguiente */ }
    }
  }
  throw new Error('El iframe no entrega un número de seguidores en el HTML; posiblemente se carga por JavaScript');
}

async function fetchSource(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'Accept-Language': 'es-PE,es;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; ElBelloCubanoCounter/1.0)'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = response.headers?.get?.('content-type') || '';
    if (type && !/(html|json|text)/i.test(type)) throw new Error('Livecounts respondió con contenido no legible');
    return extractCount(await response.text(), url);
  } finally {
    clearTimeout(timer);
  }
}

async function getCount() {
  if (previous && Date.now() - previous.time < CACHE_MS) return previous.data;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const failures = [];
    for (const url of SOURCES) {
      try {
        const count = await fetchSource(url);
        const data = {
          consulta_ok: true, platform: 'facebook', cuenta: HANDLE, count,
          fuente: url === EMBED ? 'Livecounts embed' : 'Livecounts página',
          fuente_url: url, source_stale: true, updated_at: null,
          queried_at: new Date().toISOString()
        };
        previous = { time: Date.now(), data };
        return data;
      } catch (e) {
        failures.push(`${url === EMBED ? 'embed' : 'página'}: ${e.name === 'AbortError' ? 'tiempo agotado' : e.message}`);
      }
    }
    // Respaldo únicamente con un valor comprobado previamente por ESTA función.
    if (previous && Date.now() - previous.time < STALE_MS) {
      return {...previous.data, source_stale: true, queried_at: new Date().toISOString()};
    }
    const error = new Error(failures.join(' | '));
    error.code = 'NO_COUNT';
    throw error;
  })();
  try { return await inFlight; } finally { inFlight = null; }
}

async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({consulta_ok:false,nota:'Solo GET'});
  }
  try {
    const data = await getCount();
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      consulta_ok: false, platform: 'facebook', cuenta: HANDLE, count: null,
      embed_url: EMBED,
      nota: e.message,
      explicacion: 'El iframe puede mostrar un número en un navegador sin publicarlo en el HTML. En ese caso se necesita una API de datos para poder sumarlo.'
    });
  }
}

module.exports = handler;
module.exports._test = { validCount, extractCount, getCount };
