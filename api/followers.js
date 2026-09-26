export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

  const USERNAME = 'elbellocubano7';
  let followers = null;
  let source = '';
  let debug = [];

  // ===== 1. TOKCOUNTER - Tu fuente principal que me mandaste =====
  // Intenta sacar el numero directo de tokcounter.com/es?user=elbellocubano7
  try {
    const r = await fetch(`https://tokcounter.com/es?user=${USERNAME}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });
    if (r.ok) {
      const html = await r.text();
      debug.push('tokcounter html length:'+html.length);
      
      // Intento A: Buscar en __NEXT_DATA__ o JSON embebido
      // TokCounter usa Next.js, el dato esta en un JSON gigante
      const patterns = [
        /"followerCount":(\d+)/g,
        /"followers":(\d+)/g,
        /"follower_count":(\d+)/g,
        /followerCount\":(\d+)/g,
        /followersCount\":(\d+)/g
      ];
      
      for (const pat of patterns) {
        const matches = [...html.matchAll(pat)];
        for (const m of matches) {
          const val = parseInt(m[1], 10);
          if (val > 1000 && val < 10000000) { // rango valido para ti
            if (!followers || val > followers) {
              followers = val;
              source = 'tokcounter-page';
            }
          }
        }
      }
      
      // Intento B: Buscar numero en elemento especifico (ej: <span id="follower-count">43,123</span>)
      // TokCounter muestra el numero en un div grande
      const countMatch = html.match(/class="[^"]*follower[^"]*"[^>]*>([\d,\.]+)</i);
      if (countMatch && !followers) {
        const val = parseInt(countMatch[1].replace(/[^\d]/g, ''), 10);
        if (val > 1000) { followers = val; source = 'tokcounter-dom'; }
      }
      
      if (followers) debug.push('tokcounter-page ok:'+followers);
      else debug.push('tokcounter-page no encontro numero');
    }
  } catch (e) {
    debug.push('tokcounter-page fail:'+e.message);
  }

  // ===== 2. TOKCOUNTER API directa (si existe) =====
  if (!followers) {
    const endpoints = [
      `https://tokcounter.com/api/user/${USERNAME}`,
      `https://tokcounter.com/api/tiktok/user/${USERNAME}`,
      `https://api.tokcounter.com/user/${USERNAME}`,
      `https://tokcount.com/api/user/${USERNAME}`
    ];
    for (const url of endpoints) {
      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (r.ok) {
          const j = await r.json();
          const c = j.followerCount || j.followers || j.follower_count || j.data?.followerCount || j.data?.followers;
          if (c && c > 1000) {
            followers = c;
            source = 'tokcounter-api:'+url;
            debug.push('tokcounter-api ok:'+c+' from '+url);
            break;
          }
        }
      } catch (e) {
        debug.push('tokcounter-api fail '+url);
      }
    }
  }

  // ===== 3. TIKWM POST (respaldo) =====
  if (!followers) {
    try {
      const r = await fetch('https://www.tikwm.com/api/user/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ unique_id: USERNAME })
      });
      if (r.ok) {
        const j = await r.json();
        const c = j?.data?.user?.followerCount || j?.data?.followerCount;
        if (c) { followers = c; source = 'tikwm-post'; debug.push('tikwm-post ok:'+c); }
      }
    } catch (e) { debug.push('tikwm-post fail'); }
  }

  // ===== 4. TIKTOK DIRECT SCRAPE (ultimo respaldo) =====
  if (!followers) {
    try {
      const r = await fetch(`https://www.tiktok.com/@${USERNAME}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', 'Accept': 'text/html' }
      });
      if (r.ok) {
        const html = await r.text();
        const m = html.match(/"followerCount":(\d+)/);
        if (m && m[1]) {
          followers = parseInt(m[1], 10);
          source = 'tiktok-scrape';
          debug.push('scrape ok:'+followers);
        }
      }
    } catch (e) { debug.push('scrape fail'); }
  }

  const FALLBACK = 43789;

  return res.status(200).json({
    tiktok: followers || FALLBACK,
    facebook: 17000,
    instagram: 4500,
    username: USERNAME,
    source: source || 'fallback',
    isReal: followers !== null,
    debug: debug,
    updated_at: new Date().toISOString()
  });
}
