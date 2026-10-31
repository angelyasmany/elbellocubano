(()=>{'use strict';
 const formatter=new Intl.NumberFormat('es-PE');
 const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const sourceDefs=[
  {name:'TikTok',id:'tt-followers',url:'/api/followers',field:'tiktok',account:'elbellocubano7'},
  {name:'Facebook',id:'fb-followers',url:'/api/facebook',field:'count',account:'elbellocubano'},
  {name:'Instagram',id:'ig-followers',url:'/api/instagram',field:'count',account:'elbellocubano'},
  {name:'YouTube',id:'yt-subscribers',url:'/api/youtube',field:'count',account:'UCVvsVVbc0W8KIL1kRkIqWxQ'}
 ];
 const sources=sourceDefs.map(d=>({...d,node:document.getElementById(d.id),value:null,busy:false,frame:0})).filter(s=>s.node);
 const reach=document.getElementById('reach');
 const totalNode=document.getElementById('reach-total');
 function updateTotal(){
  if(!totalNode||!reach)return;
  const available=sources.filter(s=>s.value!==null);
  if(!available.length){totalNode.textContent='—';reach.dataset.state='waiting';return;}
  const sum=available.reduce((v,s)=>v+s.value,0);
  totalNode.textContent=Number.isSafeInteger(sum)?formatter.format(sum):'—';
  reach.dataset.state=available.length===sources.length?'ready':'partial';
  reach.title='Suma de '+available.map(s=>s.name).join(', ')+'. '+
    (available.length<sources.length?'Total parcial (faltan redes sin cifras verificadas). ':'')+
    'Las audiencias pueden repetirse: no equivale a visitantes únicos.';
 }
 function animate(s,n){
  cancelAnimationFrame(s.frame);
  const from=s.value??0;
  if(reduceMotion.matches||document.hidden){s.node.textContent=formatter.format(n);return;}
  const start=performance.now();
  function frame(now){
   const p=Math.min(1,(now-start)/700),smooth=1-(1-p)**3;
   s.node.textContent=formatter.format(Math.round(from+(n-from)*smooth));
   if(p<1)s.frame=requestAnimationFrame(frame);
  }
  s.frame=requestAnimationFrame(frame);
 }
 async function refresh(s){
  if(s.busy||document.hidden)return;
  s.busy=true;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(s.url,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('API HTTP '+response.status);
   const data=await response.json();
   const value=data[s.field];
   if(data.consulta_ok!==true||data.cuenta!==s.account||data.estimated===true||!Number.isSafeInteger(value)||value<0)throw Error('Lectura no verificable');
   animate(s,value);
   s.value=value;
   s.node.dataset.state=data.source_stale?'stale':'ready';
   s.node.title='Fuente: '+String(data.fuente||'API')+(data.source_stale?' · última lectura disponible':'')+
    (data.updated_at?' · '+new Date(data.updated_at).toLocaleString('es-PE'):'');
  }catch(err){
   cancelAnimationFrame(s.frame);
   s.value=null;
   s.node.textContent='—';
   s.node.dataset.state='unavailable';
   s.node.title='No se pudo verificar este contador. Se reintentará automáticamente.';
  }finally{
   clearTimeout(timer);
   s.busy=false;
   updateTotal();
  }
 }
 updateTotal();
 const first=Promise.allSettled(sources.map(refresh));
 const reveal=()=>document.documentElement.classList.add('counters-ready');
 const revealTimer=setTimeout(reveal,5000);
 first.finally(()=>{clearTimeout(revealTimer);reveal()});
 // Menos consultas para cuidar el uso de las funciones y APIs en Vercel.
 setInterval(()=>{if(!document.hidden)sources.forEach(refresh);},180000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sources.forEach(refresh)});
 window.addEventListener('online',()=>sources.forEach(refresh));
})();
