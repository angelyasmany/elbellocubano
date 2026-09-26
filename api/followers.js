export default async function handler(req, res) {
  // FIX 10 SEGUNDOS - No satura TikTok, no vuelve a 40,000
  // Problema anterior: || 40000 te dejaba pegado. Ahora guardamos el último valor real
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
  
  const USERNAME = 'elbellocubano7';
  let followers = null;
  let source = '';

  // 1. TikWM - más estable
  try{
    const r = await fetch(`https://www.tikwm.com/api/user/info?unique_id=${USERNAME}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
    });
    if(r.ok){
      const j = await r.json();
      if(j?.data?.user?.followerCount){
        followers = j.data.user.followerCount;
        source = 'tikwm';
      }
    }
  }catch(e){}

  // 2. Si TikWM falla, intenta Countik (el que usa TokCounter)
  if(!followers){
    try{
      const r = await fetch(`https://countik.com/api/userinfo?username=${USERNAME}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if(r.ok){
        const j = await r.json();
        if(j.followerCount) followers = j.followerCount;
        else if(j.fans) followers = j.fans;
        if(followers) source = 'countik';
      }
    }catch(e){}
  }

  // 3. Si TODO falla, NO pongas 40,000 - usa el último real conocido 43,789
  // Así no vuelve al principio
  const REAL_FALLBACK = 43789; // tu real de hoy, actualízalo cuando subas
  
  return res.status(200).json({
    tiktok: followers || REAL_FALLBACK,
    facebook: 17000,
    instagram: 4000,
    username: USERNAME,
    source: source || 'fallback-43789',
    isReal: followers !== null,
    updated_at: new Date().toISOString()
  });
}
