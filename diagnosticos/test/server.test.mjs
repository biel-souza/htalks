import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { createApp, scoreLead, validateLead } from '../server.mjs';

const atendimento = {
  name: 'Rafael Andrade', company: 'HEADS', role: 'Sócio', phone: '47999999999', email: 'rafael@example.com', consent: true,
  segment: 'Serviços', team_size: '4-10', monthly_volume: '301-1000', channels: ['whatsapp', 'instagram'], organization: 'Combinação',
  bottleneck: 'Follow-up', frequency: 'daily', impact: 'sales', decision_role: 'decides', goal_90d: 'Organizar a fila e reduzir conversas sem próximo passo.'
};

const consultoria = {
  name: 'Rafael Andrade', company: 'HEADS', role: 'Sócio', phone: '47999999999', email: 'rafael@example.com', consent: true,
  segment: 'Tecnologia', process_type: 'Relatórios', process_description: 'Consolidar dados de três sistemas e revisar exceções diariamente.',
  process_frequency: 'daily', people_count: '4-10', systems: ['erp', 'crm', 'bi'], bottleneck: 'rework', data_available: 'structured',
  sensitive_data: 'no', success_metric: 'Reduzir o tempo de consolidação e manter auditoria das exceções.', sponsor: 'self', urgency: '90d'
};

test('valida os dois formulários completos', () => {
  assert.deepEqual(validateLead('atendimento', atendimento), {});
  assert.deepEqual(validateLead('consultoria', consultoria), {});
});

test('rejeita falta de consentimento e contato inválido', () => {
  const errors = validateLead('atendimento', { ...atendimento, consent: false, email: 'x', phone: '1' });
  assert.ok(errors.consent); assert.ok(errors.email); assert.ok(errors.phone);
});

test('valida as landings curtas do Meta com escopo próprio', () => {
  const v1 = { landing_variant: 'meta_short_v1', name: 'Rafael', company: 'HEADS', phone: '47999999999', bottleneck: 'context', urgency: '30d', consent: true };
  const v2 = { landing_variant: 'meta_short_v2', name: 'Rafael', company: 'HEADS', phone: '47999999999', bottleneck: 'context', consent: true };
  assert.deepEqual(validateLead('atendimento', v1), {});
  assert.deepEqual(validateLead('atendimento', v2), {});
  assert.ok(validateLead('atendimento', { ...v1, urgency: '' }).urgency);
  assert.equal(validateLead('atendimento', { ...v2, urgency: '' }).urgency, undefined);
  assert.ok(validateLead('atendimento', { ...v2, phone: '1' }).phone);
});

test('classifica cenários fortes como P1', () => {
  assert.equal(scoreLead('atendimento', atendimento).priority, 'P1');
  assert.equal(scoreLead('consultoria', consultoria).priority, 'P1');
});

test('captura lead pela API e lista no painel autenticado', async t => {
  const temp = mkdtempSync(join(tmpdir(), 'htalks-leads-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const app = createApp({ databasePath: join(temp, 'leads.sqlite'), adminUser: 'rafael', adminPassword: 'segredo', hashSecret: 'teste' });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.address().port}`;

  const health = await fetch(`${base}/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });

  const created = await fetch(`${base}/api/leads`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ offer: 'atendimento', data: atendimento }) });
  assert.equal(created.status, 201);
  const result = await created.json();
  assert.match(result.id, /^HT-/);

  const unauthorized = await fetch(`${base}/api/admin/leads`);
  assert.equal(unauthorized.status, 401);
  const listed = await fetch(`${base}/api/admin/leads`, { headers: { authorization: `Basic ${Buffer.from('rafael:segredo').toString('base64')}` } });
  assert.equal(listed.status, 200);
  const queue = await listed.json();
  assert.equal(queue.leads.length, 1);
  assert.equal(queue.leads[0].priority, 'P1');

  const updated = await fetch(`${base}/api/admin/leads/${result.id}`, {
    method: 'PATCH',
    headers: { authorization: `Basic ${Buffer.from('rafael:segredo').toString('base64')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ owner: 'Rafael', status: 'qualificado', next_action: 'Agendar discovery', next_action_at: '2026-08-25T13:00:00.000Z', review_notes: 'Fit validado.' })
  });
  assert.equal(updated.status, 200);
  const afterUpdate = await fetch(`${base}/api/admin/leads`, { headers: { authorization: `Basic ${Buffer.from('rafael:segredo').toString('base64')}` } });
  const updatedQueue = await afterUpdate.json();
  assert.equal(updatedQueue.leads[0].status, 'qualificado');
  assert.equal(updatedQueue.leads[0].next_action, 'Agendar discovery');
  assert.equal(updatedQueue.leads[0].review_notes, 'Fit validado.');
  assert.equal(updatedQueue.leads[0].owner, 'Rafael');

  const detail = await fetch(`${base}/api/admin/leads/${result.id}`, { headers: { authorization: `Basic ${Buffer.from('rafael:segredo').toString('base64')}` } });
  assert.equal(detail.status, 200);
  const leadDetail = await detail.json();
  assert.equal(leadDetail.lead.owner, 'Rafael');
  assert.equal(leadDetail.activities.length, 1);
  assert.match(leadDetail.activities[0].summary, /Responsável.*Rafael/);

  const invalidStatus = await fetch(`${base}/api/admin/leads/${result.id}`, {
    method: 'PATCH',
    headers: { authorization: `Basic ${Buffer.from('rafael:segredo').toString('base64')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'invalido' })
  });
  assert.equal(invalidStatus.status, 422);
});

test('expõe configuração do Pixel sem cache e permite somente origens Meta necessárias', async t => {
  const temp = mkdtempSync(join(tmpdir(), 'htalks-pixel-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const app = createApp({ databasePath: join(temp, 'leads.sqlite'), metaPixelId: '1581798300311764' });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.address().port}`;

  const config = await fetch(`${base}/assets/meta-pixel-config.js`);
  assert.equal(config.status, 200);
  assert.equal(config.headers.get('cache-control'), 'no-store');
  assert.equal(await config.text(), 'window.HTALKS_META_PIXEL_ID="1581798300311764";');

  const page = await fetch(`${base}/consultoria`);
  assert.match(page.headers.get('content-security-policy'), /https:\/\/connect\.facebook\.net/);
  assert.match(page.headers.get('content-security-policy'), /https:\/\/www\.facebook\.com/);
  assert.match(await page.text(), /meta-pixel-config\.js/);

  const quickPage = await fetch(`${base}/atendimento-rapido-v2`);
  assert.equal(quickPage.status, 200);
  const quickHtml = await quickPage.text();
  assert.match(quickHtml, /meta_short_v2/);
  assert.match(quickHtml, /meta-pixel-config\.js/);
  assert.match(quickHtml, /meta-pixel\.js/);
});

test('dispara Lead uma vez somente após sucesso confirmado na mesma sessão', () => {
  const script = readFileSync(new URL('../public/assets/success.js', import.meta.url), 'utf8');
  const values = new Map();
  const calls = [];
  const makeContext = () => ({
    location: { search: '?id=HT-20260825-AAAAAAAA&oferta=consultoria' },
    URLSearchParams,
    sessionStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key)
    },
    document: { querySelector: () => null },
    window: { fbq: (...args) => calls.push(args) },
    encodeURIComponent
  });

  vm.runInNewContext(script, makeContext());
  assert.equal(calls.length, 0);

  values.set('htalks-lead:HT-20260825-AAAAAAAA', 'consultoria');
  vm.runInNewContext(script, makeContext());
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'track');
  assert.equal(calls[0][1], 'Lead');

  vm.runInNewContext(script, makeContext());
  assert.equal(calls.length, 1);
});

test('instrumenta o início do diagnóstico sem dados pessoais', () => {
  const script = readFileSync(new URL('../public/assets/form.js', import.meta.url), 'utf8');
  assert.match(script, /DiagnosticFormStart/);
  const eventLine = script.split('\n').find(line => line.includes('DiagnosticFormStart')) ?? '';
  assert.doesNotMatch(eventLine, /\b(name|phone|company)\s*:/);
});
