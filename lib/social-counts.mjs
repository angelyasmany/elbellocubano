const HANDLE='elbellocubano';
export const YOUTUBE_CHANNEL='UCVvsVVbc0W8KIL1kRkIqWxQ';
const SOURCES={
 instagram:{url:'https://mixerno.space/instagram-user-counter/elbellocubano',cuenta:HANDLE,fuente:'Mixerno.Space · página pública de Instagram',ttl:60000},
 facebook:{url:'https://livecounts.nl/facebook-realtime/?u=elbellocubano',cuenta:HANDLE,fuente:'Livecounts · página pública de Facebook',ttl:60000},
 youtube:{url:'https://mixerno.space/api/youtube-channel-counter/user/'+YOUTUBE_CHANNEL,cuenta:YOUTUBE_CHANNEL,fuente:'Mixerno.Space',ttl:10000}
};
const decode=value=>String(value).replace(/&#x([0-9a-f]+);|&#(\d+);|&(amp|quot|apos|lt|gt);/gi,(_m,hex,dec,named)=>hex?String.fromCodePoint(parseInt(hex,16)):dec?String.fromCodePoint(Number(dec)):({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'})[named.toLowerCase()]);
export function publicProfileCount(source,network){
 const meta={};
 for(const tag of source.match(/<meta\b[^>]*>/gi)||[]){
  const attrs={};
  for(const match of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[match[1].toLowerCase()]=decode(match[2]??match[3]);
  if(attrs.property||attrs.name)meta[(attrs.property||attrs.name).toLowerCase()]=attrs.content||'';
 }
 const expected=network==='instagram'?'instagram.com':'facebook.com';
 const canonical=new URL(meta['og:url']||'https://invalid.local/');
 if(![expected,'www.'+expected].includes(canonical.hostname)||canonical.pathname.replace(/\/$/,'').toLowerCase()!=='/'+HANDLE)throw new Error('La fuente no confirmó la cuenta solicitada');
 const description=meta['og:description']||meta.description||'';
 const match=description.match(/\b([0-9][0-9,.\s\u00a0\u202f]*)\s+(?:followers|seguidores)\b/i);
 if(!match)throw new Error('El perfil no muestra un total preciso de seguidores');
 const raw=match[1].trim();
 if(!/^(?:\d+|\d{1,3}(?:[,.\s\u00a0\u202f]\d{3})+)$/.test(raw))throw new Error('Contador inválido');
 const count=Number(raw.replace(/[,\.\s\u00a0\u202f]/g,''));
 if(!Number.isSafeInteger(count)||count<0)throw new Error('Contador inválido');
 return count;
}
export function publicCounterReading(source,network){
 const meta={};
 for(const tag of source.match(/<meta\b[^>]*>/gi)||[]){
  const attrs={};
  for(const match of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[match[1].toLowerCase()]=decode(match[2]??match[3]);
  if(attrs.property||attrs.name)meta[(attrs.property||attrs.name).toLowerCase()]=attrs.content||'';
 }
 const canonical=new URL(meta['og:url']||'https://invalid.local/');
 let raw,updatedAt=null,stale=false;
 if(network==='instagram'){
  if(canonical.hostname!=='mixerno.space'||canonical.pathname.replace(/\/$/,'').toLowerCase()!=='/instagram-user-counter/'+HANDLE)throw new Error('La fuente no confirmó la cuenta solicitada');
  const reading=source.match(/<[^>]*\bid=["']followers["'][^>]*>\s*([0-9][0-9,.\s]*)\s*</i);
  if(!reading)throw new Error('La página no muestra un total de seguidores');
  raw=reading[1].trim();
  // La cifra está renderizada en la página pública; no se atribuye una fecha de lectura que no conocemos.
  stale=true;
 }else{
  if(canonical.hostname!=='livecounts.nl'||canonical.pathname!=='/facebook-realtime/'||canonical.searchParams.get('u')?.toLowerCase()!==HANDLE)throw new Error('La fuente no confirmó la cuenta solicitada');
  const description=meta['og:description']||meta.description||'';
  const reading=description.match(/\b([0-9][0-9,.\s]*)\s+Facebook\s+followers\b/i);
  if(!reading)throw new Error('La página no muestra un total de seguidores');
  raw=reading[1].trim();
  const date=description.match(/from Facebook,\s*([^)]+)\)/i);
  if(date){const stamp=Date.parse(date[1]);if(Number.isFinite(stamp))updatedAt=new Date(stamp).toISOString();}
 }
 if(!/^(?:\d+|\d{1,3}(?:[,.\s]\d{3})+)$/.test(raw))throw new Error('Contador inválido');
 const count=Number(raw.replace(/[,\.\s]/g,''));
 if(!Number.isSafeInteger(count)||count<0)throw new Error('Contador inválido');
 return {count,updatedAt,stale};
}
export function youtubeCount(data){
 const metric=data?.counts?.find(item=>item.value==='subscribers');
 const raw=metric?.count;
 if(!/^\d+$/.test(String(raw)))throw new Error('Contador de suscriptores inválido');
 const count=Number(raw);if(!Number.isSafeInteger(count)||count<0)throw new Error('Contador de suscriptores inválido');
 return count;
}
export async function socialCountResponse(network,{fetchImpl=fetch,now=()=>new Date(),timeoutMs=15000}={}){
 const config=SOURCES[network];
 if(!config)return Response.json({consulta_ok:false,count:null},{status:404,headers:{'Cache-Control':'no-store'}});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetchImpl(config.url,{signal:controller.signal,headers:{Accept:network==='youtube'?'application/json':'text/html','Accept-Language':'en-US,en;q=0.9','User-Agent':'Mozilla/5.0'}});
  if(!response.ok)throw new Error('La fuente no está disponible en este momento');
  const queried=now();let count,updated=queried.toISOString(),stale=false;
  if(network==='youtube'){
   const data=await response.json();count=youtubeCount(data);stale=data.isStale===true;
   const stamp=Number(data.updatedAt);
   if(Number.isFinite(stamp)&&stamp>0&&stamp<=queried.getTime()+60000)updated=new Date(stamp).toISOString();
  }else {
   const reading=publicCounterReading(await response.text(),network);count=reading.count;stale=reading.stale;updated=reading.updatedAt;
   if(reading.updatedAt&&new Date(reading.updatedAt).getTime()<=queried.getTime()+60000){updated=reading.updatedAt;stale=stale||queried.getTime()-new Date(updated).getTime()>600000;}
  }
  return Response.json({consulta_ok:true,platform:network,cuenta:config.cuenta,count,fuente:config.fuente,updated_at:updated,queried_at:queried.toISOString(),source_stale:stale},{headers:{'Cache-Control':`public, max-age=0, s-maxage=${config.ttl/1000}, stale-while-revalidate=60`}});
 }catch(error){
  return Response.json({consulta_ok:false,platform:network,cuenta:config.cuenta,count:null,updated_at:null,nota:error.name==='AbortError'?'La fuente tardó demasiado en responder':error.message},{status:502,headers:{'Cache-Control':'no-store'}});
 }finally{clearTimeout(timer);}
}
export function createSocialCountReader(options={}){
 const cache=new Map(),pending=new Map();
 const now=options.now||(()=>new Date());
 return async function read(network){
  const cached=cache.get(network);
  if(cached&&now().getTime()-cached.at<SOURCES[network].ttl)return new Response(cached.body,{status:200,headers:cached.headers});
  if(pending.has(network))return (await pending.get(network)).clone();
  const operation=(async()=>{
   const response=await socialCountResponse(network,options);
   if(response.ok)cache.set(network,{at:now().getTime(),body:await response.clone().text(),headers:Object.fromEntries(response.headers)});
   return response;
  })();
  pending.set(network,operation);
  try{return (await operation).clone();}finally{pending.delete(network);}
 };
}
export const readSocialCount=createSocialCountReader();
