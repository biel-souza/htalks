import http from 'node:http';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, 'public');

const optionPoints = {
  atendimento: {
    team_size: { '2-3': 2, '4-10': 2, '11-30': 2, '30+': 2 },
    monthly_volume: { '101-300': 1, '301-1000': 2, '1001-3000': 2, '3000+': 2 },
    frequency: { daily: 2, weekly: 1 },
    impact: { sales: 2, complaints: 2, control: 2 },
    decision_role: { decides: 2, co_decides: 2, influences: 1 }
  },
  consultoria: {
    process_frequency: { daily_many: 2, daily: 2, weekly: 1 },
    people_count: { '2-3': 1, '4-10': 2, '11-30': 2, '30+': 2 },
    bottleneck: { rework: 2, errors: 2, delay: 2, slow_decision: 2 },
    data_available: { structured: 2, dispersed: 2, partial: 2, unknown: 1 },
    sponsor: { self: 2, leadership: 2, board: 2, it: 1 },
    urgency: { '30d': 1, '90d': 1 }
  }
};

export function normalizeText(value, max = 1000) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function filled(value) {
  return normalizeText(value).length > 0;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(value, 160));
}

function validPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function scoreLead(offer, data) {
  let score = 0;
  for (const [field, values] of Object.entries(optionPoints[offer] ?? {})) {
    score += values[data[field]] ?? 0;
  }

  if (offer === 'atendimento') {
    if (normalizeText(data.goal_90d, 500).length >= 30) score += 1;
    const channels = Array.isArray(data.channels) ? data.channels : [];
    if (channels.length >= 2) score += 1;
    return { score, priority: score >= 8 ? 'P1' : score >= 5 ? 'P2' : 'P3' };
  }

  const systems = Array.isArray(data.systems) ? data.systems : [];
  score += systems.length >= 3 ? 2 : systems.length === 2 ? 1 : 0;
  if (normalizeText(data.success_metric, 500).length >= 20) score += 2;
  return { score, priority: score >= 10 ? 'P1' : score >= 6 ? 'P2' : 'P3' };
}

export function validateLead(offer, data) {
  const errors = {};
  if (!['atendimento', 'consultoria'].includes(offer)) errors.offer = 'Oferta inválida.';
  const shortMetaLanding = offer === 'atendimento' && ['meta_short_v1', 'meta_short_v2'].includes(data.landing_variant);
  if (shortMetaLanding) {
    const required = data.landing_variant === 'meta_short_v2'
      ? ['name', 'company', 'bottleneck']
      : ['name', 'company', 'bottleneck', 'urgency'];
    for (const field of required) {
      if (!filled(data[field])) errors[field] = 'Campo obrigatório.';
    }
    if (!validPhone(data.phone)) errors.phone = 'Informe um WhatsApp válido com DDD.';
    if (data.consent !== true) errors.consent = 'O consentimento é obrigatório.';
    if (filled(data.website)) errors.spam = 'Submissão recusada.';
    return errors;
  }
  for (const field of ['name', 'company', 'role']) {
    if (!filled(data[field])) errors[field] = 'Campo obrigatório.';
  }
  if (!validEmail(data.email)) errors.email = 'Informe um e-mail válido.';
  if (!validPhone(data.phone)) errors.phone = 'Informe um WhatsApp válido com DDD.';
  if (data.consent !== true) errors.consent = 'O consentimento é obrigatório.';
  if (filled(data.website)) errors.spam = 'Submissão recusada.';

  if (offer === 'atendimento') {
    for (const field of ['segment', 'team_size', 'monthly_volume', 'organization', 'bottleneck', 'frequency', 'impact', 'decision_role', 'goal_90d']) {
      if (!filled(data[field])) errors[field] = 'Campo obrigatório.';
    }
    if (!Array.isArray(data.channels) || data.channels.length === 0) errors.channels = 'Selecione ao menos um canal.';
  }

  if (offer === 'consultoria') {
    for (const field of ['segment', 'process_type', 'process_description', 'process_frequency', 'people_count', 'bottleneck', 'data_available', 'sensitive_data', 'success_metric', 'sponsor', 'urgency']) {
      if (!filled(data[field])) errors[field] = 'Campo obrigatório.';
    }
    if (!Array.isArray(data.systems) || data.systems.length === 0) errors.systems = 'Selecione ao menos um sistema ou fonte.';
  }
  return errors;
}

export function validateNps(data) {
  const errors = {};
  for (const field of ['empresa', 'respondente', 'motivo', 'resultado', 'melhoria']) {
    if (!filled(data[field])) errors[field] = 'Campo obrigatório.';
  }
  const score = Number(data.nps);
  if (!Number.isInteger(score) || score < 0 || score > 10) errors.nps = 'A nota deve estar entre 0 e 10.';
  if (normalizeText(data.resultado, 300) === 'Outro' && !filled(data.outro_resultado)) errors.outro_resultado = 'Descreva o resultado.';
  if (normalizeText(data.motivo, 1201).length > 1200) errors.motivo = 'Limite de 1200 caracteres.';
  if (normalizeText(data.melhoria, 1201).length > 1200) errors.melhoria = 'Limite de 1200 caracteres.';
  return errors;
}

function sanitizedPayload(data) {
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    clean[key] = Array.isArray(value)
      ? value.map(item => normalizeText(item, 80)).slice(0, 20)
      : typeof value === 'boolean'
        ? value
      : normalizeText(value, key.includes('description') || ['motivo', 'melhoria'].includes(key) ? 1200 : 500);
  }
  delete clean.website;
  return clean;
}

export function createDatabase(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      offer TEXT NOT NULL CHECK (offer IN ('atendimento','consultoria')),
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      score INTEGER NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('P1','P2','P3')),
      status TEXT NOT NULL DEFAULT 'novo',
      source TEXT,
      medium TEXT,
      campaign TEXT,
      content TEXT,
      landing_path TEXT,
      consent_at TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      review_notes TEXT NOT NULL DEFAULT '',
      reviewed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS leads_created_idx ON leads(created_at DESC);
    CREATE INDEX IF NOT EXISTS leads_queue_idx ON leads(status, priority, created_at DESC);
  `);
  const columns = new Set(db.prepare('PRAGMA table_info(leads)').all().map(column => column.name));
  if (!columns.has('next_action')) db.exec("ALTER TABLE leads ADD COLUMN next_action TEXT NOT NULL DEFAULT ''");
  if (!columns.has('next_action_at')) db.exec('ALTER TABLE leads ADD COLUMN next_action_at TEXT');
  if (!columns.has('owner')) db.exec("ALTER TABLE leads ADD COLUMN owner TEXT NOT NULL DEFAULT ''");
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_public_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      summary TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS lead_activities_idx ON lead_activities(lead_public_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS nps_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      company TEXT NOT NULL,
      respondent TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      nps_score INTEGER NOT NULL CHECK (nps_score BETWEEN 0 AND 10),
      reason TEXT NOT NULL,
      main_result TEXT NOT NULL,
      other_result TEXT NOT NULL DEFAULT '',
      improvement TEXT NOT NULL,
      form_version TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS nps_created_idx ON nps_responses(created_at DESC);
    CREATE INDEX IF NOT EXISTS nps_score_idx ON nps_responses(nps_score, created_at DESC);
  `);
  return db;
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}

function javascript(res, body) {
  res.writeHead(200, {
    'content-type': 'text/javascript; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(body);
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function authorized(req, user, password) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const index = decoded.indexOf(':');
  return index > -1 && safeEqual(decoded.slice(0, index), user) && safeEqual(decoded.slice(index + 1), password);
}

function mime(path) {
  return ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' })[extname(path)] ?? 'application/octet-stream';
}

function staticFile(res, file, nonce = '') {
  try {
    const extension = extname(file);
    let body = readFileSync(file);
    if (extension === '.html') {
      let html = body.toString('utf8')
        .replaceAll('/assets/styles.css"', '/assets/styles.css?v=20260821-6"')
        .replaceAll('class="brand-logo" src="/assets/h-talks-logo-light.png" alt="H-TALKS"', 'class="brand-logo" src="/assets/h-talks-logo-light.png" alt="H-TALKS" width="163" height="44"');
      if (!file.endsWith('admin.html') && !html.includes('/assets/meta-pixel-config.js')) {
        html = html.replace('</head>', '<script src="/assets/meta-pixel-config.js" defer></script><script src="/assets/meta-pixel.js?v=20260825-1" defer></script></head>');
      }
      if (nonce) html = html.replaceAll('<script>', `<script nonce="${nonce}">`);
      body = Buffer.from(html);
    }
    const cacheControl = extension === '.html' || extension === '.css'
      ? 'no-cache, must-revalidate'
      : 'public, max-age=86400';
    res.writeHead(200, {
      'content-type': mime(file),
      'cache-control': cacheControl,
      'x-content-type-options': 'nosniff'
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('Não encontrado');
  }
}

export function createApp(options = {}) {
  const db = options.db ?? createDatabase(options.databasePath ?? join(root, 'var', 'leads.sqlite'));
  const adminUser = options.adminUser ?? process.env.ADMIN_USER ?? 'admin';
  const adminPassword = options.adminPassword ?? process.env.ADMIN_PASSWORD ?? '';
  const hashSecret = options.hashSecret ?? process.env.LEAD_HASH_SECRET ?? 'local-development-only';
  const publicOrigin = options.publicOrigin ?? process.env.PUBLIC_ORIGIN ?? '';
  const metaPixelId = normalizeText(options.metaPixelId ?? process.env.META_PIXEL_ID ?? '', 32).replace(/\D/g, '');
  const rate = new Map();

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const nonce = randomUUID().replaceAll('-', '');
    const routes = { '/': 'index.html', '/atendimento': 'atendimento.html', '/atendimento-rapido': 'atendimento-rapido-v2.html', '/atendimento-rapido-v1': 'atendimento-rapido.html', '/atendimento-rapido-v2': 'atendimento-rapido-v2.html', '/consultoria': 'consultoria.html', '/nps': 'nps.html', '/obrigado': 'obrigado.html', '/admin': 'admin.html' };

    res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
    res.setHeader('x-frame-options', 'DENY');
    res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    const stylePolicy = url.pathname === '/nps' ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'";
    const scriptPolicy = url.pathname === '/nps' ? `script-src 'self' 'nonce-${nonce}' https://connect.facebook.net` : "script-src 'self' https://connect.facebook.net";
    res.setHeader('content-security-policy', `default-src 'self'; ${stylePolicy}; ${scriptPolicy}; connect-src 'self' https://www.facebook.com https://connect.facebook.net; img-src 'self' data: https://www.facebook.com; form-action 'self'; frame-ancestors 'none'; base-uri 'self'`);

    if (req.method === 'GET' && url.pathname === '/healthz') {
      return json(res, 200, { status: 'ok' });
    }

    if (req.method === 'GET' && url.pathname === '/assets/meta-pixel-config.js') {
      return javascript(res, `window.HTALKS_META_PIXEL_ID=${JSON.stringify(metaPixelId)};`);
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && routes[url.pathname]) {
      if (url.pathname === '/admin' && !authorized(req, adminUser, adminPassword)) {
        res.writeHead(401, { 'www-authenticate': 'Basic realm="H-TALKS Leads"' }).end('Autenticação necessária');
        return;
      }
      staticFile(res, join(publicDir, routes[url.pathname]), url.pathname === '/nps' ? nonce : '');
      return;
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname.startsWith('/assets/')) {
      const name = url.pathname.slice('/assets/'.length).replace(/[^a-zA-Z0-9._-]/g, '');
      staticFile(res, join(publicDir, 'assets', name));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/admin/leads') {
      if (!authorized(req, adminUser, adminPassword)) return json(res, 401, { error: 'Não autorizado.' });
      const rows = db.prepare('SELECT public_id, created_at, offer, name, company, email, phone, score, priority, status, source, campaign, review_notes, reviewed_at, next_action, next_action_at, owner, payload_json FROM leads ORDER BY created_at DESC LIMIT 200').all();
      return json(res, 200, { leads: rows.map(row => ({ ...row, payload: JSON.parse(row.payload_json), payload_json: undefined })) });
    }
    if (req.method === 'GET' && url.pathname === '/api/admin/nps') {
      if (!authorized(req, adminUser, adminPassword)) return json(res, 401, { error: 'Não autorizado.' });
      const rows = db.prepare('SELECT public_id, created_at, company, respondent, role, nps_score, reason, main_result, other_result, improvement, form_version FROM nps_responses ORDER BY created_at DESC LIMIT 500').all();
      return json(res, 200, { responses: rows });
    }
    const adminLeadMatch = url.pathname.match(/^\/api\/admin\/leads\/(HT-[A-Z0-9-]+)$/);
    if (req.method === 'GET' && adminLeadMatch) {
      if (!authorized(req, adminUser, adminPassword)) return json(res, 401, { error: 'Não autorizado.' });
      const lead = db.prepare('SELECT public_id, created_at, offer, name, company, email, phone, score, priority, status, source, campaign, review_notes, reviewed_at, next_action, next_action_at, owner, payload_json FROM leads WHERE public_id = ?').get(adminLeadMatch[1]);
      if (!lead) return json(res, 404, { error: 'Lead não encontrado.' });
      const activities = db.prepare('SELECT created_at, activity_type, summary FROM lead_activities WHERE lead_public_id = ? ORDER BY created_at DESC LIMIT 50').all(adminLeadMatch[1]);
      return json(res, 200, { lead: { ...lead, payload: JSON.parse(lead.payload_json), payload_json: undefined }, activities });
    }
    if (req.method === 'PATCH' && adminLeadMatch) {
      if (!authorized(req, adminUser, adminPassword)) return json(res, 401, { error: 'Não autorizado.' });
      if (publicOrigin && req.headers.origin && req.headers.origin !== publicOrigin) return json(res, 403, { error: 'Origem inválida.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 16384) return json(res, 413, { error: 'Conteúdo excede o limite.' });
      }
      let input;
      try { input = JSON.parse(raw); } catch { return json(res, 400, { error: 'JSON inválido.' }); }
      const validStatuses = new Set(['novo', 'em_contato', 'qualificado', 'reuniao', 'ganho', 'perdido']);
      const status = normalizeText(input.status, 30);
      if (!validStatuses.has(status)) return json(res, 422, { error: 'Status inválido.' });
      const reviewNotes = normalizeText(input.review_notes, 1000);
      const nextAction = normalizeText(input.next_action, 300);
      const owner = normalizeText(input.owner, 100);
      const nextActionAt = input.next_action_at ? new Date(input.next_action_at) : null;
      if (nextActionAt && Number.isNaN(nextActionAt.getTime())) return json(res, 422, { error: 'Data da próxima ação inválida.' });
      const reviewedAt = new Date().toISOString();
      const previous = db.prepare('SELECT status, review_notes, next_action, next_action_at, owner FROM leads WHERE public_id = ?').get(adminLeadMatch[1]);
      if (!previous) return json(res, 404, { error: 'Lead não encontrado.' });
      db.prepare('UPDATE leads SET status = ?, review_notes = ?, next_action = ?, next_action_at = ?, owner = ?, reviewed_at = ? WHERE public_id = ?')
        .run(status, reviewNotes, nextAction, nextActionAt?.toISOString() ?? null, owner, reviewedAt, adminLeadMatch[1]);
      const changes = [];
      if (previous.status !== status) changes.push(`Status: ${previous.status} → ${status}`);
      if (previous.owner !== owner) changes.push(`Responsável: ${previous.owner || 'não definido'} → ${owner || 'não definido'}`);
      if (previous.next_action !== nextAction || previous.next_action_at !== (nextActionAt?.toISOString() ?? null)) changes.push(`Próxima ação: ${nextAction || 'não definida'}`);
      if (previous.review_notes !== reviewNotes) changes.push('Observação interna atualizada');
      db.prepare('INSERT INTO lead_activities (lead_public_id, created_at, activity_type, summary) VALUES (?, ?, ?, ?)')
        .run(adminLeadMatch[1], reviewedAt, 'atualizacao', changes.join(' · ') || 'Lead revisado sem alteração de campos');
      return json(res, 200, { ok: true, id: adminLeadMatch[1], status, owner, reviewed_at: reviewedAt });
    }
    if (req.method === 'POST' && url.pathname === '/api/leads') {
      if (publicOrigin && req.headers.origin !== publicOrigin) return json(res, 403, { error: 'Origem inválida.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 65536) return json(res, 413, { error: 'Conteúdo excede o limite.' });
      }
      let input;
      try { input = JSON.parse(raw); } catch { return json(res, 400, { error: 'JSON inválido.' }); }
      const offer = normalizeText(input.offer, 20);
      const data = input.data ?? {};
      const errors = validateLead(offer, data);
      if (Object.keys(errors).length) return json(res, 422, { error: 'Revise os campos.', fields: errors });

      const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
      const ip = forwarded || req.socket.remoteAddress || 'unknown';
      const ipHash = createHash('sha256').update(`${hashSecret}:${ip}`).digest('hex');
      const now = Date.now();
      const recent = (rate.get(ipHash) ?? []).filter(ts => now - ts < 3600000);
      if (recent.length >= 5) return json(res, 429, { error: 'Limite de envios atingido. Tente novamente mais tarde.' });
      recent.push(now); rate.set(ipHash, recent);

      const clean = sanitizedPayload(data);
      const { score, priority } = scoreLead(offer, clean);
      const createdAt = new Date().toISOString();
      const publicId = `HT-${createdAt.slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
      db.prepare(`INSERT INTO leads (public_id, created_at, offer, name, company, email, phone, score, priority, source, medium, campaign, content, landing_path, consent_at, ip_hash, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(publicId, createdAt, offer, clean.name, clean.company, clean.email ?? '', clean.phone, score, priority, clean.source ?? '', clean.medium ?? '', clean.campaign ?? '', clean.content ?? '', clean.landing_path ?? '', createdAt, ipHash, JSON.stringify(clean));
      return json(res, 201, { ok: true, id: publicId });
    }
    if (req.method === 'POST' && url.pathname === '/api/nps') {
      if (publicOrigin && req.headers.origin !== publicOrigin) return json(res, 403, { error: 'Origem inválida.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 32768) return json(res, 413, { error: 'Conteúdo excede o limite.' });
      }
      let input;
      try { input = JSON.parse(raw); } catch { return json(res, 400, { error: 'JSON inválido.' }); }
      const errors = validateNps(input ?? {});
      if (Object.keys(errors).length) return json(res, 422, { error: 'Revise os campos.', fields: errors });

      const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
      const ip = forwarded || req.socket.remoteAddress || 'unknown';
      const ipHash = createHash('sha256').update(`${hashSecret}:nps:${ip}`).digest('hex');
      const rateKey = `nps:${ipHash}`;
      const now = Date.now();
      const recent = (rate.get(rateKey) ?? []).filter(ts => now - ts < 3600000);
      if (recent.length >= 10) return json(res, 429, { error: 'Limite de envios atingido. Tente novamente mais tarde.' });
      recent.push(now); rate.set(rateKey, recent);

      const clean = sanitizedPayload(input);
      const createdAt = new Date().toISOString();
      const publicId = `NPS-${createdAt.slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
      db.prepare(`INSERT INTO nps_responses (public_id, created_at, company, respondent, role, nps_score, reason, main_result, other_result, improvement, form_version, ip_hash, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        publicId, createdAt, clean.empresa, clean.respondente, clean.cargo ?? '', Number(clean.nps), clean.motivo,
        clean.resultado, clean.outro_resultado ?? '', clean.melhoria, clean.versao ?? 'nps-2026-09-v1', ipHash, JSON.stringify(clean)
      );
      return json(res, 201, { ok: true, id: publicId });
    }
    res.writeHead(404).end('Não encontrado');
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? '127.0.0.1';
  if (!process.env.ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD é obrigatório.');
    process.exit(1);
  }
  createApp({ databasePath: process.env.DATABASE_PATH }).listen(port, host, () => console.log(`H-TALKS Diagnósticos em http://${host}:${port}`));
}
