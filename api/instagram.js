'use strict';
/** Instagram usa Livecounts.nl, SIN Meta.
 * La página de compartir puede aportar un número visible; si no lo aporta,
 * el navegador muestra su iframe transparente sin inventar una suma.
 */
const {fetchLivecounts,EMBEDS,PAGES}=require('./_livecounts');
const HANDLE='elbellocubano',FRESH_MS=120000,RETAIN_MS=24*60*60*1000,RETRY_MS=60000;
let lastGood=null,pending=null,lastFailure=null;
async function read(options={}){
 const now=Date.now();
 if(lastGood&&now-lastGood.time<FRESH_MS)return lastGood.data;
 if(lastFailure&&now-lastFailure.time<RETRY_MS){
  if(lastGood&&now-lastGood.time<RETAIN_MS)return {...lastGood.data,source_stale:true};
  throw lastFailure.error;
 }
 if(pending)return pending;
 pending=(async()=>{
  try{
   const result=await fetchLivecounts('instagram',options);
   const data={consulta_ok:true,platform:'instagram',cuenta:HANDLE,estimated:false,source_stale:false,...result};
   lastGood={time:Date.now(),data};lastFailure=null;return data;
  }catch(err){
   lastFailure={error:err,time:Date.now()};
   if(lastGood&&Date.now()-lastGood.time<RETAIN_MS)return {...lastGood.data,source_stale:true};
   throw err;
  }
 })();try{return await pending}finally{pending=null;}
}
module.exports=async(req,res)=>{
 if(req.method&&req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({consulta_ok:false});}
 try{
  const data=await read();
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=120, stale-while-revalidate=60');
  return res.status(200).json(data);
 }catch(err){
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
  return res.status(503).json({consulta_ok:false,platform:'instagram',cuenta:HANDLE,count:null,estimated:false,embed_url:EMBEDS.instagram,embed_obs_url:EMBEDS.instagram_obs,pagina_compartir:PAGES.instagram,nota:'La fuente no publicó una cifra numérica legible; se ofrece el widget visual.'});
 }
};
module.exports._test={read};
