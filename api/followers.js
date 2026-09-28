const USERNAME = 'elbellocubano7';
const BASE = 'https://tiktok-api.tokcounter.com';

async function getJSON(path, signal) {
  const response = await fetch(BASE + path, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Fuente respondió ${response.status}`);
  }

  const data = await response.json();

  if (data.success !== true) {
    throw new Error('La fuente no pudo obtener el perfil');
  }

  return data;
}

export default async function handler(req, res) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const profile = await getJSON(
      `/user/data/${USERNAME}`,
      controller.signal
    );

    if (
      profile.id?.toLowerCase() !== USERNAME ||
      !/^\d+$/.test(String(profile.userId))
    ) {
      throw new Error('La fuente no confirmó la cuenta solicitada');
    }

    const stats = await getJSON(
      `/user/stats/${profile.userId}`,
      controller.signal
    );

    const raw = stats.followerCount;

    if (!/^\d+$/.test(String(raw))) {
      throw new Error('Contador inválido');
    }

    const count = Number(raw);

    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error('Contador inválido');
    }

    // Reutiliza la respuesta durante 60 segundos entre visitantes.
    res.setHeader(
      'Cache-Control',
      'public, max-age=0, s-maxage=60'
    );

    return res.status(200).json({
      tiktok: count,
      fuente: 'TokCounter',
      cuenta: USERNAME,
      consulta_ok: true,
      fuente_cache: stats.cache === true,
      updated_at: new Date().toISOString(),
      nota:
        'Hora de consulta; la fuente no indica la hora de medición en TikTok.',
    });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');

    return res.status(502).json({
      tiktok: null,
      consulta_ok: false,
      updated_at: null,
      nota:
        error.name === 'AbortError'
          ? 'La fuente tardó demasiado en responder'
          : error.message,
    });
  } finally {
    clearTimeout(timer);
  }
}