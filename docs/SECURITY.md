# Segurança — Axis Personal

## Modelo de Ameaças (resumido)

| Ameaça | Mitigação |
|---|---|
| Acesso por terceiros | Allowlist por e-mail + MFA TOTP obrigatório (AAL2) |
| Força bruta no login | Rate limit 5/15min por IP+e-mail; bloqueio progressivo via Upstash |
| Session hijacking | Cookies HttpOnly + Secure + SameSite=Lax; expiração curta |
| Clickjacking | X-Frame-Options: DENY + CSP frame-ancestors none |
| XSS | CSP restritiva sem unsafe-eval |
| Vazamento de dados no banco | RLS ativo em todas as tabelas; criptografia por campo (Parte B) |
| Secrets no repositório | .env* no .gitignore; validação na inicialização |

## Camadas implementadas

### 1. Autenticação
- Supabase Auth com e-mail + senha
- MFA TOTP obrigatório (nível AAL2); sem AAL2 nenhuma rota abre
- Allowlist: só o e-mail igual a `OWNER_EMAIL` pode ter sessão ativa
- Sessão com renovação automática via `@supabase/ssr`

### 2. Middleware
- Proteção de todas as rotas exceto `/login` e assets públicos
- Verificação de sessão + AAL2 a cada request
- Headers de segurança aplicados em todas as respostas

### 3. Headers de Segurança
- `Content-Security-Policy`: default-src 'self', sem unsafe-eval, connect-src restrita ao domínio Supabase
- `Strict-Transport-Security`: max-age=63072000 (2 anos), includeSubDomains, preload
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: câmera, microfone e geolocalização desabilitados
- `X-Powered-By` removido

### 4. Rate Limiting
- Login: 5 tentativas por 15 minutos por IP+e-mail (Upstash Redis em produção; fallback em memória apenas em dev)
- API geral: 60 req/min por usuário
- Resposta 429 com `Retry-After`

### 5. RLS (Row Level Security)
**Regra fundamental:** toda tabela nova nasce com `RLS ENABLED` e sem política = acesso negado por padrão.
Políticas só liberam acesso ao dono via `public.is_owner()`.

Exemplo de template para novas tabelas:
```sql
alter table nome_da_tabela enable row level security;
-- Sem política = ninguém acessa. Adicionar apenas:
create policy "owner_all" on nome_da_tabela
  for all using (public.is_owner()) with check (public.is_owner());
```

### 6. Criptografia por Campo (Parte B)
- Algoritmo: AES-256-GCM (node:crypto)
- IV aleatório de 12 bytes por operação — nunca reutilizado
- Formato: `v{versão}:{iv_b64url}:{ciphertext_b64url}:{tag_b64url}`
- AAD = nome do contexto (ex: `messages.content`) — impede colagem entre colunas
- Versionamento de chaves: leitura usa versão do payload; escrita usa versão ativa
- Chaves armazenadas **apenas** nas variáveis de ambiente do Vercel (marcadas como sensíveis)
- Blind index via HMAC-SHA256 para buscas por igualdade sem expor o valor

### 7. Dados em Repouso e Backups
- TLS em todo tráfego (Vercel + Supabase)
- Criptografia em repouso nativa do Supabase (AES-256 nos volumes)
- Campos sensíveis duplamente protegidos: criptografia nativa do Supabase + criptografia por campo da aplicação
- Backup automático do Supabase (PITR disponível nos planos Pro+)
- Script opcional `scripts/backup-export.sh`: faz dump do Postgres e criptografa com `age` usando chave pública do dono
  - **Os dumps são inúteis sem as chaves de aplicação** — manter backup separado das chaves no gerenciador de senhas

## Rotação de Chaves (procedimento)

1. Gerar nova chave: `npx tsx scripts/generate-key.ts`
2. Adicionar a nova chave em `ENCRYPTION_KEYS` com próximo número de versão (ex: `{"1":"...", "2":"..."}`)
3. Atualizar `ENCRYPTION_ACTIVE_VERSION` para a nova versão
4. Fazer deploy das novas variáveis no Vercel
5. Executar: `npx tsx scripts/rotate-keys.ts --dry-run` — verificar output
6. Executar: `npx tsx scripts/rotate-keys.ts` — realizar a rotação
7. Após confirmar que todos os registros usam a nova versão, remover a chave antiga de `ENCRYPTION_KEYS`
8. Novo deploy sem a chave antiga

## Checklist de Deploy

- [ ] Todas as variáveis configuradas no Vercel (sensíveis marcadas como protected)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` **nunca** exposta no browser (verificar bundle)
- [ ] Cadastro público desabilitado no Supabase (Auth > Providers)
- [ ] MFA TOTP habilitado no Supabase
- [ ] Usuário dono criado manualmente no painel Supabase
- [ ] RLS ativo em todas as tabelas
- [ ] Domínio com HTTPS (Vercel provisiona automaticamente)
- [ ] HSTS preload submetido após primeiro deploy estável
- [ ] Chaves de criptografia salvas no gerenciador de senhas (backup separado do repositório)
- [ ] Upstash Redis configurado para rate limiting em produção
