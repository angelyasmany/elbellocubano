/* el Bello Cubano — contadores animados con iframe visual solo de respaldo.
   No se confunden seguidores acumulados con espectadores únicos. */
(()=>{'use strict';
 const fmt=new Intl.NumberFormat('es-PE');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const VALID_FOR=30*24*60*60*1000;
 const REFRESH_MS=150000; // menos peticiones a Vercel que la actualización cada minuto
 const MIN_REFRESH_MS=90000; // no repetir al cambiar de pestaña o recuperar Internet
 const networks=[
  {name:'TikTok',id:'tt-followers',url:'/api/tiktok',field:'tiktok',account:'elbellocubano7'},
  {name:'Facebook',id:'fb-followers',url:'/api/facebook',field:'count',account:'elbellocubano'},
  {name:'Instagram',id:'ig-followers',url:'/api/instagram',field:'count',account:'elbellocubano'},
  {name:'YouTube',id:'yt-subscribers',url:'/api/youtube',field:'count',account:'UCVvsVVbc0W8KIL1kRkIqWxQ'}
 ];
 const sources=networks.map(item=>({...item,
  node:document.getElementById(item.id),
  link:document.querySelector('[data-social="'+item.name+'"]'),
  value:null,shown:null,visible:false,motion:null,busy:false,checked:0,updated:null,unknownAge:false,state:'unavailable',finishedFirstRequest:false,lastAttempt:0
 })).filter(s=>s.node);
 // Widget oficial del proveedor como respaldo VISUAL de Facebook.
 // No intentamos leer el iframe (es de otro dominio) ni lo sumamos al total.
 const facebookVisual=document.querySelector('.facebook-counter');
 const instagramVisual=document.querySelector('.instagram-counter:not(.facebook-counter)');
 function fallbackVisual(s){
  if(s.name==='Facebook'&&facebookVisual){
   const show=!valid(s.value)&&s.finishedFirstRequest;
   facebookVisual.hidden=!show;
   s.node.hidden=show;
  }
  if(s.name==='Instagram'&&instagramVisual){
   // Se ve un 0 provisional mientras llega la primera cifra verificable.
   // Si ya teníamos una cifra comprobada, podemos animarla mientras consultamos.
   // El cero NO se incluye en el alcance total como si fueran cero seguidores.
   const loading=!valid(s.value)&&!s.finishedFirstRequest;
   const numeric=valid(s.value)||loading;
   instagramVisual.hidden=numeric;
   s.node.hidden=!numeric;
   if(loading){
    s.node.textContent='0';
    s.node.dataset.state='loading';
    s.node.title='Consultando el número real de seguidores de Instagram…';
   }
  }
 }
 const totalNode=document.getElementById('reach-total');
 const reach=document.getElementById('reach');
 let totalMotion=null,totalShown=null;
 const valid=v=>Number.isSafeInteger(v)&&v>=0;
 function animate(node,from,to,duration){
  const motion={frame:0,current:from??0,cancel(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}};
  if(reduced.matches||document.hidden||from===to){motion.current=to;node.textContent=fmt.format(to);return motion;}
  const started=performance.now(),start=from??0;
  function step(now){const t=Math.min(1,(now-started)/duration),eased=1-Math.pow(1-t,3);
   motion.current=Math.round(start+(to-start)*eased);
   node.textContent=fmt.format(motion.current);
   if(t<1)motion.frame=requestAnimationFrame(step);else motion.frame=0;
  }
  motion.frame=requestAnimationFrame(step);return motion;
 }
 function label(s){
  const suffix=s.name==='YouTube'?'suscriptores':'seguidores';
  const age=s.state==='stale'&&s.checked?new Date(s.checked).toLocaleDateString('es-PE'):'';
  const old=s.state==='stale'?(s.unknownAge?' (cifra publicada por el proveedor; fecha de actualización desconocida)':' (última cifra comprobada'+(age?' el '+age:'')+'; puede haber cambiado)'):'';
  s.node.title=valid(s.value)?fmt.format(s.value)+' '+suffix+' · '+s.name+old:'Sin lectura verificable por ahora';
  if(s.link)s.link.setAttribute('aria-label','Abrir '+s.name+(valid(s.value)?': '+fmt.format(s.value)+' '+suffix+old:''));
  s.node.dataset.state=s.state;
  if(s.name==='Instagram'){
   const waiting=!valid(s.value)&&!s.finishedFirstRequest;
   s.node.setAttribute('aria-busy',waiting?'true':'false');
   if(waiting)s.node.title='Consultando el número real de seguidores de Instagram…';
  }
 }
 function igDuration(from,to,first){
  // El primer conteo debe ser apreciable, pero no tarda diez segundos con miles.
  const diff=Math.abs(to-from);
  const basic=diff<=5?1700:diff<=50?2000:diff<=1000?2400:diff<10000?2900:3400;
  return first?basic:Math.min(1600,Math.max(650,Math.round(basic*.55)));
 }
 function animateInstagram(node,from,to,duration){
  const motion={frame:0,current:from,cancel(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}};
  if(reduced.matches||document.hidden||from===to){
   motion.current=to;node.textContent=fmt.format(to);return motion;
  }
  node.textContent=fmt.format(from); // Siempre comienza visualmente en 0 al cargar por primera vez.
  const start=performance.now();
  function step(now){
   const t=Math.min(1,(now-start)/duration);
   const smooth=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
   const n=Math.round(from+(to-from)*smooth);
   motion.current=n;node.textContent=fmt.format(n);
   if(t<1)motion.frame=requestAnimationFrame(step);else motion.frame=0;
  }
  motion.frame=requestAnimationFrame(step);
  return motion;
 }
 function display(s){
  if(!valid(s.value)||!s.visible)return;
  if(s.name==='Instagram'){
   if(s.shown===s.value&&s.node.textContent!=='—')return;
   // Si la API responde a mitad de la animación, continuar desde el dígito
   // realmente visible (no desde el destino que todavía no se ha alcanzado).
   const first=s.shown===null;
   const from=s.motion?s.motion.current:(first?0:s.shown);
   s.motion?.cancel();
   // Que el primer fotograma ya sea cero, no una raya («—»).
   if(first)s.node.textContent='0';
   s.shown=s.value;
   s.motion=animateInstagram(s.node,from,s.value,igDuration(from,s.value,first));
   return;
  }
  if(s.shown===s.value&&s.node.textContent!=='—')return;
  s.motion?.cancel();const from=s.shown;s.shown=s.value;
  s.motion=animate(s.node,from,s.value,from===null?1400:650);
 }
 function restore(s){
  try{
   const item=JSON.parse(localStorage.getItem('ebc-verified-v2:'+s.name+':'+s.account));
   if(!item||!valid(item.value)||!Number.isFinite(item.checked)||item.checked>Date.now()+60000||Date.now()-item.checked>VALID_FOR)return;
   s.value=item.value;s.checked=item.checked;s.updated=item.updated||null;s.state='stale';label(s);
  }catch{/* Almacenamiento deshabilitado. */}
 }
 function save(s){
  try{localStorage.setItem('ebc-verified-v2:'+s.name+':'+s.account,
   JSON.stringify({value:s.value,checked:s.checked,updated:s.updated}));}catch{}
 }
 function total(){
  if(!totalNode)return;
  const known=sources.filter(s=>valid(s.value)&&!s.unknownAge);
  if(!known.length){totalMotion?.cancel();totalShown=null;totalNode.textContent='—';if(reach)reach.dataset.state='waiting';return;}
  const sum=known.reduce((n,s)=>n+s.value,0);
  if(!Number.isSafeInteger(sum))return;
  if(reach){
   reach.dataset.state=known.length===sources.length?'ready':'partial';
   reach.title='Suma de '+known.map(s=>s.name).join(', ')+'. '+(known.length<sources.length?'Total parcial. ':'')+
    (known.some(s=>s.state==='stale')?'Incluye una o más cifras antiguas. ':'')+
    'Una persona puede seguir varias cuentas: no representa espectadores únicos.';
  }
  if(totalShown===sum)return;
  totalMotion?.cancel();const old=totalShown;totalShown=sum;
  totalMotion=animate(totalNode,old,sum,old===null?1400:650);
 }
 async function update(s,force=false){
  if(s.busy||document.hidden)return;
  const now=Date.now();
  if(!force&&s.lastAttempt&&now-s.lastAttempt<MIN_REFRESH_MS)return;
  s.lastAttempt=now;
  s.busy=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(s.url,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Error HTTP '+response.status);
   const data=await response.json(),value=data[s.field];
   if(data.consulta_ok!==true||data.cuenta!==s.account||data.estimated===true||!valid(value))throw Error('Respuesta no verificable');
   const when=data.updated_at?Date.parse(data.updated_at):NaN;
   const incomingStale=data.source_stale===true;
   const now=Date.now();
   // No renovar el plazo de la cifra antigua con una fecha de consulta reciente.
   const checked=incomingStale?(Number.isFinite(when)&&when<=now+60000?when:null):now;
   if(incomingStale&&checked===null){
    if(s.name==='Instagram'){
     // La cifra ha sido validada por el backend para @elbellocubano,
     // pero el proveedor no indica de cuándo es. Animarla como dato histórico,
     // SIN guardarla como cifra actual ni sumarla como dato fresco.
     if(!valid(s.value)){s.value=value;s.checked=0;s.updated=null;s.unknownAge=true;}
     s.state='stale';label(s);fallbackVisual(s);display(s);return;
    }
    if(!valid(s.value))throw Error('El proveedor no indicó fecha de la cifra antigua');
    s.state='stale';label(s);display(s);return;
   }
   if(incomingStale&&checked!==null&&now-checked>VALID_FOR){
    if(!valid(s.value))throw Error('La cifra verificada tiene más de 30 días');
    s.state='stale';label(s);display(s);return;
   }
   s.value=value;s.updated=data.updated_at||null;s.unknownAge=false;
   s.state=incomingStale?'stale':'ready';
   if(checked!==null)s.checked=checked;
   if(s.checked&&now-s.checked<=VALID_FOR)save(s);
   label(s);if(s.name==='Instagram')fallbackVisual(s);display(s);
  }catch{
   if(valid(s.value)){s.state='stale';display(s);}
   else{s.state='unavailable';s.node.textContent='—';}
   label(s);
  }finally{
   clearTimeout(timeout);s.busy=false;s.finishedFirstRequest=true;
   if(s.name==='Instagram')label(s);
   fallbackVisual(s);total();
  }
 }
 const watched=new Map();
 const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  for(const e of entries){
   const s=watched.get(e.target);
   if(s&&e.isIntersecting){s.visible=true;display(s);observer.unobserve(e.target);}
  }
 },{threshold:0.05}):null;
 for(const s of sources){
  restore(s);label(s);fallbackVisual(s);
  // El nodo numérico de Instagram empieza oculto. Observar su contenedor visible
  // evita que IntersectionObserver deje el número permanentemente en «—».
  const target=s.name==='Instagram'?(s.node.closest('.instagram-social')||s.node):s.node;
  if(observer){watched.set(target,s);observer.observe(target);}
  else{s.visible=true;display(s);}
 }
 total();
 const first=sources.map(s=>update(s));
 const show=()=>document.documentElement.classList.add('counters-ready');
 const timeout=setTimeout(show,1800);
 Promise.allSettled(first).then(()=>{clearTimeout(timeout);show();});
 setInterval(()=>sources.forEach(s=>update(s)),REFRESH_MS);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sources.forEach(s=>update(s));});
 window.addEventListener('online',()=>sources.forEach(s=>update(s)));
})();
