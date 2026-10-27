/* API /api/cambio-pen-cup - Sólo tasas verificables publicadas por Remesas JJ.
 * No se presenta como actual una cifra ficticia, otra ruta ni la última cotización antigua.
 * La página puede cambiar su formato o dejar de publicar la ruta PEN/CUP.
 */
'use strict';
const SOURCE='https://www.remesasjj.com/tasas-de-cambio';
let cache=null,loading=null;
const TTL=15*60*1000;
function readable(html){
 return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
 .replace(/<[^>]*>/g,' ')
 .replace(/&nbsp;|&#160;/gi,' ')
 .replace(/&rarr;|&rightarrow;/gi,' → ')
 .replace(/&[a-z]+;/gi,' ')
 .replace(/\s+/g,' ').trim();
}
function parseRate(html){
 const text=readable(html);
 // The pair and the actual unit must be next to one another. Avoid matches from
 // another destination, from ads, or from unrelated PEN/USD tables.
 const hits=[...text.matchAll(/\bPER[ÚU]\b\s*(?:[→➜⇒-]\s*)?\bCUBA\b\s*1\s*PEN\s*[=≈]\s*([0-9]+(?:[.,][0-9]{1,5})?)\s*CUP\b/gi)];
 if(hits.length!==1)throw Error('No hay una cotización PEN→CUP inequívoca en la página');
 const rate=Number(hits[0][1].replace(',','.'));
 if(!Number.isFinite(rate)||rate<=0||rate>10000)throw Error('Valor fuera de rango');
 return rate;
}
async function getRate(){
 if(cache&&Date.now()-cache.at<TTL)return cache;
 if(loading)return loading;
 loading=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
   const r=await fetch(SOURCE,{signal:controller.signal,headers:{Accept:'text/html','User-Agent':'elBelloCubano exchange display/1.0'}});
   if(!r.ok)throw Error('Fuente HTTP '+r.status);
   const html=await r.text();if(html.length>1500000)throw Error('Respuesta demasiado grande');
   const rate=parseRate(html);
   cache={rate,at:Date.now()};return cache;
  }finally{clearTimeout(timer)}
 })();
 try{return await loading}finally{loading=null}
}
module.exports=async(req,res)=>{
 if(req.method&&req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false})}
 try{const v=await getRate();res.setHeader('Cache-Control','public, max-age=0, s-maxage=300');return res.status(200).json({ok:true,rate:v.rate,pair:'PEN/CUP',direction:'Perú a Cuba',fuente:SOURCE,consultado:new Date(v.at).toISOString()})}
 catch(err){res.setHeader('Cache-Control','no-store');return res.status(503).json({ok:false,rate:null,pair:'PEN/CUP',fuente:SOURCE,nota:'Sin tasa PEN/CUP verificable en la fuente'})}
};
module.exports._test={readable,parseRate};
