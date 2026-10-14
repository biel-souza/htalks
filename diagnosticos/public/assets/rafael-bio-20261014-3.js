
const stepFields = [
  ['process_type', 'bottleneck', 'process_description'],
  ['process_frequency', 'people_count', 'systems', 'success_metric'],
  ['data_available', 'sensitive_data', 'sponsor', 'urgency'],
  ['name', 'company', 'role', 'segment', 'phone', 'email', 'consent']
];
const allowed = {
  process_type: ['Atendimento','Relatórios, dashboards e alertas','Cadastro/digitação','Integração entre sistemas','Segundo cérebro e base de conhecimento','Conteúdo e campanhas com agentes','Comercial','Financeiro','Operação/logística','Outro'],
  bottleneck: ['rework','errors','delay','integration','dispersed','dependency','slow_decision','other'],
  process_frequency: ['daily_many','daily','weekly','monthly','on_demand'],
  people_count: ['1','2-3','4-10','11-30','30+'],
  systems: ['erp','crm','ecommerce','spreadsheets','bi','whatsapp','email','documents','database','other'],
  data_available: ['structured','dispersed','partial','unknown','none'],
  sensitive_data: ['yes','maybe','no','unknown'],
  sponsor: ['self','leadership','board','it','none'],
  urgency: ['30d','90d','6m','none','research'],
  role: ['Proprietário/sócio','Diretoria','Gestão','TI/dados','Operações','Comercial','Financeiro','Outro']
};
const normalize = value => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
function validate(data) {
  const errors = {};
  for (const name of stepFields.flat()) {
    if (name === 'consent') { if (data.consent !== true) errors[name] = 'Autorize o uso dos dados para que possamos responder à solicitação.'; continue; }
    if (name === 'systems') { if (!Array.isArray(data.systems) || !data.systems.length || data.systems.some(v => !allowed.systems.includes(v))) errors[name] = 'Selecione ao menos um sistema ou fonte de informação.'; continue; }
    const value = normalize(data[name]);
    if (!value) errors[name] = 'Preencha este campo para continuar.';
    else if (allowed[name] && !allowed[name].includes(value)) errors[name] = 'Escolha uma das opções disponíveis.';
    else if (value.length > (name === 'process_description' ? 1200 : name === 'email' ? 160 : 500)) errors[name] = 'Reduza o texto ao limite informado no campo.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalize(data.email))) errors.email = 'Informe um e-mail válido.';
  const digits = normalize(data.phone).replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) errors.phone = 'Informe um WhatsApp com DDD (de 10 a 15 dígitos).';
  if (normalize(data.website)) errors.website = 'Não foi possível validar o formulário.';
  return errors;
}
function attribution(search, pathname) {
  const params = new URLSearchParams(search);
  const read = (key, fallback = '') => normalize(params.get('utm_' + key) || fallback).slice(0, 500);
  return { source: read('source', 'direct'), medium: read('medium', 'none'), campaign: read('campaign'), content: read('content'), term: read('term'), landing_path: String(pathname).slice(0, 500) };
}
function payloadFrom(entries, search, pathname) {
  const data = {};
  for (const name of stepFields.flat()) {
    if (name === 'systems') data[name] = [...new Set(entries.getAll(name).map(normalize))];
    else if (name === 'consent') data[name] = entries.has(name);
    else data[name] = normalize(entries.get(name));
  }
  data.website = normalize(entries.get('website'));
  Object.assign(data, attribution(search, pathname));
  data.landing_variant = 'rafael_bio_v2_3d';
  data.form_version = '2026-10-13';
  return { offer: 'consultoria', data };
}
function interpretResponse(status, body) {
  if (status === 201 && body?.ok === true && /^HT-\d{8}-[A-F0-9]{8}$/i.test(body.id || '')) return { kind: 'success', id: body.id };
  if (status === 422) return { kind: 'validation', fields: body?.fields || {}, message: 'Revise os campos indicados e tente novamente.' };
  if (status === 429) return { kind: 'rejected', message: 'Limite de envios atingido. Aguarde antes de tentar novamente ou converse com Rafael pelo WhatsApp.' };
  if (status === 403) return { kind: 'rejected', message: 'Este endereço não está autorizado a enviar o formulário. Acesse a página oficial ou converse pelo WhatsApp.' };
  if ([400, 413].includes(status)) return { kind: 'rejected', message: 'O formulário não foi aceito. Revise suas respostas ou converse pelo WhatsApp.' };
  return { kind: 'uncertain', message: 'Não conseguimos confirmar o recebimento. Para evitar um envio duplicado, confira com Rafael pelo WhatsApp antes de reenviar. Suas respostas continuam nesta tela.' };
}
// Sem retry automático: a API existente não oferece idempotência para consultoria.
function createSubmission(fetcher) {
  let state = 'idle';
  return {
    state: () => state,
    async send(payload) {
      if (state !== 'idle') return { kind: 'blocked' };
      state = 'sending';
      try {
        const response = await fetcher('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
        const body = await response.json().catch(() => null);
        const result = interpretResponse(response.status, body);
        state = result.kind === 'success' ? 'complete' : result.kind === 'uncertain' ? 'uncertain' : 'idle';
        return result;
      } catch {
        state = 'uncertain';
        return interpretResponse(0, null);
      }
    }
  };
}

const config = Object.freeze({mode:'production', productionHost:'diagnostico.h-talks.com.br'});

const form = document.querySelector('#diagnostic-form');
const steps = [...form.querySelectorAll('.form-step')];
const next = document.querySelector('#next');
const back = document.querySelector('#back');
const submit = document.querySelector('#submit');
const error = document.querySelector('#form-error');
const success = document.querySelector('#success');
const live = config.mode === 'production' && location.protocol === 'https:' && location.hostname === config.productionHost;
const sender = createSubmission(fetch.bind(window));
let step = 0;
let successReported = false;

const read = () => payloadFrom(new FormData(form), location.search, location.pathname);
const controls = name => [...form.elements].filter(e => e.name === name);
const label = name => {
  const el = controls(name)[0];
  if (el?.tagName === 'SELECT') return el.selectedOptions[0]?.textContent || '—';
  return el?.value?.trim() || '—';
};
function hideErrors() {
  error.hidden = true;
  error.replaceChildren();
  form.querySelectorAll('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
  [...form.elements].forEach(e => e.setCustomValidity?.(''));
}
function showErrors(errors, message = 'Confira os campos antes de continuar.') {
  hideErrors();
  const p = document.createElement('p'); p.textContent = message; error.append(p);
  const names = Object.keys(errors).filter(name => controls(name).length);
  for (const name of names) for (const el of controls(name)) el.setAttribute('aria-invalid', 'true');
  error.hidden = false;
  const first = controls(names[0])[0];
  if (first) {
    first.focus();
    first.setCustomValidity?.(typeof errors[names[0]] === 'string' ? errors[names[0]] : 'Revise este campo.');
    first.reportValidity?.();
  } else { error.tabIndex = -1; error.focus(); }
}
function summary() {
  const target = document.querySelector('#review-summary');
  const heading = document.createElement('h4'); heading.textContent = 'O que vamos analisar';
  const list = document.createElement('dl');
  for (const [title, name] of [['Processo', 'process_type'], ['Principal dificuldade', 'bottleneck'], ['Frequência', 'process_frequency'], ['Dados disponíveis', 'data_available']]) {
    const dt = document.createElement('dt'); dt.textContent = title;
    const dd = document.createElement('dd'); dd.textContent = label(name);
    list.append(dt, dd);
  }
  target.replaceChildren(heading, list);
}
function showStep(index, focus = true) {
  step = index;
  steps.forEach((fieldset, i) => { fieldset.hidden = i !== index; });
  document.querySelectorAll('[data-step-label]').forEach((item, i) => {
    item.classList.toggle('is-active', i === index);
    item.classList.toggle('is-complete', i < index);
    if (i === index) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
  });
  document.querySelector('#progress').value = index + 1;
  document.querySelector('#step-count').textContent = `Etapa ${index + 1} de ${steps.length}`;
  back.hidden = index === 0;
  next.hidden = index === steps.length - 1;
  submit.hidden = index !== steps.length - 1;
  if (index === steps.length - 1) summary();
  hideErrors();
  if (focus) { const heading = steps[index].querySelector('h3'); heading?.focus({ preventScroll: true }); document.querySelector('#diagnostico').scrollIntoView({ behavior: 'auto', block: 'start' }); }
}
function advance() {
  const all = validate(read().data);
  const current = Object.fromEntries(Object.entries(all).filter(([name]) => stepFields[step].includes(name)));
  if (Object.keys(current).length) return showErrors(current);
  if (step < steps.length - 1) showStep(step + 1);
}
next.addEventListener('click', advance);
back.addEventListener('click', () => showStep(Math.max(0, step - 1)));
form.addEventListener('input', event => { event.target.setCustomValidity?.(''); event.target.removeAttribute('aria-invalid'); });
form.addEventListener('change', event => { event.target.setCustomValidity?.(''); event.target.removeAttribute('aria-invalid'); });

function completed(id) {
  form.hidden = true;
  success.hidden = false;
  document.querySelector('#success-title').textContent = live ? 'Solicitação recebida.' : 'Prévia concluída.';
  document.querySelector('#success-message').textContent = live ? 'Vamos revisar o contexto da sua empresa. Se houver aderência, Rafael ou a equipe entrará em contato pelos dados informados para combinar o próximo passo.' : 'O formulário está pronto para revisão. Nenhum dado foi enviado ou salvo; esta ainda é uma prévia local.';
  document.querySelector('#protocol').textContent = live ? `Protocolo: ${id}` : 'Envio de teste desativado';
  const whatsapp = document.querySelector('#success-whatsapp');
  whatsapp.hidden = !live;
  if (live) whatsapp.href = 'https://wa.me/5547991053840?text=' + encodeURIComponent(`Olá, Rafael! Enviei meu pré-diagnóstico de IA. Meu protocolo é ${id}.`);
  const restart = document.querySelector('#restart');
  if (restart) restart.hidden = live;
  success.focus();
  success.scrollIntoView({ behavior: 'auto', block: 'start' });
  // Somente usa a integração Meta já existente, sem incluir respostas ou contatos no evento.
  if (live && !successReported && typeof window.fbq === 'function') {
    successReported = true;
    try { window.fbq('track', 'Lead', { content_name: 'consultoria' }, { eventID: id }); } catch { /* A confirmação do lead não depende da telemetria. */ }
  }
}
document.querySelector('#restart')?.addEventListener('click', () => { if (!live) { success.hidden = true; form.hidden = false; showStep(0); } });

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (step < steps.length - 1) return advance();
  if (sender.state() !== 'idle') return;
  const payload = read();
  const errors = validate(payload.data);
  if (Object.keys(errors).length) {
    const index = stepFields.findIndex(names => names.some(name => errors[name]));
    if (index >= 0) showStep(index);
    return showErrors(errors);
  }
  if (!live) return completed(null);
  submit.disabled = true; back.disabled = true; submit.textContent = 'Enviando…'; form.setAttribute('aria-busy', 'true');
  const result = await sender.send(payload);
  form.removeAttribute('aria-busy');
  if (result.kind === 'success') return completed(result.id);
  back.disabled = false;
  if (result.kind === 'validation') {
    const index = stepFields.findIndex(names => names.some(name => result.fields[name]));
    if (index >= 0) showStep(index);
    showErrors(result.fields, result.message);
  } else showErrors({}, result.message || 'Não foi possível concluir o envio.');
  if (['uncertain', 'rejected'].includes(result.kind)) {
    const help = document.createElement('a');
    help.href = 'https://wa.me/5547991053840?text=' + encodeURIComponent('Olá, Rafael. Preciso de ajuda para confirmar o envio do meu pré-diagnóstico de IA.');
    help.target = '_blank'; help.rel = 'noopener noreferrer'; help.textContent = 'Confirmar com Rafael pelo WhatsApp ↗';
    error.append(help);
  }
  submit.disabled = sender.state() !== 'idle';
  submit.textContent = result.kind === 'uncertain' ? 'Recebimento não confirmado' : 'Enviar para análise';
});

const dialog = document.querySelector('#privacy-dialog');
let privacyTrigger;
for (const id of ['privacy-open', 'privacy-footer']) document.getElementById(id)?.addEventListener('click', event => { privacyTrigger = event.currentTarget; dialog.showModal(); });
document.querySelector('#privacy-close')?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('close', () => privacyTrigger?.focus());

document.querySelector('#preview-notice').hidden = live;
form.addEventListener('focusin', () => {
  if (live && typeof window.fbq === 'function') {
    try { window.fbq('trackCustom', 'DiagnosticFormStart', { content_name: 'consultoria' }); } catch { /* Medição opcional. */ }
  }
}, { once: true });
submit.textContent = live ? 'Enviar para análise' : 'Concluir prévia';
submit.disabled = false;
showStep(0, false);

