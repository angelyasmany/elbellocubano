// Utilidades del servidor. Los navegadores consultan /api/*, nunca las fuentes directamente.
const HANDLE = 'elbellocubano';
const CHANNEL = 'UCVvsVVbc0W8KIL1kRkIqWxQ';
const SOURCES = {
  instagram: {url:`https://mixerno.space/instagram-user-counter/${HANDLE}`,source:'Mixerno.Space',ttl:60},
  facebook: {url:`https://livecounts.nl/facebook-realtime/?u=${HANDLE}`,source:'Livecounts',ttl:60},
  youtube: {url:`https://mixerno.space/api/youtube-channel-counter/user/${CHANNEL}`,source:'Mixerno.Space',ttl:10}
};
const cache = new Map();
const pending = new Map();
function validCount(raw) {
  if (!/^(?:\d+|\d{1,3}(?:[,.\s\u00a0\u202f]\d{3})+)$/.test(String(raw).trim())) throw new Error('Contador inválido');
  const number = Number(String(raw).replace(/[,\.\s\u00a0\u202f]/g,''));
  if (!Number.isSafeInteger(number) || number < 0) throw new Error('Contador inválido');
  return number;
}
function attrs(tag) {
  const result={};
  for (const match of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) result[match[1].toLowerCase()]=match[2]??match[3];
  return result;
}
function metadata(html) {
  const meta={};
  for (const tag of html.match(/<meta\b[^>]*>/gi)||[]) {
    const a=attrs(tag);if(a.property||a.name)meta[(a.property||a.name).toLowerCase()]=a.content||'';
  }
  return meta;
}
function readPage(html,network) {
  const meta=metadata(html),canonical=new URL(meta['og:url']||'https://invalid.local/');
  if(network==='instagram') {
    if(canonical.hostname!=='mixerno.space'||canonical.pathname.replace(/\/$/,'').toLowerCase()!==`/instagram-user-counter/${HANDLE}`) throw new Error('La fuente no confirmó la cuenta de Instagram');
    const reading=html.match(/<[^>]*\bid=["']followers["'][^>]*>\s*([0-9][0-9,.\s]*)\s*</i);
    if(!reading)throw new Error('Instagram no muestra una cifra completa');
    return {count:validCount(reading[1]),updated_at:null,source_stale:true};
  }
  if(canonical.hostname!=='livecounts.nl'||canonical.pathname!=='/facebook-realtime/'||canonical.searchParams.get('u')?.toLowerCase()!==HANDLE)throw new Error('La fuente no confirmó la cuenta de Facebook');
  const description=meta['og:description']||meta.description||'';
  const reading=description.match(/\b([0-9][0-9,.\s]*)\s+Facebook\s+followers\b/i);
  if(!reading)throw new Error('Facebook no muestra una cifra completa');
  const date=description.match(/from Facebook,\s*([^)]+)\)/i);
  const timestamp=date?Date.parse(date[1]):NaN;
  const updated_at=Number.isFinite(timestamp)&&timestamp<=Date.now()+60000?new Date(timestamp).toISOString():null;
  return {count:validCount(reading[1]),updated_at,source_stale:updated_at?Date.now()-timestamp>600000:true};
}
async function retrieve(network) {
  const config=SOURCES[network];
  if(!config)throw new Error('Red desconocida');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetch(config.url,{signal:controller.signal,headers:{Accept:network==='youtube'?'application/json':'text/html','Accept-Language':'en-US,en;q=0.9','User-Agent':'Mozilla/5.0'}});
    if(!response.ok)throw new Error(`La fuente respondió ${response.status}`);
    let reading;
    if(network==='youtube') {
      const data=await response.json(),metric=data?.counts?.find(item=>item.value==='subscribers');
      reading={count:validCount(metric?.count),updated_at:null,source_stale:data.isStale===true};
      const stamp=Number(data.updatedAt);
      if(Number.isFinite(stamp)&&stamp>0&&stamp<=Date.now()+60000)reading.updated_at=new Date(stamp).toISOString();
    } else reading=readPage(await response.text(),network);
    return {consulta_ok:true,platform:network,cuenta:network==='youtube'?CHANNEL:HANDLE,fuente:config.source,queried_at:new Date().toISOString(),...reading};
  } finally {clearTimeout(timer);}
}
async function read(network) {
  const config=SOURCES[network],cached=cache.get(network);
  if(cached&&Date.now()-cached.time<config.ttl*1000)return cached.data;
  if(pending.has(network))return pending.get(network);
  const operation=retrieve(network).then(data=>{cache.set(network,{data,time:Date.now()});return data});
  pending.set(network,operation);
  try{return await operation}finally{pending.delete(network)}
}
async function serve(network,req,res) {
  if(req.method&&req.method!=='GET')return res.status(405).json({consulta_ok:false,nota:'Solo GET'});
  try {
    const data=await read(network);
    res.setHeader('Cache-Control',`public, max-age=0, s-maxage=${SOURCES[network].ttl}, stale-while-revalidate=60`);
    return res.status(200).json(data);
  } catch(error) {
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({consulta_ok:false,platform:network,cuenta:network==='youtube'?CHANNEL:HANDLE,count:null,updated_at:null,nota:error.name==='AbortError'?'La fuente tardó demasiado en responder':error.message});
  }
}
module.exports={serve,readPage,validCount,CHANNEL};
