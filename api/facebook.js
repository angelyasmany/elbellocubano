'use strict';
/* Facebook de El Bello Cubano.
   1) Meta Graph API oficial cuando el propietario configura credenciales en Vercel.
   2) Metadatos NUMÉRICOS verificables de Livecounts (página y widget en paralelo).
   3) Última lectura comprobada en memoria si las fuentes dejan de responder.
   Sin estimaciones, cifras inventadas ni lectura de dígitos arbitrarios de una web.
   La alternativa visual de Livecounts, que funciona por separado, está en el frontend.
*/
const HANDLE='elbellocubano';
const EMBED_URL='https://livecounts.nl/facebook-realtime/embed/?u='+HANDLE;
const PAGE_URL='https://livecounts.nl/facebook-realtime/?u='+HANDLE;
const FRESH_MS=60_000;
const LAST_GOOD_MS=30*24*60*60*1000;
const FAILURE_RETRY_MS=20_000;
let lastGood=null,pending=null,lastFailure=null;

function parseNumber(raw){
 const s=String(raw??'').replace(/[\u00a0\u202f]/g,' ').trim();
 if(!/^(?:\d+|\d{1,3}(?:[,. ]\d{3})+)$/.test(s))throw Error('Número incompleto');
 const n=Number(s.replace(/[,. ]/g,''));
 if(!Number.isSafeInteger(n)||n<1)throw Error('Cifra no verificable');
 return n;
}
function metaTags(html){
 const out={};
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
  const attrs={};
  for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[m[1].toLowerCase()]=m[2]??m[3];
  const name=(attrs.property||attrs.name||'').toLowerCase();
  if(name&&attrs.content)out[name]=attrs.content;
 }
 return out;
}
function parseLivecounts(html){
 if(typeof html!=='string'||html.length<16||/cf-chl-|just a moment|checking your browser|verify you are human/i.test(html))
  throw Error('Livecounts no disponible');
 const m=metaTags(html);
 const descriptions=[m['og:description'],m.description,m['twitter:description']].filter(Boolean);
 const identities=[m['og:title'],m['twitter:title'],...descriptions].filter(Boolean).join(' ');
 let canonicalCorrect=false;
 if(m['og:url']){
  try{
   const u=new URL(m['og:url']);
   canonicalCorrect=u.hostname==='livecounts.nl'&&
    ['/facebook-realtime/','/facebook-realtime/embed/'].includes(u.pathname)&&
    u.searchParams.get('u')?.toLowerCase()===HANDLE;
  }catch{/* URL no válida */}
 }
 // Algunas versiones del embed no publican og:url; exigir el identificador
 // explícito de la cuenta en título/descripcion, nunca en scripts o comentarios.
 if(!canonicalCorrect&&!identities.toLowerCase().includes(HANDLE))
  throw Error('Livecounts no confirmó la cuenta de Facebook');
 const text=descriptions.join(' ');
 const patterns=[
  /\b([\d][\d,. ]{0,18})\s+(?:Facebook\s+)?(?:followers|seguidores)\b/i,
  /\b(?:Facebook\s+)?(?:followers|seguidores)\s*:?\s*([\d][\d,. ]{0,18})\b/i
 ];
 for(const pattern of patterns){
  const match=text.match(pattern);
  if(match)return parseNumber(match[1]);
 }
 throw Error('Livecounts no publicó un número de seguidores verificable en sus metadatos');
}
async function get(url,format,ms=4500,headers={}){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),ms);
 try{
  const res=await fetch(url,{signal:ctl.signal,headers:{Accept:format==='json'?'application/json':'text/html',...headers}});
  if(!res.ok)throw Error('HTTP '+res.status);
  const body=await res.text();
  if(body.length>1_500_000)throw Error('Respuesta demasiado grande');
  return format==='json'?JSON.parse(body):body;
 }finally{clearTimeout(timer)}
}
async function obtain(){
 const id=process.env.FACEBOOK_PAGE_ID;
 const token=process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
 const errors=[];
 if(id&&token){
  try{
   const u=new URL('https://graph.facebook.com/v25.0/'+encodeURIComponent(id));
   u.searchParams.set('fields','id,followers_count');
   const result=await get(u.href,'json',4500,{Authorization:'Bearer '+token});
   if(String(result.id)!==String(id))throw Error('El ID de Facebook no coincide');
   return {count:parseNumber(result.followers_count),fuente:'Meta Graph API'};
  }catch(e){errors.push('Meta: '+(e.name==='AbortError'?'tiempo de espera':e.message));}
 }
 // Intentos paralelos: si uno falla, el otro aún puede devolver una cifra fiable.
 const attempts=[PAGE_URL,EMBED_URL].map(async url=>{
  const html=await get(url,'html',4800);
  return {count:parseLivecounts(html),fuente:url===PAGE_URL?'Livecounts página':'Livecounts embed'};
 });
 try{return await Promise.any(attempts)}
 catch(aggregate){
  for(const e of aggregate.errors||[])
   errors.push(e?.name==='AbortError'?'Livecounts: tiempo de espera':String(e?.message||'Livecounts no disponible'));
  throw Error(errors.join(' | ')||'Ninguna fuente devolvió seguidores verificables');
 }
}
async function read(){
 if(lastGood&&Date.now()-lastGood.savedAt<FRESH_MS)return lastGood.data;
 if(lastFailure&&Date.now()-lastFailure.at<FAILURE_RETRY_MS){
  if(lastGood&&Date.now()-lastGood.savedAt<LAST_GOOD_MS)
   return {...lastGood.data,source_stale:true,nota:'Última cifra verificada; fuente temporalmente caída'};
  throw lastFailure.error;
 }
 if(pending)return pending;
 pending=(async()=>{
  try{
   const reading=await obtain();
   const data={consulta_ok:true,platform:'facebook',cuenta:HANDLE,count:reading.count,
    fuente:reading.fuente,source_stale:false,updated_at:new Date().toISOString()};
   lastGood={data,savedAt:Date.now()};lastFailure=null;
   return data;
  }catch(error){
   lastFailure={error,at:Date.now()};
   if(lastGood&&Date.now()-lastGood.savedAt<LAST_GOOD_MS)
    return {...lastGood.data,source_stale:true,nota:'Última cifra verificada; fuente temporalmente caída'};
   throw error;
  }
 })();
 try{return await pending}finally{pending=null}
}
async function handler(req,res){
 if(req.method&&req.method!=='GET'){
  res.setHeader('Allow','GET');return res.status(405).json({consulta_ok:false,nota:'Solo GET'});
 }
 try{
  const data=await read();
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=30, stale-while-revalidate=30');
  return res.status(200).json(data);
 }catch(error){
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=15');
  return res.status(502).json({consulta_ok:false,platform:'facebook',cuenta:HANDLE,
   count:null,embed_url:EMBED_URL,source_stale:true,
   nota:'No se obtuvo ahora una cantidad verificable. El sitio puede mostrar el widget alternativo.',
   source_error:error.message});
 }
}
module.exports=handler;
module.exports._test={parseNumber,parseLivecounts,obtain,read};
