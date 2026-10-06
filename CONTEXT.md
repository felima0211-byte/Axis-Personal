# Axis Personal — Contexto do Projeto

> Documento único, substituído automaticamente a cada atualização da plataforma.

---

## Produção

**URL:** `https://axispersonal01.vercel.app`
**Repo:** `https://github.com/felima0211-byte/Axis-Personal`
**Deploy:** Vercel automático via push no `main`

---

## O que é

Dashboard pessoal single-owner. Um único arquivo HTML (`axis-personal.html`) deployado via Vercel, com persistência em **Supabase** (sincronização automática entre dispositivos).

> **Regra crítica:** nunca usar `localStorage.clear()`, nunca substituir `document.body.innerHTML`. Dados do usuário são sagrados.

---

## Como atualizar

```bash
# 1. Editar axis-personal.html
# 2. Sincronizar
cp axis-personal.html public/index.html
# Atualizar CONTEXT.md
git add axis-personal.html public/index.html CONTEXT.md
git commit -m "feat/fix: descrição"
git push origin main
open -a Safari "https://axispersonal01.vercel.app"
```

---

## Arquitetura

| Camada | Tecnologia |
|--------|-----------|
| UI | HTML + CSS custom properties (dark/light theme) |
| Auth | Supabase Auth — magic link (passwordless) |
| Estado | Supabase (PostgreSQL via RLS) + `state` em memória |
| Build | Nenhum — arquivo único |
| Deploy | Vercel → `public/index.html` como saída estática |

### Supabase

| Item | Valor |
|------|-------|
| Project ref | `wulgdkszppwsnbihozwp` |
| URL | `https://wulgdkszppwsnbihozwp.supabase.co` |
| Região | `sa-east-1` |
| CDN | `@supabase/supabase-js@2` via jsdelivr |

### Tabelas (todas com RLS — policy: `auth.uid() = user_id`)

| Tabela | Campos principais |
|--------|------------------|
| `projects` | id, user_id, name, description, color, status, parent_id, created_at |
| `tasks` | id, user_id, project_id, title, description, status, priority, due_at, start_at, created_at |
| `messages` | id, user_id, project_id, content, requester_name, created_at |
| `documents` | id, user_id, project_id, name, type, size, data (base64), url, kind, created_at |

### Fluxo de dados

- Auth via magic link → `supa.auth.onAuthStateChange` dispara `loadAll()` → `state` em memória
- Toda mutação: atualiza `state` imediatamente (otimista) → `dbUpsert / dbDelete` em background
- Primeiro login com Supabase vazio → migração automática do localStorage para o Supabase

### IDs

IDs gerados no cliente (`uid()` = `Date.now().toString(36) + random`), tipo `text` no Postgres.

---

## Assets estáticos

| Arquivo | Uso |
|---------|-----|
| `public/axis-icon.png` | Ícone crystal na sidebar |
| `public/axis-bg.png` | Background espacial (opacity 18%) |

---

## Funcionalidades implementadas

- [x] Grid de projetos com cards clicáveis e badge "Novidade" 24h
- [x] **Sub-projetos com hierarquia** — `parent_id` no modelo; sub-projetos listados dentro do card pai
- [x] **Drag-and-drop** para mover projeto para dentro de outro (arraste o card sobre outro)
- [x] **Zona "solte aqui"** aparece durante drag para remover projeto do pai (voltar à raiz)
- [x] **+ Sub-projeto** no detalhe do projeto cria filho direto no contexto atual
- [x] Select "Projeto pai" no dialog de novo projeto
- [x] Paleta de 16 cores ao criar projeto
- [x] Título do projeto editável inline
- [x] Detalhe do projeto com 4 tabs: Visão geral, Tarefas, Conversas, Documentos
- [x] Tabela de tarefas com colunas: título, início, prazo, countdown chip, prioridade
- [x] Edição de tarefa: título, descrição, data de início, prazo, prioridade
- [x] Tela Hoje: tarefas abertas agrupadas por projeto com divisores suaves
- [x] Calendário mensal com chips de tarefas por prazo, navegação ← →
- [x] Upload de documentos com preview in-app, toggle galeria/lista
- [x] Inserção de links em Documentos com ícone 🔗
- [x] Conversas: inserção, edição, exclusão + extração automática de tarefas
- [x] Tema dark/light
- [x] Ícone crystal na sidebar + background espacial
- [x] **Supabase sync** — todos os dados sincronizam automaticamente entre dispositivos
- [x] **Magic link auth** — login sem senha via email
- [x] **Migração automática** — dados do localStorage migram para Supabase no primeiro login
- [x] **Backup manual** — botão "Backup" exporta JSON com todos os dados

---

## Decisões técnicas

### Auth (magic link)
Supabase `signInWithOtp({ email, options: { emailRedirectTo: 'https://axispersonal01.vercel.app' } })`. Sessão persiste automaticamente via localStorage do Supabase SDK. Funciona em qualquer dispositivo/browser após clicar no link do email.

### Sincronização (otimista)
State em memória é atualizado imediatamente → `dbUpsert/dbDelete` salva em background. UI nunca trava esperando rede.

### Migração do localStorage
Na primeira autenticação, se Supabase estiver vazio, os dados do localStorage são migrados automaticamente (sem perda). Documentos base64 grandes são migrados um a um com try/catch.

### Sub-projetos (hierarquia de 1 nível)
Apenas projetos raiz (`parent_id === null`) aparecem no grid principal. Sub-projetos são listados compactamente dentro do card do pai. Nesting mais profundo não é suportado (proteção via `isAncestor()`).

### Drag-and-drop
HTML5 nativo — `draggable="true"` + eventos `dragstart/dragover/dragleave/drop`. `body.classList.add('is-dragging')` ativa a zona de drop para raiz. `isAncestor()` impede loops circulares.

### Datas (timezone-safe)
```js
const [y,m,d] = iso.slice(0,10).split('-')
task.due_at = new Date(dv + 'T12:00:00').toISOString()
```

### Links em Documentos
Salvos com `kind:'link'`, `url:'...'`, `data:null`. Render checa `doc.kind==='link'` para abrir em nova aba.

---

## Histórico de commits recentes

<!-- AUTO-UPDATED BELOW -->
- `a4a3bf3` · 2026-10-06 09:39 — feat: exportar e importar dados como backup JSON
- `dc1213a` · 2026-10-05 13:51 — fix: remove strikethrough de tarefas concluídas, mantém check e cor apagada
- `ff22eb8` · 2026-10-05 13:49 — feat: tarefas checkáveis na aba Hoje + clique na linha abre edição
- `794e626` · 2026-10-05 06:20 — feat: sub-projetos como cards clicáveis na Visão Geral do projeto pai
- `37b18ce` · 2026-10-05 06:17 — feat: sub-projetos aparecem na Visão Geral do projeto pai
- `91567ed` · 2026-10-05 06:16 — fix: drag-and-drop com suporte correto ao Safari
- `b349740` · 2026-10-05 06:14 — fix: botão + Sub-projeto funcional; remove drag-and-drop (não suportado no Safari)
- `7682ba5` · 2026-10-05 06:10 — feat: sub-projetos com drag-and-drop e hierarquia pai/filho
