const USERNAME='elbellocubano7';
const BASE='https://tiktok-api.tokcounter.com';
let cached=null,pending=null;
function display(count) {
  // Transformación de TokCounter que ya utilizabas.
  if(count>=10050&&count<=1049000)return count+50;
  if(count>=1050000&&count<=0x5fd821f)return count+50000;
  if(count>=100500000&&count<=0x3e95ba7f)return count+50000;
  if(count>=1050000000)return count+50000000;
  return count;
}
async function query(){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  async function json(path){const response=await fetch(BASE+path,{signal:controller.signal,headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`Fuente respondió ${response.status}`);const data=await response.json();if(data.success!==true)throw new Error('La fuente no pudo obtener el perfil');return data}
  try {
    const profile=await json(`/user/data/${USERNAME}`);
    if(typeof profile.id!=='string'||profile.id.toLowerCase()!==USERNAME||!/^\d+$/.test(String(profile.userId)))throw new Error('La fuente no confirmó la cuenta solicitada');
    const stats=await json(`/user/stats/${profile.userId}`),raw=stats.followerCount;
    if(!/^\d+$/.test(String(raw)))throw new Error('Contador inválido');
    const count=Number(raw),value=display(count);
    if(!Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(value))throw new Error('Contador inválido');
    return {tiktok:value,fuente:'TokCounter',cuenta:USERNAME,consulta_ok:true,fuente_cache:stats.cache===true,updated_at:new Date().toISOString()};
  }finally{clearTimeout(timer)}
}
module.exports=async(req,res)=>{
  if(req.method&&req.method!=='GET')return res.status(405).json({consulta_ok:false,nota:'Solo GET'});
  try {
    if(!cached||Date.now()-cached.time>=5000){if(!pending)pending=query().then(data=>{cached={data,time:Date.now()};return data}).finally(()=>{pending=null});await pending}
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=5, stale-while-revalidate=10');
    return res.status(200).json(cached.data);
  }catch(error){res.setHeader('Cache-Control','no-store');return res.status(502).json({tiktok:null,consulta_ok:false,updated_at:null,nota:error.name==='AbortError'?'La fuente tardó demasiado en responder':error.message})}
};
