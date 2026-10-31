'use strict';
/**
 * Facebook @elbellocubano. SOLO Meta Graph API oficial.
 * Configure FACEBOOK_PAGE_ID y FACEBOOK_PAGE_ACCESS_TOKEN en Vercel.
 * La API es del servidor; nunca se publica el token en HTML/JS del navegador.
 */
const HANDLE='elbellocubano';
const FRESH_MS=120000;
const LAST_GOOD_MS=24*60*60*1000;
const RETRY_MS=45000;
let lastGood=null, pending=null, lastFailure=null;
function exactInteger(value){
 if(typeof value!=='number'&&typeof value!=='string')throw Error('Meta no entregó followers_count');
 if(!/^\d+$/.test(String(value)))throw Error('followers_count incompleto o no disponible');
 const number=Number(value);
 if(!Number.isSafeInteger(number)||number<0)throw Error('followers_count no válido');
 return number;
}
async function queryMeta(env=process.env, fetchImpl=fetch){
 const id=String(env.FACEBOOK_PAGE_ID||'').trim();
 const token=String(env.FACEBOOK_PAGE_ACCESS_TOKEN||'').trim();
 if(!id||!token){const error=Error('Configura FACEBOOK_PAGE_ID y FACEBOOK_PAGE_ACCESS_TOKEN en Vercel');error.configuration=true;throw error;}
 if(!/^\d{5,25}$/.test(id))throw Error('FACEBOOK_PAGE_ID incorrecto');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6500);
 try{
  const url='https://graph.facebook.com/v26.0/'+encodeURIComponent(id)+'?fields=id,followers_count';
  const response=await fetchImpl(url,{signal:controller.signal,headers:{Accept:'application/json',Authorization:'Bearer '+token}});
  if(!response.ok)throw Error('Meta Graph API HTTP '+response.status);
  const result=await response.json();
  if(String(result.id)!==id)throw Error('La API entregó una página diferente');
  return exactInteger(result.followers_count);
 }finally{clearTimeout(timer)}
}
async function read(){
 const now=Date.now();
 if(lastGood&&now-lastGood.time<FRESH_MS)return lastGood.data;
 if(lastFailure&&now-lastFailure.time<RETRY_MS){
  if(lastGood&&now-lastGood.time<LAST_GOOD_MS)return {...lastGood.data,source_stale:true};
  throw lastFailure.error;
 }
 if(pending)return pending;
 pending=(async()=>{
  try{
   const count=await queryMeta();
   const data={consulta_ok:true,platform:'facebook',cuenta:HANDLE,count,fuente:'Meta Graph API',estimated:false,source_stale:false,updated_at:new Date().toISOString()};
   lastGood={data,time:Date.now()};lastFailure=null;return data;
  }catch(error){
   lastFailure={error,time:Date.now()};
   if(lastGood&&Date.now()-lastGood.time<LAST_GOOD_MS)return {...lastGood.data,source_stale:true};
   throw error;
  }
 })();
 try{return await pending}finally{pending=null}
}
async function handler(req,res){
 if(req.method&&req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({consulta_ok:false,nota:'Solo GET'});}
 try{
  const result=await read();
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=60, stale-while-revalidate=60');
  return res.status(200).json(result);
 }catch(error){
  res.setHeader('Cache-Control','no-store');
  return res.status(error.configuration?503:502).json({consulta_ok:false,platform:'facebook',cuenta:HANDLE,count:null,estimated:false,source_stale:false,missing_configuration:error.configuration===true,nota:error.message});
 }
}
module.exports=handler;
module.exports._test={exactInteger,queryMeta,read};
