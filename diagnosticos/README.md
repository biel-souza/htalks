# H-TALKS Diagnósticos

Aplicação própria para as duas rotas de captura comercial:

- `/atendimento` — Diagnóstico do Atendimento;
- `/consultoria` — Diagnóstico de Oportunidade de IA;
- `/admin` — fila interna protegida por autenticação HTTP Basic.

## Execução local

```bash
cd diagnosticos
ADMIN_USER=rafael ADMIN_PASSWORD='troque-esta-senha' \
LEAD_HASH_SECRET='troque-este-segredo' npm start
```

Acesse `http://127.0.0.1:8787`.

## Variáveis

- `PORT` — padrão `8787`.
- `HOST` — padrão `127.0.0.1`.
- `DATABASE_PATH` — padrão `var/leads.sqlite`.
- `ADMIN_USER` — obrigatório fora de teste.
- `ADMIN_PASSWORD` — obrigatório fora de teste.
- `LEAD_HASH_SECRET` — segredo usado para hash do IP; nunca grava IP bruto.
- `PUBLIC_ORIGIN` — origem pública esperada para validar POST em produção.

## Segurança e operação

- consentimento obrigatório;
- honeypot e rate limit por hash de IP;
- corpo limitado a 64 KiB;
- validação e pontuação executadas no servidor;
- nenhuma mensagem, agenda ou integração externa automática;
- painel administrativo protegido;
- banco e segredos ignorados pelo Git.

Antes de produção: colocar atrás de HTTPS/Cloudflare, usar segredos do cofre, definir backup/retensão, habilitar autenticação forte no painel e revisar o texto de privacidade.
