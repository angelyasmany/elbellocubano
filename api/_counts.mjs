const CHANNEL='UCVvsVVbc0W8KIL1kRkIqWxQ', HANDLE='elbellocubano';
const cache=new Map();
const FRESH=60000, RETAIN=86400000;
export function integer(value){
 const raw=String(value??'').trim();
 if(!/^(?:\d+|\d{1,3}(?:[, .\u00a0\u202f]\d{3})+)$/.test(raw))throw Error('Cifra incompleta');
 const n=Number(raw.replace(/[, .\u00a0\u202f]/g,''));
 if(!Number.isSafeInteger(n)||n<0)throw Error('Cifra inválida');return n;
}
export function youtubeReading(data){
 const metric=data?.counts?.find(item=>item.value==='subscribers');
 if(!metric)throw Error('La fuente no entregó suscriptores');
 const stamp=Number(data.updatedAt);
 return {count:integer(metric.count),fuente:'Mixerno.Space',source_stale:data.isStale===true,updated_at:Number.isFinite(stamp)&&stamp>0&&stamp<=Date.now()+60000?new Date(stamp).toISOString():null};
}
export function facebookReading(html){
 const meta={};
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const a={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))a[m[1].toLowerCase()]=m[2]??m[3];meta[(a.property||a.name||'').toLowerCase()]=a.content||'';}
 const canonical=new URL(meta['og:url']||'https://invalid.local');
 if(canonical.hostname!=='livecounts.nl'||canonical.searchParams.get('u')?.toLowerCase()!==HANDLE||!['/facebook-realtime/','/facebook-realtime/embed/'].includes(canonical.pathname))throw Error('La fuente no confirmó la cuenta');
 const description=meta['og:description']||meta.description||'';
 const m=description.match(/\b([0-9][0-9,.\s]*)\s+Facebook\s+followers\b/i);
 if(!m)throw Error('Facebook no publicó un número legible');
 const count=integer(m[1]);if(count<1)throw Error('La fuente muestra un marcador vacío');
 const date=description.match(/from Facebook,\s*([^)]+)\)/i),stamp=date?Date.parse(date[1]):NaN;
 const updated_at=Number.isFinite(stamp)&&stamp<=Date.now()+60000?new Date(stamp).toISOString():null;
 return {count,fuente:'Livecounts página',updated_at,source_stale:!updated_at||Date.now()-stamp>600000};
}
async function fetchValue(url,json,fetchImpl,timeoutMs){
 const controller=new AbortController();let timer;
 const work=(async()=>{const r=await fetchImpl(url,{signal:controller.signal,headers:{Accept:json?'application/json':'text/html'}});if(!r.ok)throw Error('La fuente respondió HTTP '+r.status);return json?r.json():r.text()})();
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('La fuente tardó demasiado'))},timeoutMs)});
 try{return await Promise.race([work,deadline])}finally{clearTimeout(timer)}
}
export async function countResponse(network,{fetchImpl=fetch,env={},timeoutMs=5000,store=cache,now=Date.now}={}){
 if(!['youtube','facebook'].includes(network))return Response.json({consulta_ok:false},{status:404});
 const account=network==='youtube'?CHANNEL:HANDLE,cached=store.get(network),queried_at=new Date(now()).toISOString();
 const respond=reading=>Response.json({consulta_ok:true,platform:network,cuenta:account,queried_at,...reading},{headers:{'Cache-Control':'public, max-age=0, s-maxage=30, stale-while-revalidate=60'}});
 if(cached&&now()-cached.time<FRESH)return respond(cached.reading);
 try{
  let reading;
  if(network==='youtube'){
   if(env.YOUTUBE_API_KEY){try{const data=await fetchValue('https://www.googleapis.com/youtube/v3/channels?part=statistics&id='+CHANNEL+'&key='+encodeURIComponent(env.YOUTUBE_API_KEY),true,fetchImpl,timeoutMs);const item=data.items?.find(item=>item.id===CHANNEL);if(!item||item.statistics?.hiddenSubscriberCount)throw Error('Canal no confirmado');reading={count:integer(item.statistics.subscriberCount),fuente:'YouTube Data API',source_stale:false,updated_at:queried_at}}catch{}}
   if(!reading)reading=youtubeReading(await fetchValue('https://mixerno.space/api/youtube-channel-counter/user/'+CHANNEL,true,fetchImpl,timeoutMs));
  }else{
   if(env.FACEBOOK_PAGE_ID&&env.FACEBOOK_PAGE_ACCESS_TOKEN){try{const data=await fetchValue('https://graph.facebook.com/v24.0/'+encodeURIComponent(env.FACEBOOK_PAGE_ID)+'?fields=id,followers_count&access_token='+encodeURIComponent(env.FACEBOOK_PAGE_ACCESS_TOKEN),true,fetchImpl,timeoutMs);if(String(data.id)!==String(env.FACEBOOK_PAGE_ID))throw Error('Página no confirmada');reading={count:integer(data.followers_count),fuente:'Meta Graph API',source_stale:false,updated_at:queried_at}}catch{}}
   if(!reading){let error;for(const path of ['/facebook-realtime/','/facebook-realtime/embed/']){try{reading=facebookReading(await fetchValue('https://livecounts.nl'+path+'?u='+HANDLE,false,fetchImpl,timeoutMs));break}catch(e){error=e}}if(!reading)throw error;}
  }
  store.set(network,{reading,time:now()});return respond(reading);
 }catch(error){
  if(cached&&now()-cached.time<RETAIN)return respond({...cached.reading,source_stale:true,nota:'Último dato verificado; la fuente no responde ahora'});
  return Response.json({consulta_ok:false,platform:network,cuenta:account,count:null,updated_at:null,nota:error.message,embed_url:network==='facebook'?'https://livecounts.nl/facebook-realtime/embed/?u='+HANDLE:undefined},{status:502,headers:{'Cache-Control':'no-store'}});
 }
}
