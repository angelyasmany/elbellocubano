export default async function handler(req, res) {
  // Esta es tu API que cuenta seguidores reales de @elbellocubano7
  // Igual que hace tokcounter.com
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const USERNAME = 'elbellocubano7';
  let tiktokFollowers = null;

  try {
    // Leemos tu perfil de TikTok directo
    const response = await fetch('https://www.tiktok.com/@' + USERNAME, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();
    const match = html.match(/"followerCount"\s*:\s*(\d+)/);
    if(match){
      tiktokFollowers = parseInt(match[1], 10);
    }
  } catch(e){
    console.log('Error:', e.message);
  }

  // Si TikTok bloquea, usa 40000 para que tu página no se rompa
  return res.status(200).json({
    facebook: 17000,
    instagram: 4000,
    tiktok: tiktokFollowers || 40000,
    username: USERNAME,
    real: tiktokFollowers !== null,
    updated_at: new Date().toISOString()
  });
}
