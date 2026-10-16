(() => {
 'use strict';
 const poster=document.getElementById('poster');
 const loader=document.getElementById('page-loader');
 const message=document.getElementById('loading-message');
 const retry=document.getElementById('retry-page');
 if(!poster) return;
 retry?.addEventListener('click',()=>location.reload());
 function waitForImage(img){
  return new Promise((resolve,reject)=>{
   async function decode(){
    if(!img.naturalWidth){reject(new Error('Imagen no disponible'));return;}
    try {if(img.decode) await img.decode();resolve();}catch(error){reject(error);}
   }
   if(img.complete){decode();return;}
   img.addEventListener('load',decode,{once:true});
   img.addEventListener('error',()=>reject(new Error('Imagen no disponible')),{once:true});
  });
 }
 const timeout=setTimeout(()=>{
  if(poster.dataset.ready==='true') return;
  message.textContent='La página está tardando en cargar. Puedes volver a intentarlo.';
  retry.hidden=false;
 },20000);
 Promise.all([...poster.querySelectorAll('img')].map(waitForImage)).then(()=>{
  clearTimeout(timeout);poster.dataset.ready='true';
  document.documentElement.classList.remove('is-loading');
  if(loader) loader.hidden=true;
  document.dispatchEvent(new CustomEvent('poster-ready'));
 }).catch(()=>{
  clearTimeout(timeout);
  message.textContent='No se pudieron cargar todas las imágenes. Vuelve a intentarlo.';
  retry.hidden=false;
 });
})();
