"use strict";

// El Bello Cubano - Facebook followers endpoint.
// La URL embed de Livecounts es un iframe HTML, NO una API JSON.
// Si Livecounts no entrega una cifra en el HTML, devolvemos un error claro
// y el frontend ofrece el contador visual en el iframe como respaldo.
// Opcional: FACEBOOK_PAGE_ID y FACEBOOK_PAGE_ACCESS_TOKEN en Vercel para Graph API.
const HANDLE = 'elbellocubano';
const EMBED_URL = `https://livecounts.nl/facebook-realtime/embed/?u=${HANDLE}`;
const PAGE_URL = `https://livecounts.nl/facebook-realtime/?u=${HANDLE}`;
const FRESH_MS = 60_000;
const LAST_GOOD_MS = 60 * 60 * 1000;
let lastGood = null;
let pending = null;

function parseNumber(raw) {
  const clean = String(raw ?? '').replace(/[\u00a0\u202f]/g, ' ').trim();
  if (!/^(?:[0-9]+|[0-9]{1,3}(?:[,. ]{3}[0-9]{3})+|[0-9]{1,3}(?:[,. ][0-9]{3})+)$/.test(clean)) {
    throw new Error('Número incompleto o aproximado');
  }
  const value = Number(clean.replace(/[,. ]/g, ''));
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('No hay una cifra de seguidores verificable');
  return value;
}

function stripTags(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|#160|#xA0);/gi, ' ')
    .replace(/\s+/g, ' ');
}
function metas(html) {
  const result = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = {};
    for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attrs[m[1].toLowerCase()] = m[2] ?? m[3];
    }
    const name = (attrs.name || attrs.property || '').toLowerCase();
    if (name && typeof attrs.content === 'string') result[name] = attrs.content;
  }
  return result;
}

function parseLivecounts(html) {
  if (typeof html !== 'string' || html.length < 16) throw new Error('Livecounts respondió vacío');
  if (/(?:cf-chl-|just a moment|checking your browser|verify you are human)/i.test(html)) {
    throw new Error('Livecounts solicita comprobación antibots');
  }
  const meta = metas(html);
  const titleAndDescription = [meta['og:title'], meta['og:description'], meta.description, meta.title].filter(Boolean).join(' ');
  const visible = stripTags(html);
  const identity = `${titleAndDescription} ${visible} ${html}`;
  if (!new RegExp(`(?:^|[^a-z0-9])${HANDLE}(?:[^a-z0-9]|$)`, 'i').test(identity)) {
    throw new Error('La fuente no confirma la cuenta elbellocubano');
  }
  const descriptive = `${titleAndDescription} ${visible}`;
  const number = '([0-9][0-9,. ]{0,18})';
  const patterns = [
    new RegExp(`(?:facebook\\s+)?(?:followers|seguidores|follower\\s*count|recuento\\s+de\\s+seguidores)\\s*(?::|=|–|-)?\\s*${number}\\b`, 'ig'),
    new RegExp(`\\b${number}\\s*(?:facebook\\s+)?(?:followers|seguidores)\\b`, 'ig'),
    /"(?:followerCount|followersCount|follower_count|followers_count|facebookFollowers|facebook_followers)"\s*:\s*"?([0-9]+(?:[,. ][0-9]{3})*)(?![0-9]|[,.][0-9])/gi,
    /(?:followerCount|followersCount|follower_count|followers_count)\s*=\s*["']?([0-9]+(?:[,. ][0-9]{3})*)(?![0-9]|[,.][0-9])/gi,
  ];
  // Primero texto visible o metadatos que expresamente hablan de seguidores.
  for (const pattern of patterns.slice(0, 2)) {
    for (const found of descriptive.matchAll(pattern)) {
      try { return parseNumber(found[1]); } catch (_) { /* P. ej., contador inicialmente a cero */ }
    }
  }
  // Luego propiedades concretas de estado de seguidores, no otras métricas.
  for (const pattern of patterns.slice(2)) {
    for (const found of html.matchAll(pattern)) {
      try { return parseNumber(found[1]); } catch (_) {}
    }
  }
  // Algunos embeds imprimen el contador en un elemento con un id/clase explícita.
  const htmlNoScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  for (const hit of htmlNoScripts.matchAll(/<([a-z][\w:-]*)\b([^>]*)>\s*([0-9][0-9,. ]{0,18})\s*<\/\1>/gi)) {
    if (!/(?:follower|seguidores|subscriber|facebook-count)/i.test(hit[2])) continue;
    try { return parseNumber(hit[3]); } catch (_) {}
  }
  throw new Error('El iframe no publica una cifra numérica legible en el HTML');
}

async function requestText(url, ms = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.6',
        'Accept-Language': 'es-PE,es;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (contentType && !/(html|json|text)/i.test(contentType)) throw new Error('Tipo de respuesta no válido');
    const payload = await response.text();
    if (payload.length > 1_500_000) throw new Error('Respuesta demasiado extensa');
    return payload;
  } finally { clearTimeout(timer); }
}

async function graphCount() {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return null;
  const u = new URL(`https://graph.facebook.com/v24.0/${encodeURIComponent(pageId)}`);
  u.searchParams.set('fields', 'followers_count');
  u.searchParams.set('access_token', token);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(u.href, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Graph API HTTP ${response.status}`);
    const data = await response.json();
    const count = parseNumber(data.followers_count);
    return { count, fuente: 'Meta Graph API', source_stale: false };
  } finally { clearTimeout(timer); }
}

async function obtain() {
  const attempts = [];
  try {
    const official = await graphCount();
    if (official) return official;
  } catch (e) { attempts.push(`Graph API: ${e.message}`); }
  for (const [url, fuente] of [[EMBED_URL, 'Livecounts embed'], [PAGE_URL, 'Livecounts página']]) {
    try {
      const html = await requestText(url);
      const count = parseLivecounts(html);
      return { count, fuente, source_stale: false };
    } catch (e) {
      attempts.push(`${fuente}: ${e.name === 'AbortError' ? 'timeout' : e.message}`);
    }
  }
  throw new Error(attempts.join(' | '));
}

async function read() {
  if (lastGood && Date.now() - lastGood.time < FRESH_MS) return lastGood.data;
  if (pending) return pending;
  pending = (async () => {
    try {
      const value = await obtain();
      const data = {
        consulta_ok: true,
        platform: 'facebook',
        cuenta: HANDLE,
        count: value.count,
        fuente: value.fuente,
        source_stale: value.source_stale,
        embed_url: EMBED_URL,
        updated_at: new Date().toISOString()
      };
      lastGood = { data, time: Date.now() };
      return data;
    } catch (error) {
      if (lastGood && Date.now() - lastGood.time <= LAST_GOOD_MS) {
        return { ...lastGood.data, source_stale: true, nota: 'Último valor válido; Livecounts no responde ahora' };
      }
      throw error;
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
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      consulta_ok: false,
      platform: 'facebook',
      cuenta: HANDLE,
      count: null,
      embed_url: EMBED_URL,
      nota: error.message,
      explicacion: 'El iframe puede mostrar una cifra que Livecounts carga mediante JavaScript. Un iframe de otro dominio no permite leer ni sumar su contenido desde esta web.'
    });
  }
}
module.exports = handler;
module.exports._test = { parseNumber, parseLivecounts, read, obtain };
