# Axis Personal

Painel pessoal de único usuário. Roda localmente e em produção (Vercel + Supabase).

## Pré-requisitos

- Node.js 20+
- Conta no Supabase
- Conta no Upstash (Redis) — opcional em dev, obrigatório em produção

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com seus valores reais

# 3. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse http://localhost:3000 — será redirecionado para `/login`.

## Scripts disponíveis

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção
npm run typecheck    # verificação de tipos TypeScript
npm run lint         # ESLint
npm run test         # testes (Vitest)
```

## Estrutura de pastas

```
src/
  app/          # Rotas e páginas (Next.js App Router)
  lib/          # Utilitários compartilhados (env, supabase, rate-limit)
  server/       # Código exclusivo de servidor (crypto, repositórios)
  __tests__/    # Testes unitários
supabase/
  migrations/   # SQL versionado
scripts/        # Utilitários de linha de comando
docs/           # Documentação (SECURITY.md)
```

## Segurança

Ver [docs/SECURITY.md](docs/SECURITY.md) para modelo de ameaças, camadas implementadas e checklist de deploy.

## Variáveis de ambiente

Ver [.env.example](.env.example) para a lista completa.
`SUPABASE_SERVICE_ROLE_KEY` é exclusiva de servidor — nunca é exposta ao browser.
