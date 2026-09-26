export default async function handler(req, res) {
  // FIX REALTIME - Corrige el pegado en 43786
  // El error era: followers || 43786  -> si Countik falla, te deja pegado en 43786 siempre
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const USERNAME = 'elbellocubano7';
  let followers = null;
  let source = '';
  let debug = [];

  // 1. TikWM - la más rápida y no bloqueada en Vercel
  try{
    const r = await fetch(`https://www.tikwm.com/api/user/info?unique_id=${USERNAME}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store'
    });
    const j = await r.json();
    debug.push('tikwm:' + JSON.stringify(j).slice(0,200));
    if(j?.data?.user?.followerCount){
      followers = j.data.user.followerCount;
      source = 'tikwm-live';
    }
  }catch(e){ debug.push('tikwm error:'+e.message); }

  // 2. Countik - es la que usa TokCounter
  if(!followers){
    try{
      const r = await fetch(`https://countik.com/api/userinfo?username=${USERNAME}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store'
      });
      const j = await r.json();
      debug.push('countik:' + JSON.stringify(j).slice(0,200));
      if(j.followerCount) { followers = j.followerCount; source='countik'; }
      else if(j.fans) { followers = j.fans; source='countik-fans'; }
    }catch(e){ debug.push('countik error:'+e.message); }
  }

  // 3. LiveCount - otra que TokCounter usa
  if(!followers){
    try{
      const r = await fetch(`https://tiktok.livecounts.io/tiktok/live/follower-count/${USERNAME}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const j = await r.json();
      debug.push('livecounts:' + JSON.stringify(j).slice(0,200));
      if(j.count) { followers = j.count; source='livecounts'; }
    }catch(e){ debug.push('livecounts error:'+e.message); }
  }

  // NO HACER FALLBACK A 43786 - eso te deja pegado!
  // Si todo falla, devuelve error para que sepas, no un número viejo

  if(!followers){
    return res.status(200).json({
      tiktok: null,
      error: 'No se pudo obtener - TikTok bloqueó temporalmente a Vercel',
      debug: debug,
      suggestion: 'Usa el INDEX con fetch directo del navegador (te lo doy abajo)',
      updated_at: new Date().toISOString()
    });
  }

  return res.status(200).json({
    tiktok: followers,
    username: USERNAME,
    source: source,
    real: true,
    updated_at: new Date().toISOString(),
    // para que veas que ya pasó de 43786 a 43788
    diff_from_43786: followers - 43786
  });
}
