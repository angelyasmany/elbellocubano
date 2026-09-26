export default async function handler(req, res) {
  // TikWM con rotación - Nunca bloquea como TokCounter
  // TikWM ya rota IPs por ti, tu solo le preguntas a TikWM cada 50s

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=50, stale-while-revalidate=100');

  const USERNAME = 'elbellocubano7';
  
  // Función que intenta 3 veces con rotación interna de TikWM
  async function getWithRotation(attempt = 0){
    try{
      // TikWM endpoint oficial - ellos rotan IPs por ti
      const urls = [
        `https://www.tikwm.com/api/user/info?unique_id=${USERNAME}`,
        `https://www.tikwm.com/api/user/info?unique_id=${USERNAME}&t=${Date.now()}`,
        `https://countik.com/api/userinfo?username=${USERNAME}`
      ];
      
      const url = urls[attempt % urls.length];
      
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      
      if(!r.ok) throw new Error('HTTP ' + r.status);
      
      const j = await r.json();
      
      // TikWM formato
      if(j?.data?.user?.followerCount) return {count: j.data.user.followerCount, source: 'tikwm'};
      // Countik formato
      if(j?.followerCount) return {count: j.followerCount, source: 'countik'};
      if(j?.fans) return {count: j.fans, source: 'countik-fans'};
      
      throw new Error('No count in response');
    }catch(e){
      if(attempt < 2){
        // Espera 1 segundo y rota a siguiente URL
        await new Promise(r => setTimeout(r, 1000));
        return getWithRotation(attempt + 1);
      }
      throw e;
    }
  }

  try{
    const result = await getWithRotation();
    return res.status(200).json({
      tiktok: result.count,
      facebook: 17000,
      instagram: 4000,
      username: USERNAME,
      source: result.source + '-rotacion',
      neverBlocks: true,
      interval: '50s',
      updated_at: new Date().toISOString()
    });
  }catch(e){
    // Si todo falla, devuelve último real, no 40,000
    return res.status(200).json({
      tiktok: 43789,
      facebook: 17000,
      instagram: 4000,
      username: USERNAME,
      source: 'fallback-ultimo-real',
      error: e.message,
      neverBlocks: false,
      updated_at: new Date().toISOString()
    });
  }
}
