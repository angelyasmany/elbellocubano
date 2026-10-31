"use strict";
const {CACHE_MS,parseCount,graph,error,ok}=require('./_meta');
let cached=null;
module.exports=async function facebook(req,res){
 if(req.method&&req.method!=='GET')return error(res,'METHOD_NOT_ALLOWED','Solo GET',405,'facebook');
 const id=process.env.FACEBOOK_PAGE_ID,token=process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
 if(!id||!token)return error(res,'CONFIG_MISSING','Configura FACEBOOK_PAGE_ID y FACEBOOK_PAGE_ACCESS_TOKEN en Vercel',503,'facebook');
 if(cached&&Date.now()-cached.ts<CACHE_MS)return ok(res,'facebook',cached.count,'Meta Graph API');
 try{
  const data=await graph('graph.facebook.com',id,'id,followers_count',token);
  if(String(data.id)!==String(id))throw new Error('La respuesta no corresponde a la página configurada');
  const count=parseCount(data.followers_count);
  cached={ts:Date.now(),count};
  return ok(res,'facebook',count,'Meta Graph API');
 }catch(err){return error(res,'META_API_ERROR',err.message,502,'facebook');}
};
