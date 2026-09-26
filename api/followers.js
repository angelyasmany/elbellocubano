export default async function handler(req, res) {
  // Cada 50 segundos - no satura TikTok, cuenta fácil
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=50, stale-while-revalidate=100');
  
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
        source = 'tikwm';
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
        if(followers) source = 'countik';
      }
    }catch(e){}
  }

  const FALLBACK = 43789;

  return res.status(200).json({
    tiktok: followers || FALLBACK,
    facebook: 17000,
    instagram: 4000,
    username: USERNAME,
    source: source || 'fallback',
    isReal: followers !== null,
    interval: '50s',
    updated_at: new Date().toISOString()
  });
}
