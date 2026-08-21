# Checklist de deploy controlado

- [ ] Rafael aprovar formulário, textos e hostname.
- [ ] Definir retenção, exportação e exclusão de dados pessoais.
- [ ] Criar usuário de serviço sem shell.
- [ ] Instalar release imutável em `/opt/htalks-diagnosticos/releases/<sha>`.
- [ ] Criar banco em `/var/lib/htalks-diagnosticos` com permissão mínima.
- [ ] Gerar `ADMIN_PASSWORD` e `LEAD_HASH_SECRET` no cofre.
- [ ] Instalar unit systemd e proxy Nginx em loopback.
- [ ] Testar `/healthz`, envio, rate limit, autenticação e persistência.
- [ ] Criar hostname Cloudflare apenas após validação local.
- [ ] Proteger `/admin` com Cloudflare Access além da autenticação da aplicação.
- [ ] Validar HTTPS, CSP, mobile/desktop e política de privacidade.
- [ ] Configurar backup recuperável do banco e testar restauração.
- [ ] Conectar CTAs do site somente após o novo domínio estar validado.
- [ ] Monitorar primeiros envios e manter kill switch documentado.

Nenhum item deste checklist é autorização automática para alterar produção.
