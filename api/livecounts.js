'use strict';
// Cifras públicas de Livecounts, consultadas con límite y caché.
// No utiliza Meta Graph API, Chromium ni credenciales privadas.
const HANDLE='elbellocubano';
const BASE='https://livecounts.nl';
const MIN_INTERVAL=60_000;
const FAILURE_INTERVAL=40_000;
const SOURCE_TIMEOUT=5_000;
let nextFetch=0,pending=null;
const last={facebook:null,instagram:null};

function integer(raw){
 const s=String(raw??'').replace(/[\u00a0\u202f]/g,' ').trim();
 if(!/^(?:\d+|\d{1,3}(?:[., ]\d{3})+)$/.test(s))return null;
 const value=Number(s.replace(/[., ]/g,''));
 return Number.isSafeInteger(value)&&value>0?value:null;
}
function facebook(html){
 const meta=(html.match(/<meta\b[^>]*>/gi)||[]).find(tag=>/\b(?:name|property)=["'](?:description|og:description)["']/i.test(tag));
 const description=meta?.match(/\bcontent=["']([^"']+)["']/i)?.[1]||'';
 if(!description.toLowerCase().includes(HANDLE))return null;
 const count=description.match(/\bhas\s+([\d., ]+)\s+Facebook\s+followers\b/i)
  ||description.match(/:\s*([\d., ]+)\s+followers\s+on\s+Facebook\b/i);
 return integer(count?.[1]);
}
function instagram(html){
 const initial=html.match(/<script\b[^>]*\bid=["']ig-initial["'][^>]*>([\s\S]*?)<\/script>/i);
 if(initial){
  try{
   const data=JSON.parse(initial[1]);
   if(String(data?.username||'').toLowerCase()===HANDLE&&data.estimated!==true&&
      Number.isSafeInteger(data.followers)&&data.followers>0)return data.followers;
  }catch{/* Datos no legibles, intentar texto público. */}
 }
 // Livecounts publica también esta cifra en el HTML inicial de su página.
 if(!/instagram\.com\/elbellocubano|@elbellocubano|el Bello Cubano/i.test(html))return null;
 const visible=html.match(/<!--IG:followers-->\s*([\d., ]+)\s*<!--\/IG:followers-->/i);
 return integer(visible?.[1]);
}
async function query(network){
 const path=network==='facebook'?'/facebook-realtime/':'/instagram-realtime/';
 const response=await fetch(BASE+path+'?u='+HANDLE,{
  headers:{Accept:'text/html'},signal:AbortSignal.timeout(SOURCE_TIMEOUT)
 });
 if(!response.ok)throw Error('Fuente no disponible');
 const html=await response.text();
 if(html.length<100||html.length>1_500_000||/cf-chl-|just a moment|verify you are human/i.test(html))
  throw Error('HTML no disponible');
 const count=network==='facebook'?facebook(html):instagram(html);
 if(!count)throw Error('Sin número verificable');
 return count;
}
async function refresh(){
 const networks=['facebook','instagram'];
 const results=await Promise.allSettled(networks.map(query));
 let successes=0;
 results.forEach((r,i)=>{
  if(r.status!=='fulfilled')return;
  const name=networks[i];
  last[name]={count:r.value,checked_at:new Date().toISOString()};
  successes++;
 });
 nextFetch=Date.now()+(successes?MIN_INTERVAL:FAILURE_INTERVAL);
}
module.exports=async function handler(req,res){
 if(req.method&&req.method!=='GET'){
  res.setHeader('Allow','GET');
  return res.status(405).json({consulta_ok:false,nota:'Solo GET'});
 }
 try{
  if(Date.now()>=nextFetch){
   pending??=refresh().finally(()=>{pending=null;});
  }
  if(pending)await pending;
 }catch{/* Un corte de Livecounts no debe producir HTTP 5xx en la web. */}
 const facebookCount=last.facebook?.count??null;
 const instagramCount=last.instagram?.count??null;
 res.setHeader('Cache-Control','public, max-age=0, s-maxage=60, stale-while-revalidate=300');
 return res.status(200).json({
  consulta_ok:facebookCount!==null||instagramCount!==null,
  fuente:'Livecounts.nl',
  facebook:facebookCount,instagram:instagramCount,
  checked_at:{facebook:last.facebook?.checked_at??null,instagram:last.instagram?.checked_at??null},
  source_stale:!facebookCount||!instagramCount
 });
};
module.exports._test={integer,facebook,instagram};