"use strict";
const {HANDLE,CACHE_MS,parseCount,graph,error,ok}=require('./_meta');
let cached=null;
function verifyProfile(data){
 const username=String(data?.username||'').replace(/^@/,'').toLowerCase();
 if(username!==HANDLE)throw new Error('Meta respondió por una cuenta de Instagram distinta');
 return parseCount(data.followers_count);
}
async function instagramCount(){
 const issues=[];
 const direct=process.env.INSTAGRAM_ACCESS_TOKEN;
 if(direct){
  try{
   const data=await graph('graph.instagram.com','me','id,username,followers_count',direct);
   return verifyProfile(data);
  }catch(err){issues.push('Instagram Login: '+err.message);}
 }
 const token=process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
 const userId=process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID||process.env.INSTAGRAM_USER_ID;
 const pageId=process.env.FACEBOOK_PAGE_ID;
 if(token&&(userId||pageId)){
  try{
   let id=userId;
   if(!id){
    const page=await graph('graph.facebook.com',pageId,'id,instagram_business_account',token);
    if(String(page.id)!==String(pageId))throw new Error('La página de Facebook no coincide');
    id=page.instagram_business_account?.id;
    if(!id)throw new Error('La página no devolvió una cuenta profesional de Instagram vinculada');
   }
   const data=await graph('graph.facebook.com',id,'id,username,followers_count',token);
   if(userId&&String(data.id)!==String(userId))throw new Error('El ID de Instagram no coincide');
   return verifyProfile(data);
  }catch(err){issues.push('Facebook Login: '+err.message);}
 }
 if(!direct&&!(token&&(userId||pageId))){
  const err=new Error('Configura INSTAGRAM_ACCESS_TOKEN o FACEBOOK_PAGE_ACCESS_TOKEN con INSTAGRAM_BUSINESS_ACCOUNT_ID / FACEBOOK_PAGE_ID');
  err.missing=true;
  throw err;
 }
 throw new Error(issues.join(' | ')||'No se pudo consultar Instagram por Meta API');
}
module.exports=async function instagram(req,res){
 if(req.method&&req.method!=='GET')return error(res,'METHOD_NOT_ALLOWED','Solo GET',405,'instagram');
 if(cached&&Date.now()-cached.ts<CACHE_MS)return ok(res,'instagram',cached.count,'Meta Graph API');
 try{
  const count=await instagramCount();
  cached={ts:Date.now(),count};
  return ok(res,'instagram',count,'Meta Graph API');
 }catch(err){return error(res,err.missing?'CONFIG_MISSING':'META_API_ERROR',err.message,err.missing?503:502,'instagram');}
};
module.exports._test={verifyProfile,instagramCount};
