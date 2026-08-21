const form=document.querySelector('form[data-offer]');
const statusEl=document.querySelector('.status');
const params=new URLSearchParams(location.search);
const tracked=['utm_source','utm_medium','utm_campaign','utm_content'];

for(const key of tracked){
  const input=form?.elements.namedItem(key.replace('utm_',''));
  if(input) input.value=params.get(key)||'';
}

function payloadFromForm(form){
  const fd=new FormData(form);const data={};
  for(const [key,value] of fd){
    if(key==='channels'||key==='systems'){(data[key]??=[]).push(value);}
    else if(key==='consent') data[key]=true;
    else data[key]=value;
  }
  data.consent=fd.has('consent');data.landing_path=location.pathname;
  return {offer:form.dataset.offer,data};
}

form?.addEventListener('submit',async event=>{
  event.preventDefault();statusEl.className='status';statusEl.textContent='Enviando com segurança…';
  const button=form.querySelector('button[type=submit]');button.disabled=true;
  try{
    const response=await fetch('/api/leads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payloadFromForm(form))});
    const result=await response.json();
    if(!response.ok) throw new Error(result.error||'Não foi possível enviar.');
    location.href=`/obrigado?id=${encodeURIComponent(result.id)}&oferta=${encodeURIComponent(form.dataset.offer)}`;
  }catch(error){statusEl.className='status error';statusEl.textContent=error.message;button.disabled=false;}
});
