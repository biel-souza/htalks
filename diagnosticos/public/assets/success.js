const params = new URLSearchParams(location.search);
const id = params.get('id') ?? '';
const offer = params.get('oferta') === 'consultoria' ? 'Consultoria de IA' : 'Atendimento';
const offerKey = params.get('oferta') === 'consultoria' ? 'consultoria' : 'atendimento';
const validId = /^HT-\d{8}-[A-F0-9]{8}$/.test(id);
const protocol = document.querySelector('[data-protocol]');
const protocolValue = document.querySelector('[data-protocol-value]');
const whatsapp = document.querySelector('[data-whatsapp]');

if (validId && protocol && protocolValue) {
  protocolValue.textContent = id;
  protocol.hidden = false;
}

if (whatsapp) {
  const reference = validId ? ` Meu protocolo é ${id}.` : '';
  const message = `Olá! Enviei o diagnóstico de ${offer} pelo site da H-TALKS.${reference}`;
  whatsapp.href = `https://wa.me/5547991053840?text=${encodeURIComponent(message)}`;
}

const conversionKey = validId ? `htalks-lead:${id}` : '';
const conversionSentKey = validId ? `htalks-lead-sent:${id}` : '';
if (conversionKey && sessionStorage.getItem(conversionKey) === offerKey && !sessionStorage.getItem(conversionSentKey)) {
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Lead', { content_name: offer, content_category: 'diagnostico' }, { eventID: id });
    sessionStorage.setItem(conversionSentKey, '1');
    sessionStorage.removeItem(conversionKey);
  }
}
