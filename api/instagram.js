'use strict';

// Instagram elbellocubano: fuente Livecounts embed enviada por el propietario.
// El iframe VISUAL no permite leer por sí solo su número desde otro dominio.
// Opciones: Instagram Graph API oficial (token opcional), HTML legible de Livecounts,
// y Mixerno.Space como último respaldo. Nunca se inventan valores.
const { read: readOther } = require('./_shared');
const HANDLE = 'elbellocubano';
const EMBED = `https://livecounts.nl/instagram-realtime/embed/?u=${HANDLE}&theme=light&size=m`;
const PAGE = `https://livecounts.nl/instagram-realtime/?u=${HANDLE}`;
const CACHE_MS = 30_000;
const LAST_GOOD_MS = 60 * 60 * 1000;
let cache = null;
let pending = null;

function validCount(raw) {
  const clean = String(raw ?? '').replace(/[\u00a0\u202f]/g,' ').trim();
  if (!/^(?:\d+|\d{1,3}(?:[,. ]\d{3})+)$/.test(clean)) throw new Error('Cifra incompleta o aproximada');
  const n = Number(clean.replace(/[,. ]/g,''));
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Cifra no válida');
  return n;
}
function parseLivecounts(html) {
  if (typeof html !== 'string' || html.length < 16) throw new Error('Respuesta vacía');
  if (/(?:cf-chl-|just a moment|checking your browser|verify you are human)/i.test(html))
    throw new Error('Livecounts exige verificación del navegador');
  const noScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ');
  const visible = noScripts.replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|#160|#xA0);/gi,' ').replace(/\s+/g,' ');
  if (!new RegExp(`(?:^|[^a-z0-9])${HANDLE}(?:[^a-z0-9]|$)`,'i').test(html))
    throw new Error('Livecounts no confirmó la cuenta');
  const candidates = [
    // Cifras explícitamente asociadas a seguidores, no vistas o me gusta.
    /(?:instagram\s+)?(?:followers|seguidores|follower\s*count)\s*(?:[:=–-]\s*)?([0-9][0-9,. ]{0,17})\b/gi,
    /\b([0-9][0-9,. ]{0,17})\s*(?:instagram\s+)?(?:followers|seguidores)\b/gi,
  ];
  for (const re of candidates) {
    for (const hit of visible.matchAll(re)) {
      try {return validCount(hit[1]);}catch(_){}
    }
  }
  const statePatterns=[
    /["'](?:followerCount|followersCount|follower_count|followers_count|instagramFollowers)["']\s*:\s*["']?([0-9]+(?:[,. ]\d{3})*)/gi,
    /(?:followerCount|followersCount|follower_count|followers_count)\s*=\s*["']?([0-9]+(?:[,. ]\d{3})*)/gi
  ];
  for (const re of statePatterns) {
    for(const hit of html.matchAll(re)){
      try{return validCount(hit[1]);}catch(_){}
    }
  }
  for(const hit of noScripts.matchAll(/<([a-z][\w:-]*)\b([^>]*)>\s*([0-9][0-9,. ]{0,17})\s*<\/\1>/gi)){
    if (!/(?:follower|seguidores|instagram-count)/i.test(hit[2]))continue;
    try{return validCount(hit[3]);}catch(_){}
  }
  throw new Error('El iframe no proporciona seguidores legibles en el HTML');
}
async function textResponse(url,ms=6000){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),ms);
  try{
    const response=await fetch(url,{signal:controller.signal,redirect:'follow',headers:{
      Accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.6',
      'Accept-Language':'es-PE,es;q=0.9,en;q=0.8',
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const type=response.headers.get('content-type')||'';
    if(type&&!/(html|json|text)/i.test(type))throw new Error('Respuesta inesperada');
    const text=await response.text();
    if(text.length>1_500_000)throw new Error('Documento demasiado grande');
    return text;
  }finally{clearTimeout(timer)}
}
async function officialCount(){
  const token=process.env.INSTAGRAM_ACCESS_TOKEN;
  if(!token)return null;
  const u=new URL('https://graph.instagram.com/v24.0/me');
  u.searchParams.set('fields','id,username,followers_count');
  u.searchParams.set('access_token',token);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6000);
  try{
    const response=await fetch(u.href,{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`Instagram Graph HTTP ${response.status}`);
    const json=await response.json();
    if(String(json.username||'').replace(/^@/,'').toLowerCase()!==HANDLE)throw new Error('Cuenta de Instagram no coincide');
    return {count:validCount(json.followers_count),fuente:'Instagram Graph API',source_stale:false};
  }finally{clearTimeout(timer)}
}
async function obtain(){
  const errors=[];
  try{const official=await officialCount();if(official)return official;}catch(e){errors.push(`Meta: ${e.message}`)}
  for(const [url,source] of [[EMBED,'Livecounts Instagram embed'],[PAGE,'Livecounts Instagram página']]){
    try{return{count:parseLivecounts(await textResponse(url)),fuente:source,source_stale:false};}
    catch(e){errors.push(`${source}: ${e.name==='AbortError'?'timeout':e.message}`)}
  }
  // Fuente de respaldo ya existente en el proyecto anterior.
  try{
    const fallback=await readOther('instagram');
    if(fallback.consulta_ok===true&&fallback.cuenta===HANDLE)return{
      count:validCount(fallback.count),fuente:fallback.fuente,source_stale:true
    };
  }catch(e){errors.push(`Respaldo: ${e.message}`)}
  throw new Error(errors.join(' | '));
}
async function read(){
  if(cache&&Date.now()-cache.time<CACHE_MS)return cache.data;
  if(pending)return pending;
  pending=(async()=>{
    try{
      const value=await obtain();const data={consulta_ok:true,platform:'instagram',cuenta:HANDLE,
        count:value.count,fuente:value.fuente,source_stale:value.source_stale,
        queried_at:new Date().toISOString(),embed_url:EMBED};
      cache={time:Date.now(),data};return data;
    }catch(e){
      if(cache&&Date.now()-cache.time<LAST_GOOD_MS)return{...cache.data,source_stale:true,
        nota:'Último valor disponible; las fuentes no respondieron ahora'};
      throw e;
    }
  })();
  try{return await pending}finally{pending=null}
}
async function handler(req,res){
  if(req.method&&req.method!=='GET'){
    res.setHeader('Allow','GET');return res.status(405).json({consulta_ok:false,nota:'Solo GET'});
  }
  try{
    const data=await read();res.setHeader('Cache-Control','public, max-age=0, s-maxage=30, stale-while-revalidate=30');
    return res.status(200).json(data);
  }catch(e){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({consulta_ok:false,platform:'instagram',cuenta:HANDLE,count:null,
      nota:e.message,explicacion:'El iframe de Livecounts puede mostrar seguidores mediante JavaScript que la API no puede leer directamente.'});
  }
}
module.exports=handler;
module.exports._test={parseLivecounts,validCount,obtain,read};
