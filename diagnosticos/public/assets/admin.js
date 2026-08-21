const body=document.querySelector('tbody');
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
fetch('/api/admin/leads').then(response=>response.json()).then(({leads=[]})=>{
  body.innerHTML=leads.length?leads.map(lead=>`<tr><td>${escapeHtml(new Date(lead.created_at).toLocaleString('pt-BR'))}</td><td><span class="pill ${escapeHtml(lead.priority)}">${escapeHtml(lead.priority)} · ${escapeHtml(lead.score)}</span></td><td>${escapeHtml(lead.offer)}</td><td><strong>${escapeHtml(lead.name)}</strong><br>${escapeHtml(lead.company)}</td><td>${escapeHtml(lead.email)}<br>${escapeHtml(lead.phone)}</td><td>${escapeHtml(lead.source||'direto')}<br>${escapeHtml(lead.campaign||'')}</td></tr>`).join(''):'<tr><td colspan="6">Nenhum lead recebido.</td></tr>';
}).catch(()=>{body.innerHTML='<tr><td colspan="6">Falha ao carregar a fila.</td></tr>';});
