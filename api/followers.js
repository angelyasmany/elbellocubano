const USERNAME = 'elbellocubano7';
const BASE = 'https://tiktok-api.tokcounter.com';

// Misma transformación del JavaScript público de TokCounter.
// Se aplica una vez al dato recibido; no se acumula.
function tokCounterDisplay(count) {
  if (count >= 10050 && count <= 1049000) {
    return count + 50;
  }

  if (count >= 1050000 && count <= 0x5fd821f) {
    return count + 50000;
  }

  if (count >= 100500000 && count <= 0x3e95ba7f) {
    return count + 50000;
  }

  if (count >= 1050000000) {
    return count + 50000000;
  }

  return count;
}

async function getJSON(path, signal) {
  const response = await fetch(BASE + path, {
    signal,
    headers: {
      Accept: 'application/json',
    },
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
      typeof profile.id !== 'string' ||
      profile.id.toLowerCase() !== USERNAME ||
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

    res.setHeader(
      'Cache-Control',
      'public, max-age=0, s-maxage=60'
    );

    return res.status(200).json({
      tiktok: tokCounterDisplay(count),
      fuente: 'TokCounter',
      cuenta: USERNAME,
      consulta_ok: true,
      fuente_cache: stats.cache === true,
      updated_at: new Date().toISOString(),
      nota:
        'Dato con la transformación de TokCounter. Hora de consulta, no de medición en TikTok.',
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