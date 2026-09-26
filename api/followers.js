export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

  const USERNAME = 'elbellocubano7';
  let followers = null;
  let source = '';
  let debug = [];

  // FUENTE 1: TOKCOUNTER - la que me mandaste
  try {
    const r = await fetch(`https://tokcounter.com/es?user=${USERNAME}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0', 'Accept': 'text/html' }
    });
    if (r.ok) {
      const html = await r.text();
      const patterns = [/"followerCount":(\d+)/g, /"followers":(\d+)/g, /followerCount":(\d+)/g];
      for (const pat of patterns) {
        for (const m of [...html.matchAll(pat)]) {
          const v = parseInt(m[1],10);
          if (v > 1000 && v < 10000000) { followers = v; source='tokcounter-page'; }
        }
        if (followers) break;
      }
      if (followers) debug.push('tokcounter-page ok:'+followers);
    }
  } catch(e){ debug.push('tokcounter-page fail'); }

  // FUENTE 2: TIKTOK DIRECTO - endpoint publico que si permite scrape
  if (!followers) {
    try {
      // Este endpoint de TikTok web si devuelve el conteo real
      const r = await fetch(`https://www.tiktok.com/node/share/user/@${USERNAME}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' }
      });
      if (r.ok) {
        const j = await r.json();
        const c = j?.userData?.user?.followerCount || j?.body?.userData?.user?.followerCount || j?.user?.followerCount;
        if (c) { followers=c; source='tiktok-node-share'; debug.push('tiktok-node ok:'+c); }
      }
    } catch(e){ debug.push('tiktok-node fail'); }
  }

  // FUENTE 3: TIKWM POST - respaldo clasico
  if (!followers) {
    try {
      const r = await fetch('https://www.tikwm.com/api/user/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unique_id: USERNAME })
      });
      if (r.ok) {
        const j = await r.json();
        const c = j?.data?.user?.followerCount;
        if (c) { followers=c; source='tikwm-post'; debug.push('tikwm ok:'+c); }
      }
    } catch(e){ debug.push('tikwm fail'); }
  }

  // FUENTE 4: SOCIALCOUNTS / LIVECOUNTS - otras paginas que si dejan
  if (!followers) {
    try {
      const r = await fetch(`https://socialcounts.org/api/tiktok/user/${USERNAME}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (r.ok) {
        const j = await r.json();
        if (j.followerCount) { followers=j.followerCount; source='socialcounts'; debug.push('socialcounts ok:'+followers); }
      }
    } catch(e){ debug.push('socialcounts fail'); }
  }

  // FUENTE 5: COUNTIK
  if (!followers) {
    try {
      const r = await fetch(`https://countik.com/api/userinfo?username=${USERNAME}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (r.ok) {
        const j = await r.json();
        const c = j.followerCount || j.followers;
        if (c) { followers=c; source='countik'; debug.push('countik ok:'+c); }
      }
    } catch(e){ debug.push('countik fail'); }
  }

  // Si ninguna funciona, NO usar 43700 viejo, usar null para que el frontend lo note y reintente
  const FALLBACK = 43700; // solo para no mostrar 0, pero marcamos isReal=false

  return res.status(200).json({
    tiktok: followers || FALLBACK,
    facebook: 17000,
    instagram: 4500,
    username: USERNAME,
    source: source || 'fallback',
    isReal: followers !== null,
    debug,
    updated_at: new Date().toISOString()
  });
}
