"use strict";
const DEFAULT_VERSION='v25.0';
const HANDLE='elbellocubano';
const TIMEOUT_MS=7000;
const CACHE_MS=60000;
function graphVersion(){
 const value=process.env.META_GRAPH_VERSION||DEFAULT_VERSION;
 return /^v\d{1,2}\.\d{1,2}$/.test(value)?value:DEFAULT_VERSION;
}
function parseCount(value){
 if(!(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0) &&
    !(typeof value==='string'&&/^\d+$/.test(value)&&Number.isSafeInteger(Number(value)))){
   throw new Error('Meta no entregó followers_count numérico');
 }
 return Number(value);
}
async function graph(host,identifier,fields,token){
 if(!token)throw new Error('Falta el token de Meta');
 const endpoint=new URL(`https://${host}/${graphVersion()}/${encodeURIComponent(identifier)}`);
 endpoint.searchParams.set('fields',fields);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
 try{
  const response=await fetch(endpoint,{signal:controller.signal,headers:{Accept:'application/json',Authorization:'Bearer '+token}});
  if(!response.ok)throw new Error('Meta Graph API respondió HTTP '+response.status);
  const result=await response.json();
  if(!result||typeof result!=='object'||result.error)throw new Error('La API de Meta devolvió datos inválidos');
  return result;
 }catch(err){
  if(err.name==='AbortError')throw new Error('La API de Meta tardó demasiado');
  throw err;
 }finally{clearTimeout(timer)}
}
function error(res,code,detail,status=502,network='meta'){
 res.setHeader('Cache-Control','no-store');
 return res.status(status).json({consulta_ok:false,platform:network,cuenta:HANDLE,count:null,error:code,nota:detail});
}
function ok(res,network,count,source){
 const now=new Date().toISOString();
 res.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
 return res.status(200).json({consulta_ok:true,platform:network,cuenta:HANDLE,count,fuente:source,
  estimated:false,source_stale:false,queried_at:now,updated_at:now});
}
module.exports={HANDLE,CACHE_MS,parseCount,graph,error,ok};
