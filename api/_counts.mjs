const CHANNEL='UCVvsVVbc0W8KIL1kRkIqWxQ';
const CACHE_MS=60000;
const cache={time:0,result:null};
function integer(value){
 const raw=String(value??'').trim();
 if(!/^(?:\d+|\d{1,3}(?:[, .\u00a0\u202f]\d{3})+)$/.test(raw))throw Error('Contador inválido');
 const valueNumber=Number(raw.replace(/[, .\u00a0\u202f]/g,''));
 if(!Number.isSafeInteger(valueNumber))throw Error('Contador fuera de rango');
 return valueNumber;
}
async function getJSON(url,timeoutMs=6500){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('La fuente respondió HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(timer)}
}
async function fromYouTube(){
 if(!process.env.YOUTUBE_API_KEY)throw Error('No hay YOUTUBE_API_KEY');
 const url=new URL('https://www.googleapis.com/youtube/v3/channels');
 url.searchParams.set('part','statistics');url.searchParams.set('id',CHANNEL);url.searchParams.set('key',process.env.YOUTUBE_API_KEY);
 const data=await getJSON(url.toString());
 const channel=data.items?.find(item=>item.id===CHANNEL);
 if(!channel||channel.statistics?.hiddenSubscriberCount)throw Error('El canal no ofrece cifras públicas');
 return {count:integer(channel.statistics.subscriberCount),fuente:'YouTube Data API'};
}
async function fromMixerno(){
 const data=await getJSON('https://mixerno.space/api/youtube-channel-counter/user/'+CHANNEL);
 const metric=data?.counts?.find(item=>item.value==='subscribers');
 if(!metric)throw Error('Fuente alternativa sin suscriptores');
 const stamp=Number(data.updatedAt);
 const updatedAt=Number.isFinite(stamp)&&stamp>0&&stamp<=Date.now()+60000?new Date(stamp).toISOString():null;
 return {count:integer(metric.count),fuente:'Mixerno.Space',source_stale:data.isStale===true,updated_at:updatedAt};
}
export async function countResponse(network){
 if(network!=='youtube')return Response.json({consulta_ok:false},{status:404});
 if(cache.result&&Date.now()-cache.time<CACHE_MS)return Response.json(cache.result,{headers:{'Cache-Control':'public, max-age=0, s-maxage=60'}});
 try{
  let result;
  try{result=await fromYouTube()}catch(e){result=await fromMixerno()}
  const now=new Date().toISOString();
  const data={consulta_ok:true,platform:'youtube',cuenta:CHANNEL,...result,fuente:result.fuente,
   estimated:false,source_stale:result.source_stale===true,queried_at:now,updated_at:result.updated_at||now};
  cache.result=data;cache.time=Date.now();
  return Response.json(data,{headers:{'Cache-Control':'public, max-age=0, s-maxage=60'}});
 }catch(err){
  return Response.json({consulta_ok:false,platform:'youtube',cuenta:CHANNEL,count:null,error:'SOURCE_UNAVAILABLE',nota:'YouTube no respondió con una cifra verificable'},
   {status:502,headers:{'Cache-Control':'no-store'}});
 }
}
