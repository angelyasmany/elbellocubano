export default async function handler(req, res) {
  // HIBRIDO 10 MINUTOS - Segunda opción (Vercel con 1 IP)
  // Solo pregunta a TikTok cada 10 minutos, nunca se bloquea
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 600 segundos = 10 minutos
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

  const USERNAME = 'elbellocubano7';
  let followers = null;
  let source = '';

  try{
    const r = await fetch(`https://www.tikwm.com/api/user/info?unique_id=${USERNAME}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' }
    });
    if(r.ok){
      const j = await r.json();
      if(j?.data?.user?.followerCount){
        followers = j.data.user.followerCount;
        source = 'tikwm-10min';
      }
    }
  }catch(e){}

  if(!followers){
    try{
      const r = await fetch(`https://countik.com/api/userinfo?username=${USERNAME}`);
      if(r.ok){
        const j = await r.json();
        if(j.followerCount) followers = j.followerCount;
        else if(j.fans) followers = j.fans;
        if(followers) source = 'countik-10min';
      }
    }catch(e){}
  }

  const FALLBACK = 43789;

  return res.status(200).json({
    tiktok: followers || FALLBACK,
    facebook: 17000,
    instagram: 4000,
    username: USERNAME,
    source: source || 'fallback-10min',
    interval: '600s = 10 minutos',
    isReal: followers !== null,
    updated_at: new Date().toISOString()
  });
}
