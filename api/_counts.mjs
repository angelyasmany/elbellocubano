/* Lector del contador de YouTube. Facebook e Instagram usan Meta en sus propias API. */
const CHANNEL='UCVvsVVbc0W8KIL1kRkIqWxQ';
const cache=new Map(), FRESH=60000, RETAIN=86400000;
function exactInteger(value){
 const raw=String(value??'').trim();
 if(!/^(?:\d+|\d{1,3}(?:[, .\u00a0\u202f]\d{3})+)$/.test(raw))throw Error('Cifra incompleta');
 const valueNumber=Number(raw.replace(/[, .\u00a0\u202f]/g,''));
 if(!Number.isSafeInteger(valueNumber)||valueNumber<0)throw Error('Cifra inválida');return valueNumber;
}
function mixernoReading(data){
 const metric=data?.counts?.find(item=>item.value==='subscribers');
 if(!metric)throw Error('La fuente no entregó suscriptores');
 const stamp=Number(data.updatedAt);
 return {count:exactInteger(metric.count),fuente:'Mixerno.Space',source_stale:data.isStale===true,updated_at:Number.isFinite(stamp)&&stamp>0&&stamp<=Date.now()+60000?new Date(stamp).toISOString():null};
}
async function fetchJSON(url,fetchImpl,timeoutMs){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetchImpl(url,{signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('La fuente respondió HTTP '+response.status);
  return response.json();
 }finally{clearTimeout(timer)}
}
export async function countResponse(network,{fetchImpl=fetch,env={},timeoutMs=5000,store=cache,now=Date.now}={}){
 if(network!=='youtube')return Response.json({consulta_ok:false},{status:404});
 const cached=store.get('youtube'),queried_at=new Date(now()).toISOString();
 const respond=reading=>Response.json({consulta_ok:true,platform:'youtube',cuenta:CHANNEL,queried_at,...reading},{headers:{'Cache-Control':'public, max-age=0, s-maxage=30, stale-while-revalidate=60'}});
 if(cached&&now()-cached.time<FRESH)return respond(cached.reading);
 try{
  let reading;
  if(env.YOUTUBE_API_KEY){
   try{
    const url='https://www.googleapis.com/youtube/v3/channels?part=statistics&id='+CHANNEL+'&key='+encodeURIComponent(env.YOUTUBE_API_KEY);
    const data=await fetchJSON(url,fetchImpl,timeoutMs);
    const item=data.items?.find(item=>item.id===CHANNEL);
    if(!item||item.statistics?.hiddenSubscriberCount)throw Error('Canal no confirmado');
    reading={count:exactInteger(item.statistics.subscriberCount),fuente:'YouTube Data API',source_stale:false,updated_at:queried_at};
   }catch{/* La fuente secundaria intenta conservar el contador cuando la API falla. */}
  }
  if(!reading)reading=mixernoReading(await fetchJSON('https://mixerno.space/api/youtube-channel-counter/user/'+CHANNEL,fetchImpl,timeoutMs));
  store.set('youtube',{reading,time:now()});return respond(reading);
 }catch(error){
  if(cached&&now()-cached.time<RETAIN)return respond({...cached.reading,source_stale:true,nota:'Último dato verificado; la fuente no respondió ahora'});
  return Response.json({consulta_ok:false,platform:'youtube',cuenta:CHANNEL,count:null,updated_at:null,nota:error.message},{status:502,headers:{'Cache-Control':'no-store'}});
 }
}
