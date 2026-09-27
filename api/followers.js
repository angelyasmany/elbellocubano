export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const USERNAME = 'elbellocubano7';
  let followers = null;
  let source = '';
  let debug = [];

  // Cabeceras avanzadas para evitar bloqueos por bots en las peticiones HTTP
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"'
  };

  // FUENTE 1: TIKWM POST (Respaldo robusto de API externa pública)
  try {
    const r = await fetch('https://www.tikwm.com/api/user/info', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': browserHeaders['User-Agent']
      },
      body: JSON.stringify({ unique_id: USERNAME })
    });
    if (r.ok) {
      const j = await r.json();
      const c = j?.data?.user?.followerCount;
      if (c && typeof c === 'number') { 
        followers = c; 
        source = 'tikwm-post'; 
        debug.push('tikwm ok:' + c); 
      }
    }
  } catch (e) { 
    debug.push('tikwm fail'); 
  }

  // FUENTE 2: TOKCOUNTER (Scraping directo adaptado)
  if (!followers) {
    try {
      const r = await fetch(`https://tokcounter.com/es?user=${USERNAME}`, {
        headers: browserHeaders
      });
      if (r.ok) {
        const html = await r.text();
        const patterns = [/"followerCount":(\d+)/g, /"followers":(\d+)/g, /followerCount["']\s*:\s*(\d+)/g];
        for (const pat of patterns) {
          for (const m of [...html.matchAll(pat)]) {
            const v = parseInt(m[1], 10);
            if (v > 1000 && v < 10000000) { 
              followers = v; 
              source = 'tokcounter-page'; 
            }
          }
          if (followers) break;
        }
        if (followers) debug.push('tokcounter-page ok:' + followers);
      }
    } catch (e) { 
      debug.push('tokcounter-page fail'); 
    }
  }

  // FUENTE 3: TIKTOK DIRECTO (Node Share de respaldo)
  if (!followers) {
    try {
      const r = await fetch(`https://www.tiktok.com/node/share/user/@${USERNAME}`, {
        headers: browserHeaders
      });
      if (r.ok) {
        const j = await r.json();
        const c = j?.userData?.user?.followerCount || j?.body?.userData?.user?.followerCount || j?.user?.followerCount;
        if (c && typeof c === 'number') { 
          followers = c; 
          source = 'tiktok-node-share'; 
          debug.push('tiktok-node ok:' + c); 
        }
      }
    } catch (e) { 
      debug.push('tiktok-node fail'); 
    }
  }

  // Respaldo estricto por seguridad en caso de bloqueo masivo temporal
  const FALLBACK = 43700;

  // FACEBOOK + INSTAGRAM: Meta Graph API (requiere Página de FB vinculada a una
  // cuenta de Instagram profesional, administrada por el dueño de la página).
  // Configura estas variables de entorno en Vercel (Project Settings > Environment Variables):
  //   META_PAGE_ID            -> id numérico de la página de Facebook
  //   META_PAGE_ACCESS_TOKEN  -> token de acceso de página de larga duración
  let facebook = 17000;
  let instagram = 4500;
  let metaSource = 'fallback';
  const { META_PAGE_ID, META_PAGE_ACCESS_TOKEN } = process.env;

  if (META_PAGE_ID && META_PAGE_ACCESS_TOKEN) {
    try {
      const fields = 'fan_count,followers_count,instagram_business_account{followers_count}';
      const url = `https://graph.facebook.com/v19.0/${META_PAGE_ID}?fields=${fields}&access_token=${META_PAGE_ACCESS_TOKEN}`;
      const r = await fetch(url);
      const j = await r.json();
      if (r.ok && !j.error) {
        if (typeof j.followers_count === 'number') facebook = j.followers_count;
        else if (typeof j.fan_count === 'number') facebook = j.fan_count;
        if (typeof j.instagram_business_account?.followers_count === 'number') {
          instagram = j.instagram_business_account.followers_count;
        }
        metaSource = 'graph-api';
        debug.push('meta ok: fb=' + facebook + ' ig=' + instagram);
      } else {
        debug.push('meta fail: ' + (j.error?.message || r.status));
      }
    } catch (e) {
      debug.push('meta fail: ' + e.message);
    }
  } else {
    debug.push('meta skipped: missing env vars');
  }

  return res.status(200).json({
    tiktok: followers || FALLBACK,
    facebook,
    instagram,
    username: USERNAME,
    source: source || 'fallback',
    metaSource,
    isReal: followers !== null,
    isRealMeta: metaSource === 'graph-api',
    debug,
    updated_at: new Date().toISOString()
  });
}
