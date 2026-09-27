const TIKTOK_USERNAME = 'elbellocubano7';

// Número de respaldo. Se usa si TikTok bloquea la petición (pasa seguido desde
// servidores) o si cambia el formato de su página. Actualícelo de vez en cuando
// para que, aunque falle lo automático, el número siga siendo más o menos real.
const TIKTOK_FALLBACK = 43800;

// TikTok no tiene API pública gratis para esto, pero la página del perfil todavía
// trae el número dentro del HTML ("stats":{"followerCount":43800}). Puede dejar de
// funcionar sin aviso: por eso siempre hay respaldo.
async function fetchTikTokFollowers() {
  const response = await fetch(`https://www.tiktok.com/@${TIKTOK_USERNAME}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    return { count: null, note: `TikTok respondió ${response.status}` };
  }

  const match = (await response.text()).match(/"followerCount":(\d+)/);
  if (!match) {
    return { count: null, note: 'no se encontró el número en la página' };
  }

  const count = Number(match[1]);
  // Si el número es absurdo, algo cambió en la página: mejor el respaldo.
  if (!Number.isFinite(count) || count < 1000 || count > 100000000) {
    return { count: null, note: `número fuera de rango: ${match[1]}` };
  }

  return { count, note: 'ok' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  let result;
  try {
    result = await fetchTikTokFollowers();
  } catch (error) {
    result = { count: null, note: `falló la petición: ${error.message}` };
  }

  return res.status(200).json({
    tiktok: result.count ?? TIKTOK_FALLBACK,
    enVivo: result.count !== null,
    nota: result.note,
    updated_at: new Date().toISOString(),
  });
}
