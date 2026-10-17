export const USERNAME = 'elbellocubano7';
const BASE = 'https://tiktok-api.tokcounter.com';

// Transformación proporcionada y aprobada por el propietario.
export function tokCounterDisplay(count) {
  if (count >= 10050 && count <= 1049000) return count + 50;
  if (count >= 1050000 && count <= 0x5fd821f) return count + 50000;
  if (count >= 100500000 && count <= 0x3e95ba7f) return count + 50000;
  if (count >= 1050000000) return count + 50000000;
  return count;
}

export async function tikTokResponse({fetchImpl = fetch, timeoutMs = 15000, now = () => new Date()} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  async function getJSON(path) {
    const response = await fetchImpl(BASE + path, {signal: controller.signal, headers: {Accept:'application/json'}});
    if (!response.ok) throw new Error(`Fuente respondió ${response.status}`);
    const data = await response.json();
    if (data.success !== true) throw new Error('La fuente no pudo obtener el perfil');
    return data;
  }
  try {
    const profile = await getJSON(`/user/data/${USERNAME}`);
    if (typeof profile.id !== 'string' || profile.id.toLowerCase() !== USERNAME || !/^\d+$/.test(String(profile.userId))) {
      throw new Error('La fuente no confirmó la cuenta solicitada');
    }
    const stats = await getJSON(`/user/stats/${profile.userId}`);
    const raw = stats.followerCount;
    if (!/^\d+$/.test(String(raw))) throw new Error('Contador inválido');
    const count = Number(raw);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Contador inválido');
    const displayed = tokCounterDisplay(count);
    if (!Number.isSafeInteger(displayed)) throw new Error('Contador inválido');
    return Response.json({
      tiktok:displayed, fuente:'TokCounter', cuenta:USERNAME, consulta_ok:true,
      fuente_cache:stats.cache === true, updated_at:now().toISOString(),
      nota:'Dato con la misma transformación de TokCounter que ya utilizabas.'
    },{headers:{'Cache-Control':'public, max-age=0, s-maxage=5, stale-while-revalidate=10'}});
  } catch(error) {
    return Response.json({
      tiktok:null, consulta_ok:false, updated_at:null,
      nota:error.name === 'AbortError' ? 'La fuente tardó demasiado en responder' : error.message
    },{status:502,headers:{'Cache-Control':'no-store'}});
  } finally {clearTimeout(timer);}
}
