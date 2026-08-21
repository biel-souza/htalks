const body=document.querySelector('tbody');
const filters=[...document.querySelectorAll('[data-filter]')];
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const statusOptions=[['novo','Novo'],['em_contato','Em contato'],['qualificado','Qualificado'],['reuniao','Reunião'],['ganho','Ganho'],['perdido','Perdido']];
const closed=new Set(['ganho','perdido']);
const overdue=lead=>Boolean(lead.next_action_at)&&!closed.has(lead.status)&&new Date(lead.next_action_at)<new Date();
const localDate=value=>{if(!value)return'';const date=new Date(value);const pad=part=>String(part).padStart(2,'0');return`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;};
const management=lead=>`<div class="lead-management" data-id="${escapeHtml(lead.public_id)}"><input data-field="owner" value="${escapeHtml(lead.owner||'')}" maxlength="100" placeholder="Responsável"><select data-field="status" aria-label="Status do lead">${statusOptions.map(([value,label])=>`<option value="${value}"${lead.status===value?' selected':''}>${label}</option>`).join('')}</select><input data-field="next_action" value="${escapeHtml(lead.next_action||'')}" maxlength="300" placeholder="Próxima ação"><input data-field="next_action_at" type="datetime-local" value="${escapeHtml(localDate(lead.next_action_at))}" aria-label="Data da próxima ação"><textarea data-field="review_notes" maxlength="1000" placeholder="Observação interna">${escapeHtml(lead.review_notes||'')}</textarea><div class="management-actions"><button type="button" class="btn save-lead">Salvar</button><button type="button" class="history-lead">Histórico</button><span class="save-status"></span></div><div class="lead-history" hidden></div></div>`;
let leads=[];let loadState='loading';

function setMetrics(){
  const values={open:leads.filter(lead=>!closed.has(lead.status)).length,new:leads.filter(lead=>lead.status==='novo').length,p1:leads.filter(lead=>lead.priority==='P1'&&!closed.has(lead.status)).length,overdue:leads.filter(overdue).length};
  for(const[key,value]of Object.entries(values))document.querySelector(`[data-metric="${key}"]`).textContent=value;
}

const labels={atendimento:'Atendimento',consultoria:'Consultoria de IA',P1:'P1',P2:'P2',P3:'P3',novo:'Novo',em_contato:'Em contato',qualificado:'Qualificado',reuniao:'Reunião',ganho:'Ganho',perdido:'Perdido'};
const groupCounts=(values,order=[])=>{
  const counts=new Map(order.map(value=>[value,0]));
  for(const value of values)counts.set(value,(counts.get(value)||0)+1);
  return [...counts.entries()].sort((a,b)=>order.length?order.indexOf(a[0])-order.indexOf(b[0]):b[1]-a[1]);
};
const renderBreakdown=(name,items,total=leads.length)=>{
  const target=document.querySelector(`[data-breakdown="${name}"]`);if(!target)return;
  const rows=items.filter(([,count])=>count>0);
  target.innerHTML=rows.length?rows.map(([key,count])=>{const percent=total?Math.round(count/total*100):0;return`<div class="breakdown-row"><div><span>${escapeHtml(labels[key]||key)}</span><strong>${count} · ${percent}%</strong></div><i><b style="width:${percent}%"></b></i></div>`;}).join(''):'<p class="empty-metric">Nenhum lead no recorte atual.</p>';
};

function setFunnelMetrics(){
  document.querySelector('[data-funnel-total]').textContent=leads.length;
  renderBreakdown('offer',groupCounts(leads.map(lead=>lead.offer),['atendimento','consultoria']));
  renderBreakdown('priority',groupCounts(leads.map(lead=>lead.priority),['P1','P2','P3']));
  renderBreakdown('status',groupCounts(leads.map(lead=>lead.status),statusOptions.map(([value])=>value)));
  const sources=leads.map(lead=>{const source=lead.source?.trim()||'Direto/sem UTM';const campaign=lead.campaign?.trim();return campaign?`${source} · ${campaign}`:source;});
  renderBreakdown('source',groupCounts(sources).slice(0,6));
}

function render(){
  if(loadState!=='ready')return;
  const value=name=>document.querySelector(`[data-filter="${name}"]`);
  const search=value('search').value.trim().toLocaleLowerCase('pt-BR');
  const visible=leads.filter(lead=>(!search||[lead.public_id,lead.name,lead.company,lead.email].some(item=>String(item??'').toLocaleLowerCase('pt-BR').includes(search)))&&(!value('status').value||lead.status===value('status').value)&&(!value('priority').value||lead.priority===value('priority').value)&&(!value('offer').value||lead.offer===value('offer').value)&&(!value('overdue').checked||overdue(lead)));
  body.innerHTML=visible.length?visible.map(lead=>`<tr class="${overdue(lead)?'is-overdue':''}"><td>${escapeHtml(new Date(lead.created_at).toLocaleString('pt-BR'))}${overdue(lead)?'<span class="overdue-label">Ação vencida</span>':''}</td><td><span class="pill ${escapeHtml(lead.priority)}">${escapeHtml(lead.priority)} · ${escapeHtml(lead.score)}</span></td><td>${escapeHtml(lead.offer)}</td><td><strong>${escapeHtml(lead.name)}</strong><br>${escapeHtml(lead.company)}<br><small>${escapeHtml(lead.public_id)}</small></td><td>${escapeHtml(lead.email)}<br>${escapeHtml(lead.phone)}</td><td>${escapeHtml(lead.source||'direto')}<br>${escapeHtml(lead.campaign||'')}</td><td>${management(lead)}</td></tr>`).join(''):'<tr><td colspan="7">Nenhum lead encontrado com estes filtros.</td></tr>';
}

function showLoadError(){
  loadState='error';
  filters.forEach(filter=>{filter.disabled=true;});
  document.querySelectorAll('[data-metric],[data-funnel-total]').forEach(metric=>{metric.textContent='—';});
  document.querySelectorAll('[data-breakdown]').forEach(target=>{target.innerHTML='<p class="empty-metric error">Não foi possível carregar as métricas.</p>';});
  body.innerHTML='<tr><td colspan="7">Falha ao carregar a fila. Atualize a página para tentar novamente.</td></tr>';
}

fetch('/api/admin/leads').then(async response=>{if(!response.ok)throw new Error('Falha ao carregar.');return response.json();}).then(result=>{leads=Array.isArray(result.leads)?result.leads:[];loadState='ready';filters.forEach(filter=>{filter.disabled=false;});setMetrics();setFunnelMetrics();render();}).catch(showLoadError);
filters.forEach(filter=>filter.addEventListener(filter.type==='search'?'input':'change',render));
body.addEventListener('click',async event=>{
  const historyButton=event.target.closest('.history-lead');
  if(historyButton){
    const card=historyButton.closest('.lead-management');const target=card.querySelector('.lead-history');
    if(!target.hidden){target.hidden=true;return;}
    historyButton.disabled=true;target.hidden=false;target.textContent='Carregando histórico…';
    try{const response=await fetch(`/api/admin/leads/${encodeURIComponent(card.dataset.id)}`);const result=await response.json();if(!response.ok)throw new Error(result.error||'Falha ao carregar.');target.innerHTML=result.activities.length?result.activities.map(item=>`<p><time>${escapeHtml(new Date(item.created_at).toLocaleString('pt-BR'))}</time>${escapeHtml(item.summary)}</p>`).join(''):'<p>Nenhuma atividade registrada.</p>';}
    catch(error){target.textContent=error.message;}finally{historyButton.disabled=false;}
    return;
  }
  const button=event.target.closest('.save-lead');if(!button)return;
  const card=button.closest('.lead-management');const status=card.querySelector('.save-status');const value=field=>card.querySelector(`[data-field="${field}"]`).value;
  button.disabled=true;status.textContent='Salvando…';status.className='save-status';
  try{
    const response=await fetch(`/api/admin/leads/${encodeURIComponent(card.dataset.id)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({owner:value('owner'),status:value('status'),next_action:value('next_action'),next_action_at:value('next_action_at')||null,review_notes:value('review_notes')})});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Falha ao salvar.');
    const lead=leads.find(item=>item.public_id===card.dataset.id);if(lead){lead.owner=value('owner');lead.status=value('status');lead.next_action=value('next_action');lead.next_action_at=value('next_action_at')?new Date(value('next_action_at')).toISOString():null;lead.review_notes=value('review_notes');}
    setMetrics();setFunnelMetrics();status.textContent='Salvo';status.className='save-status ok';setTimeout(render,500);
  }catch(error){status.textContent=error.message;status.className='save-status error';}
  finally{button.disabled=false;}
});
