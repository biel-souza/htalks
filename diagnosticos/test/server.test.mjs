import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
});
