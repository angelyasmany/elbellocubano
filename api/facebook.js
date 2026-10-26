'use strict';
/* Facebook: API oficial, Livecounts como respaldo numérico verificable y caché.
   El iframe no es una API numérica y no se publica en la portada. */
const HANDLE='elbellocubano';
const EMBED_URL='https://livecounts.nl/facebook-realtime/embed/?u='+HANDLE;
const PAGE_URL='https://livecounts.nl/facebook-realtime/?u='+HANDLE;
const FRESH_MS=60_000, LAST_GOOD_MS=24*60*60*1000;
let lastGood=null,pending=null;
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
  const a={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))a[m[1].toLowerCase()]=m[2]??m[3];
  const name=(a.property||a.name||'').toLowerCase();if(name&&a.content)out[name]=a.content;
 }
 return out;
}
function parseLivecounts(html){
 if(typeof html!=='string'||html.length<16||/cf-chl-|just a moment|checking your browser|verify you are human/i.test(html))throw Error('Livecounts no disponible');
 const m=metaTags(html);
 // Exigir una asociación inequívoca al perfil consultado. No leer números ajenos a la cuenta.
 const canonical=m['og:url'];
 if(!canonical)throw Error('Livecounts no confirmó la página');
 let url;try{url=new URL(canonical)}catch{throw Error('URL de cuenta inválida')}
 if(url.hostname!=='livecounts.nl'||!['/facebook-realtime/','/facebook-realtime/embed/'].includes(url.pathname)||url.searchParams.get('u')?.toLowerCase()!==HANDLE)
  throw Error('Livecounts no confirmó la cuenta');
 const description=[m['og:description'],m.description].filter(Boolean).join(' ');
 const match=description.match(/\b([0-9][0-9,. ]{0,18})\s+(?:Facebook\s+)?(?:followers|seguidores)\b/i);
 if(!match)throw Error('Livecounts no expuso cifra numérica verificable');
 return parseNumber(match[1]);
}
async function get(url,format,ms=5000){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),ms);
 try{
  const res=await fetch(url,{signal:ctl.signal,headers:{Accept:format==='json'?'application/json':'text/html'}});
  if(!res.ok)throw Error('HTTP '+res.status);
  const content=await res.text();if(content.length>1_500_000)throw Error('Respuesta demasiado grande');
  return format==='json'?JSON.parse(content):content;
 }finally{clearTimeout(timer)}
}
async function obtain(){
 const id=process.env.FACEBOOK_PAGE_ID,token=process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
 let failure;
 if(id&&token){
  try{
   const u=new URL('https://graph.facebook.com/v24.0/'+encodeURIComponent(id));
   u.searchParams.set('fields','id,followers_count');u.searchParams.set('access_token',token);
   const data=await get(u.href,'json');
   if(String(data.id)!==String(id))throw Error('ID de página no coincide');
   return {count:parseNumber(data.followers_count),fuente:'Meta Graph API'};
  }catch(err){failure=err}
 }
 for(const url of [PAGE_URL,EMBED_URL]){
  try{return {count:parseLivecounts(await get(url,'html')),fuente:'Livecounts metadatos'};}
  catch(err){failure=err}
 }
 throw failure||Error('Sin fuentes numéricas disponibles');
}
async function read(){
 if(lastGood&&Date.now()-lastGood.savedAt<FRESH_MS)return lastGood.data;
 if(pending)return pending;
 pending=(async()=>{
  try{
   const reading=await obtain();const stamp=new Date().toISOString();
   const data={consulta_ok:true,platform:'facebook',cuenta:HANDLE,count:reading.count,fuente:reading.fuente,source_stale:false,updated_at:stamp};
   lastGood={data,savedAt:Date.now()};return data;
  }catch(error){
   if(lastGood&&Date.now()-lastGood.savedAt<LAST_GOOD_MS)
    return {...lastGood.data,source_stale:true,nota:'Última cifra comprobada; fuente temporalmente indisponible'};
   throw error;
  }
 })();
 try{return await pending}finally{pending=null}
}
async function handler(req,res){
 if(req.method&&req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({consulta_ok:false,nota:'Solo GET'});}
 try{
  const result=await read();res.setHeader('Cache-Control','public, max-age=0, s-maxage=30, stale-while-revalidate=30');
  return res.status(200).json(result);
 }catch(err){
  res.setHeader('Cache-Control','no-store');
  return res.status(502).json({consulta_ok:false,platform:'facebook',cuenta:HANDLE,count:null,embed_url:EMBED_URL,nota:err.message});
 }
}
module.exports=handler;
module.exports._test={parseNumber,parseLivecounts,read};
