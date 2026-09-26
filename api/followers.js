export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

  const USERNAME = 'elbellocubano7';
  let followers = null;
  let source = '';
  let debug = [];

  // 1 - TikWM - Intento con POST y GET (el GET a veces falla por CORS pero en server funciona)
  try{
    // Intento POST (recomendado por TikWM)
    const r = await fetch('https://www.tikwm.com/api/user/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ unique_id: USERNAME })
    });
    if(r.ok){
      const j = await r.json();
      const c = j?.data?.user?.followerCount || j?.data?.followerCount;
      if(c){ followers = c; source = 'tikwm-post'; debug.push('tikwm-post ok:'+c); }
    }
  }catch(e){ debug.push('tikwm-post fail:'+e.message); }

  if(!followers){
    try{
      const r = await fetch(`https://www.tikwm.com/api/user/info?unique_id=${USERNAME}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' }
      });
      if(r.ok){
        const j = await r.json();
        if(j?.data?.user?.followerCount){ followers = j.data.user.followerCount; source='tikwm-get'; debug.push('tikwm-get ok:'+followers); }
      }
    }catch(e){ debug.push('tikwm-get fail'); }
  }

  // 2 - Countik
  if(!followers){
    try{
      const r = await fetch(`https://countik.com/api/userinfo?username=${USERNAME}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if(r.ok){
        const j = await r.json();
        const c = j.followerCount || j.fans || j.followers;
        if(c){ followers = c; source='countik'; debug.push('countik ok:'+c); }
      }
    }catch(e){ debug.push('countik fail'); }
  }

  // 3 - TokCounter / TokCount (nuevo respaldo)
  if(!followers){
    try{
      const r = await fetch(`https://tokcount.com/api/user/${USERNAME}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if(r.ok){
        const j = await r.json();
        const c = j.followers || j.followerCount || j.data?.followers;
        if(c){ followers = c; source='tokcount'; debug.push('tokcount ok:'+c); }
      }
    }catch(e){ debug.push('tokcount fail'); }
  }

  // 4 - Livecounts.io / TikTok Web API indirecto
  if(!followers){
    try{
      const r = await fetch(`https://www.tiktok.com/@${USERNAME}`, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          'Accept': 'text/html'
        }
      });
      if(r.ok){
        const html = await r.text();
        // Buscar followerCount en el JSON embebido
        const m = html.match(/"followerCount":(\d+)/) || html.match(/followerCount":(\d+)/);
        if(m && m[1]){
          followers = parseInt(m[1],10);
          source='tiktok-scrape';
          debug.push('scrape ok:'+followers);
        }
      }
    }catch(e){ debug.push('scrape fail'); }
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
