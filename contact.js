(() => {
 'use strict';
 const number=String(window.BELLO_CONFIG?.whatsappNumber||'').trim();
 const configured=/^[1-9]\d{7,14}$/.test(number);
 const dialog=document.getElementById('contacto-pendiente');
 for(const link of document.querySelectorAll('[data-whatsapp-message]')){
  if(configured){
   link.href='https://wa.me/'+number+'?text='+encodeURIComponent(link.dataset.whatsappMessage);
   link.target='_blank';link.rel='noopener noreferrer';
  }else{
   link.removeAttribute('target');
   link.addEventListener('click',event=>{event.preventDefault();dialog?.showModal();});
  }
 }
 dialog?.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
})();
