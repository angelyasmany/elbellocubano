/* el Bello Cubano — prueba de contadores en index: exclusivamente API.
 * Facebook e Instagram: solo respuestas autentificadas de Meta Graph API.
 * TikTok y YouTube: sus propias APIs, sin datos de respaldo o almacenamiento.
 * Nunca utiliza Livecounts ni localStorage; un error muestra «—».
 * Este archivo SOLO se incluye en index.html; promociones conserva su lógica.
 */
(()=>{'use strict';
 const fmt=new Intl.NumberFormat('es-PE');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const networks=[
  {name:'TikTok',id:'tt-followers',url:'/api/tiktok',field:'tiktok',account:'elbellocubano7'},
  {name:'Facebook',id:'fb-followers',url:'/api/facebook',field:'count',account:'elbellocubano',meta:true},
  {name:'Instagram',id:'ig-followers',url:'/api/instagram',field:'count',account:'elbellocubano',meta:true},
  {name:'YouTube',id:'yt-subscribers',url:'/api/youtube',field:'count',account:'UCVvsVVbc0W8KIL1kRkIqWxQ'}
 ];
 const sources=networks.map(item=>({...item,
  node:document.getElementById(item.id),
  link:document.querySelector('[data-social="'+item.name+'"]'),
  value:null,shown:null,motion:null,busy:false,lastAttempt:0,state:'unavailable'
 })).filter(s=>s.node);
 const totalNode=document.getElementById('reach-total');
 const reach=document.getElementById('reach');
 const valid=v=>Number.isSafeInteger(v)&&v>=0;
 const DURATION=1600;
 let totalMotion=null,totalShown=null,hasAnimated=false;
 function animate(node,from,to,duration){
  let frame=0;
  const motion={cancel(){if(frame)cancelAnimationFrame(frame);frame=0;}};
  const start=from??0;
  if(reduced.matches||document.hidden||start===to){node.textContent=fmt.format(to);return motion;}
  const begun=performance.now();
  function step(time){
   const t=Math.min(1,(time-begun)/duration);
   const eased=1-Math.pow(1-t,3);
   node.textContent=fmt.format(Math.round(start+(to-start)*eased));
   if(t<1)frame=requestAnimationFrame(step);else frame=0;
  }
  node.textContent=fmt.format(start);
  frame=requestAnimationFrame(step);return motion;
 }
 function label(s){
  const type=s.name==='YouTube'?'suscriptores':'seguidores';
  s.node.dataset.state=s.state;
  s.node.title=valid(s.value)?fmt.format(s.value)+' '+type+' · '+s.name+' (API)':'Sin lectura válida de la API';
  if(s.link)s.link.setAttribute('aria-label','Abrir '+s.name+(valid(s.value)?': '+fmt.format(s.value)+' '+type:''));
 }
 function clear(s){
  s.motion?.cancel();s.motion=null;s.value=null;s.shown=null;s.state='unavailable';
  s.node.textContent='—';s.node.hidden=false;label(s);
 }
 function display(s,first=false){
  if(!valid(s.value))return;
  if(s.shown===s.value)return;
  s.motion?.cancel();
  const old=first?0:s.shown;
  s.shown=s.value;
  s.node.hidden=false;
  s.motion=animate(s.node,old,s.value,first?DURATION:650);
 }
 function total(first=false){
  if(!totalNode)return;
  const known=sources.filter(s=>valid(s.value));
  if(!known.length){totalMotion?.cancel();totalMotion=null;totalShown=null;totalNode.textContent='—';if(reach)reach.dataset.state='waiting';return;}
  const sum=known.reduce((acc,s)=>acc+s.value,0);
  if(!Number.isSafeInteger(sum))return;
  if(reach){
   reach.dataset.state=known.length===sources.length?'ready':'partial';
   reach.title='Suma de '+known.map(s=>s.name).join(', ')+'. '+(known.length<sources.length?'Total parcial. ':'')+
    'Las audiencias pueden repetirse: no representa espectadores únicos.';
  }
  if(totalShown===sum)return;
  totalMotion?.cancel();
  const from=first?0:totalShown;
  totalShown=sum;
  totalMotion=animate(totalNode,from,sum,first?DURATION:650);
 }
 function isMetaResponse(data){
  // Las APIs anteriores podían devolver Livecounts como respaldo con consulta_ok=true.
  // Solo admitimos cifras que el servidor identifique expresamente como Meta/Graph.
  const source=[data.fuente,data.source,data.provider,data.origen].filter(x=>typeof x==='string').join(' ');
  return /\bmeta\b|\bgraph\s*api\b|\bgraph\.facebook\b|\bgraph\.instagram\b/i.test(source);
 }
 async function update(s,force=false){
  if(s.busy||document.hidden)return;
  const now=Date.now();
  if(!force&&s.lastAttempt&&now-s.lastAttempt<90000)return;
  s.lastAttempt=now;s.busy=true;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(s.url,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   const value=data[s.field];
   if(data.consulta_ok!==true||data.cuenta!==s.account||!valid(value)||data.estimated===true||data.source_stale===true){
    throw Error('La API no devolvió una cifra actual y verificable');
   }
   if(s.meta&&!isMetaResponse(data))throw Error('El proveedor no es Meta');
   s.value=value;s.state='ready';label(s);
   if(hasAnimated){display(s);total();}
  }catch(error){
   // Si falla la consulta, nunca conservamos una cifra anterior.
   clear(s);
   if(hasAnimated)total();
   if(s.meta)console.info('[elBelloCubano] Meta '+s.name+': '+String(error.message||error));
  }finally{clearTimeout(timeout);s.busy=false;}
 }
 for(const s of sources)clear(s);
 if(totalNode)totalNode.textContent='—';
 const first=sources.map(s=>update(s,true));
 // Cuando están todas listas, la animación empieza a la vez.
 // Para evitar que una API caída bloquee a las demás, tope de espera: 4,8s.
 const deadline=new Promise(resolve=>setTimeout(resolve,4800));
 Promise.race([Promise.allSettled(first),deadline]).then(()=>{
  hasAnimated=true;
  for(const s of sources)display(s,true);
  total(true);
  document.documentElement.classList.add('counters-ready');
 });
 setInterval(()=>sources.forEach(s=>update(s)),150000);
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)sources.forEach(s=>update(s));
 });
 window.addEventListener('online',()=>sources.forEach(s=>update(s)));
})();
