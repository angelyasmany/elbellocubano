import {tikTokResponse} from '../lib/tiktok.mjs';
import {readSocialCount} from '../lib/social-counts.mjs';

// Una función para las cuatro redes. Las reescrituras de vercel.json mantienen
// los endpoints individuales utilizados por el HTML.
export function createHandler({tiktok=tikTokResponse,social=readSocialCount}={}) {
 return async function handler(req,res) {
  const send=async response=>{
   res.statusCode=response.status;
   for(const [key,value] of response.headers)res.setHeader(key,value);
   res.setHeader('X-Content-Type-Options','nosniff');
   res.end(await response.text());
  };
  if(req.method!=='GET')return send(Response.json({consulta_ok:false,nota:'Solo se permite GET'},{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}}));
  const url=new URL(req.url,'http://localhost');
  const network=req.query?.network||url.searchParams.get('network');
  const read=name=>name==='tiktok'?tiktok():social(name);
  try {
   if(network){
    if(!['tiktok','instagram','facebook','youtube'].includes(network))return send(Response.json({consulta_ok:false,nota:'Red desconocida'},{status:404}));
    return send(await read(network));
   }
   const names=['tiktok','instagram','facebook','youtube'];
   const results=await Promise.all(names.map(async name=>{try{return await (await read(name)).json();}catch{return {consulta_ok:false,count:null,nota:'No se pudo consultar esta fuente'};}}));
   return send(Response.json({consulta_ok:results.every(x=>x.consulta_ok),redes:Object.fromEntries(names.map((name,i)=>[name,results[i]])),queried_at:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}}));
  } catch {
   return send(Response.json({consulta_ok:false,count:null,nota:'La fuente no pudo responder'},{status:502,headers:{'Cache-Control':'no-store'}}));
  }
 };
}
export default createHandler();
