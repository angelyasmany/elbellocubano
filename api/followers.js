const USERNAME='elbellocubano7';
const BASE='https://tiktok-api.tokcounter.com';
let cached=null;
const RETAIN=86400000;
function display(count) {
  // Transformación de TokCounter que ya utilizabas.
  if(count>=10050&&count<=1049000)return count+50;
  if(count>=1050000&&count<=0x5fd821f)return count+50000;
  if(count>=100500000&&count<=0x3e95ba7f)return count+50000;
  if(count>=1050000000)return count+50000000;
  return count;
}
async function boundedJSON(url,timeout=7000){const controller=new AbortController();let timer;const work=(async()=>{const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`Fuente respondió ${response.status}`);return response.json()})();const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('La fuente tardó demasiado'))},timeout)});try{return await Promise.race([work,deadline])}finally{clearTimeout(timer)}}
async function query(){
  async function json(path){const data=await boundedJSON(BASE+path);if(data.success!==true)throw new Error('La fuente no pudo obtener el perfil');return data}
  try {
    const profile=await json(`/user/data/${USERNAME}`);
    if(typeof profile.id!=='string'||profile.id.toLowerCase()!==USERNAME||!/^\d+$/.test(String(profile.userId)))throw new Error('La fuente no confirmó la cuenta solicitada');
    const stats=await json(`/user/stats/${profile.userId}`),raw=stats.followerCount;
    if(!/^\d+$/.test(String(raw)))throw new Error('Contador inválido');
    const count=Number(raw),value=display(count);
    if(!Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(value))throw new Error('Contador inválido');
    return {tiktok:value,fuente:'TokCounter',cuenta:USERNAME,consulta_ok:true,fuente_cache:stats.cache===true,source_stale:false,updated_at:new Date().toISOString()};
  }catch(primaryError){
    if(!process.env.VERCEL){const data=await boundedJSON('https://elbellocubano.vercel.app/api/followers');if(data.consulta_ok===true&&data.cuenta===USERNAME&&Number.isSafeInteger(data.tiktok)&&data.tiktok>=0)return {...data,fuente:'API principal en Vercel',source_stale:false};}
    throw primaryError;
  }
}
module.exports=async(req,res)=>{
  if(req.method&&req.method!=='GET')return res.status(405).json({consulta_ok:false,nota:'Solo GET'});
  try {
    if(!cached||Date.now()-cached.time>=30000){const data=await query();cached={data,time:Date.now()}}
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=5, stale-while-revalidate=10');
    return res.status(200).json(cached.data);
  }catch(error){if(cached&&Date.now()-cached.time<RETAIN){res.setHeader('Cache-Control','public, max-age=0, s-maxage=30, stale-while-revalidate=60');return res.status(200).json({...cached.data,source_stale:true,nota:'Último dato verificado; la fuente no respondió ahora'})}res.setHeader('Cache-Control','no-store');return res.status(502).json({tiktok:null,consulta_ok:false,updated_at:null,nota:error.message})}
};
