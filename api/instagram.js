'use strict';

const HANDLE = 'elbellocubano';
const BASE = 'https://livecounts.nl';
const PAGES = ['/instagram-realtime/', '/es/instagram-realtime/'];
const EMBED_URL = BASE + '/instagram-realtime/embed/?u=' + HANDLE
  + '&theme=transparent&size=m&avatar=0&name=0';
const CACHE_MS = 15_000;
const RETRY_MS = 30_000;
const SOURCE_FRESH_MS = 120_000;
const BACKUP_MAX_MS = 30 * 24 * 60 * 60 * 1000;

let lastReading;
let nextLookup = 0;
let pending;

function parseLivecounts(html, now = Date.now()) {
  const script = html.match(/<script\b[^>]*\bid=["']ig-initial["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!script) throw new Error('Livecounts no publicó los datos de esta cuenta');
  const data = JSON.parse(script[1]);
  if (String(data?.username || '').toLowerCase() !== HANDLE ||
      !Number.isSafeInteger(data.followers) || data.followers < 0 ||
      data.estimated === true) {
    throw new Error('Livecounts no publicó una cifra exacta para la cuenta solicitada');
  }

  let timestamp = data.fetched_at;
  if (Number.isFinite(timestamp) && timestamp > 0 && timestamp < 1e12) timestamp *= 1000;
  if (!Number.isSafeInteger(timestamp) || timestamp > now + 60_000 ||
      now - timestamp > BACKUP_MAX_MS) {
    throw new Error('La fecha de la lectura de Livecounts no es válida');
  }
  return { count: data.followers, timestamp, stale: data.stale !== false || data.delayed === true };
}

async function fetchPage(path) {
  const response = await fetch(BASE + path + '?u=' + HANDLE, {
    headers: { Accept: 'text/html' },
    signal: AbortSignal.timeout(3500)
  });
  if (!response.ok) throw new Error('Livecounts devolvió HTTP ' + response.status);
  return parseLivecounts(await response.text());
}

function isStale(reading) {
  return reading.stale || Date.now() - reading.timestamp > SOURCE_FRESH_MS;
}

async function lookup() {
  let reading;
  for (const page of PAGES) {
    try {
      const candidate = await fetchPage(page);
      if (!reading || candidate.timestamp > reading.timestamp ||
          (candidate.timestamp === reading.timestamp && !isStale(candidate))) {
        reading = candidate;
      }
      if (!isStale(reading)) break;
    } catch {
      // La versión en español puede seguir disponible si falla la otra página.
    }
  }

  nextLookup = Date.now() + (reading ? CACHE_MS : RETRY_MS);
  if (!reading) {
    if (lastReading) lastReading = { ...lastReading, stale: true };
    return;
  }
  if (!lastReading || reading.timestamp >= lastReading.timestamp) {
    lastReading = reading;
  } else {
    lastReading = { ...lastReading, stale: true };
  }
}

async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ consulta_ok: false, nota: 'Solo GET' });
  }
  if (pending || Date.now() >= nextLookup) {
    pending ??= lookup().finally(() => { pending = undefined; });
    await pending;
  }
  if (!lastReading || Date.now() - lastReading.timestamp > BACKUP_MAX_MS) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      consulta_ok: false, platform: 'instagram', cuenta: HANDLE, count: null,
      estimated: false, source_stale: true, embed_url: EMBED_URL,
      nota: 'Livecounts no devolvió una cifra verificable con fecha.'
    });
  }

  const stale = isStale(lastReading);
  res.setHeader('Cache-Control', stale ? 'no-store' : 'public, max-age=0, s-maxage=4');
  return res.status(200).json({
    consulta_ok: true, platform: 'instagram', cuenta: HANDLE, count: lastReading.count,
    fuente: 'Livecounts.nl', source_stale: stale, estimated: false,
    updated_at: new Date(lastReading.timestamp).toISOString(),
    queried_at: new Date().toISOString()
  });
}

module.exports = handler;
