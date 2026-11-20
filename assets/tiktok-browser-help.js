/* Ayuda contextual: solamente navegador integrado de TikTok. */
(()=>{'use strict';
 const ua=navigator.userAgent||'';
 if(!/(?:TikTok|musical_ly|aweme)/i.test(ua))return;
 const base=location.href.split('#')[0];
 const onHome=!!document.querySelector('.community-menu');
 const style=document.createElement('style');
 style.textContent=`
 .ebc-tiktok-help{z-index:40;position:${onHome?'absolute':'fixed'};${onHome?'top:2.3%;right:12.5%;':'top:62px;right:12px;'}border:1px solid #b7d6fa;border-radius:999px;background:#f7fbff;color:#074e91;padding:7px 10px;font-size:clamp(10px,2.4vw,12px);font-weight:750;line-height:1.2;box-shadow:0 4px 14px #15589324;cursor:pointer;display:flex;gap:5px;align-items:center;max-width:170px}
 .ebc-tiktok-help:hover{background:#e7f3ff}
 .ebc-tiktok-help svg{width:15px;height:15px;flex:0 0 15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
 .ebc-tiktok-dialog{width:min(390px,calc(100% - 30px));border:0;border-radius:18px;padding:24px;background:#fff;color:#172335;font:15px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 20px 65px #00193966}
 .ebc-tiktok-dialog::backdrop{background:#031c3999}
 .ebc-tiktok-dialog h2{font-size:19px;line-height:1.18;margin:0 0 8px}
 .ebc-tiktok-dialog p{margin:0 0 12px}
 .ebc-tiktok-dialog .ebc-copy-url{display:block;word-break:break-all;background:#f4f7fb;border-radius:8px;font-size:12px;padding:10px;color:#34536e;user-select:all;margin:6px 0 14px}
 .ebc-tiktok-actions{display:flex;flex-wrap:wrap;gap:9px}
 .ebc-tiktok-actions button{padding:10px 15px;border:0;border-radius:999px;cursor:pointer;font-weight:750;background:#0f78e2;color:white}
 .ebc-tiktok-actions button.ebc-secondary{background:#ecf3fa;color:#245071}
 @media(max-width:360px){.ebc-tiktok-help{max-width:125px;font-size:10px;padding:7px}}
 `;
 document.head.append(style);
 const button=document.createElement('button');button.type='button';button.className='ebc-tiktok-help';
 button.setAttribute('aria-label','Consejo para abrir los enlaces desde TikTok');
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5m0 4h.01M10 3a9 9 0 1 0 4 0"/></svg><span>¿Enlaces bloqueados?</span>';
 const parent=onHome?document.querySelector('.hero'):document.body;
 parent?.append(button);
 const modal=document.createElement('dialog');modal.className='ebc-tiktok-dialog';
 const heading=document.createElement('h2');heading.textContent='Abra la página en su navegador';
 const para=document.createElement('p');para.textContent='El navegador interno de TikTok puede limitar algunos enlaces. Copie esta dirección y péguela en Chrome, Safari u otro navegador para abrir sus grupos y promociones.';
 const address=document.createElement('div');address.className='ebc-copy-url';address.textContent=base;
 const actions=document.createElement('div');actions.className='ebc-tiktok-actions';
 const copy=document.createElement('button');copy.type='button';copy.textContent='Copiar enlace';
 const close=document.createElement('button');close.type='button';close.className='ebc-secondary';close.textContent='Cerrar';
 actions.append(copy,close);modal.append(heading,para,address,actions);document.body.append(modal);
 const show=()=>{address.textContent=location.href.split('#')[0];if(!modal.open)modal.showModal();};
 button.addEventListener('click',show);
 close.addEventListener('click',()=>modal.close());
 modal.addEventListener('click',event=>{if(event.target===modal)modal.close();});
 copy.addEventListener('click',async()=>{
  const value=address.textContent;
  try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);
   else {const input=document.createElement('textarea');input.value=value;input.style.cssText='position:fixed;left:-9999px';document.body.append(input);input.select();if(!document.execCommand('copy'))throw Error('Sin permiso');input.remove();}
   copy.textContent='¡Enlace copiado!';
  }catch{copy.textContent='Seleccione y copie la dirección';address.style.outline='2px solid #2688ed';}
 });
 document.addEventListener('click',event=>{
  const anchor=event.target.closest?.('a[href]');
  if(!anchor||modal.contains(anchor)||event.defaultPrevented||event.button!==0)return;
  let dest;try{dest=new URL(anchor.href,location.href);}catch{return;}
  // No interrumpir enlaces internos: por ejemplo, index -> promociones.
  if(!/^https?:$/.test(dest.protocol)||dest.origin===location.origin)return;
  event.preventDefault();show();
 },true);
})();
