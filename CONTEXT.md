# Axis Personal — Contexto do Projeto

> Documento único, substituído automaticamente a cada atualização da plataforma.

---

## Produção

**URL:** `https://axispersonal01.vercel.app`
**Repo:** `https://github.com/felima0211-byte/Axis-Personal`
**Deploy:** Vercel automático via push no `main`
**Diretório local:** `/Users/Fe/laboratorio-produtos/axis-personal`

---

## O que é

Dashboard pessoal single-owner. Um único arquivo HTML (`axis-personal.html`) deployado via Vercel, com persistência em **Supabase** (sincronização automática entre dispositivos).

> **Regra crítica:** nunca usar `localStorage.clear()`, nunca substituir `document.body.innerHTML`. Dados do usuário são sagrados.

---

## Como atualizar

```bash
cd /Users/Fe/laboratorio-produtos/axis-personal
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
| Auth | Supabase Auth — email + senha |
| Estado | Supabase (PostgreSQL via RLS) + `state` em memória + localStorage como backup |
| Build | Nenhum — arquivo único |
| Deploy | Vercel → `public/index.html` como saída estática |

### Supabase

| Item | Valor |
|------|-------|
| Project ref | `wulgdkszppwsnbihozwp` |
| URL | `https://wulgdkszppwsnbihozwp.supabase.co` |
| Região | `sa-east-1` |
| CDN | `@supabase/supabase-js@2` via jsdelivr |
| Auth user | `felima0211@gmail.com` / UUID `759cddd1-7a79-4ad3-8d57-7c953eba5190` |

### Tabelas (todas com RLS — policy: `auth.uid() = user_id`)

| Tabela | Campos |
|--------|--------|
| `projects` | id (text), user_id (uuid), name, color, status, description, parent_id (text), created_at, updated_at |
| `tasks` | id (text), user_id (uuid), project_id (text), title, description, status, priority, due_at, start_at, created_at, updated_at |
| `messages` | id (text), user_id (uuid), project_id (text), content, requester_name, extraction_status (default 'pending'), created_at |
| `documents` | id (text), user_id (uuid), project_id (text), name, type, size, data (base64 text), url, kind (default 'file'), created_at |
| `logs` | id (text), user_id (uuid), entity_type, entity_id, action, detail, created_at |

**GRANTS aplicados:** `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<tabela> TO authenticated` — todas as 5 tabelas.

### Constraints relevantes

- `tasks.status`: `open, done, confirmed, active, archived, in_progress, draft`
- `tasks.priority`: `low, normal, high, urgent`
- `messages.extraction_status`: `pending, done, failed`
- `projects.status`: `active, paused, completed, archived`

### Fluxo de dados

1. Login com email+senha → `supa.auth.onAuthStateChange` dispara `loadAll()`
2. `loadAll()` busca Supabase + **mescla** com localStorage (itens offline são incorporados e enviados ao Supabase automaticamente)
3. Toda mutação: atualiza `state` → **`lsSave()`** (localStorage imediato) → `dbUpsert/dbDelete` (Supabase background)
4. Se Supabase falha: toast permanente (clique para fechar), dado está salvo no localStorage
5. Na próxima carga: `loadAll` detecta itens só no localStorage e os sincroniza com Supabase

### IDs

IDs gerados no cliente: `uid()` = `Date.now().toString(36) + Math.random().toString(36).slice(2)`, tipo `text` no Postgres.

### Ordem de tarefas

- Sort padrão: por `due_at` ASC (prazo mais próximo no topo; sem prazo vai para o final)
- Drag-and-drop manual salva ordem customizada em `localStorage.axis_task_order_<projectId>` (array de ids)
- Ordem manual tem precedência sobre sort por data

---

## Assets estáticos

| Arquivo | Uso |
|---------|-----|
| `public/axis-icon.png` | Ícone crystal na sidebar |
| `public/axis-bg.png` | Background espacial (opacity 18%) |

---

## Funcionalidades implementadas

- [x] Grid de projetos com cards clicáveis
- [x] **Sub-projetos** com hierarquia 1 nível (`parent_id`); sub-projetos listados no card pai
- [x] **Drag-and-drop de projetos** — arrastar card sobre outro vira sub-projeto; zona "solte aqui" retorna à raiz
- [x] **+ Sub-projeto** no detalhe cria filho direto
- [x] Select "Projeto pai" no dialog de novo projeto
- [x] Paleta de 16 cores ao criar projeto
- [x] Título do projeto editável inline
- [x] Detalhe do projeto com 4 tabs: Visão geral, Tarefas, Conversas, Documentos
- [x] **Tabela de tarefas** — colunas: Tarefa, Início, Prazo, Tempo (verde >16d / amarelo 8-15d / vermelho ≤7d), Prioridade (MAIÚSCULA), ✕ excluir
- [x] **Datas curtas** dd/mm/aa nas colunas da tabela
- [x] **Sort por prazo** (mais próximo no topo); **drag-and-drop** para ordem manual
- [x] **Ver mais / Ver menos** — máximo 6 itens por seção; funciona em Atrasadas, Abertas, Concluídas (Visão Geral) e na aba Tarefas
- [x] **Excluir tarefa** — botão ✕ em cada linha (Visão Geral e aba Tarefas)
- [x] Edição de tarefa: título, descrição, data início, prazo, prioridade
- [x] Tela Hoje: tarefas abertas agrupadas por projeto, ordenadas por última modificação, com timestamp
- [x] Calendário mensal com chips de tarefas por prazo, navegação ← →
- [x] Upload de documentos com preview in-app, toggle galeria/lista
- [x] Inserção de links em Documentos com ícone 🔗
- [x] Conversas: inserção, edição, exclusão + extração automática de tarefas
- [x] OCR de imagem/print via Tesseract.js (CDN v4) na aba Conversas
- [x] Tema dark/light
- [x] Ícone crystal na sidebar + background espacial
- [x] **Supabase sync** — dados sincronizam entre dispositivos
- [x] **Auth email+senha** — login padrão sem magic link
- [x] **Dupla persistência** — localStorage sempre atualizado; Supabase sync em background; merge automático no login
- [x] **Backup manual** — botão "Backup" exporta JSON com todos os dados
- [x] **Sync local** — botão na sidebar para forçar migração localStorage → Supabase
- [x] Logs de mutações na tabela `logs`

---

## Decisões técnicas

### Auth (email + senha)
`supa.auth.signInWithPassword({ email, password })`. Sessão persiste via localStorage do SDK. `onAuthStateChange` é o único gatilho para carregar dados — nunca chamar `loadAll()` diretamente fora dele.

### Dupla persistência (anti-perda-de-dados)
Toda mutação: `state` → `lsSave()` (localStorage, imediato) → `dbUpsert/dbDelete` (Supabase, background). Se Supabase falha, dado está no localStorage. `loadAll` mescla os dois na próxima sessão.

### localStorage keys
```js
axis_projects, axis_tasks, axis_messages, axis_documents
axis_task_order_<projectId>  // ordem customizada de tarefas por projeto
```
Documentos base64 grandes são salvos sem o campo `data` no localStorage (campo vira `__blob__`) para não saturar o storage; o base64 real fica só no Supabase.

### Sub-projetos
Apenas projetos raiz (`parent_id === null`) aparecem no grid principal. `isAncestor()` impede loops circulares no drag-and-drop.

### Drag-and-drop de tarefas
HTML5 nativo. `taskDragStart/taskDragOver/taskDrop/taskDragEnd` + `saveTaskOrder(projectId, ids)`. Ordem salva em localStorage por projeto.

### Ver mais / Ver menos
Constante `TASKS_PER_PAGE = 6`. Set `taskExpanded` rastreia quais seções estão expandidas. `toggleTaskSection(key)` e `toggleTaskSectionTab()` alternam e re-renderizam.

### Datas (timezone-safe)
```js
function fmtDateShort(iso) { const[y,m,d]=iso.slice(0,10).split('-'); return `${d}/${m}/${y.slice(2)}` }
task.due_at = new Date(dv + 'T12:00:00').toISOString()
```

### Links em Documentos
Salvos com `kind:'link'`, `url:'...'`, `data:null`. Render checa `doc.kind==='link'` para abrir em nova aba.

### CDN scripts no `<head>`
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js"></script>
```

---

## Histórico de commits recentes

<!-- AUTO-UPDATED BELOW -->
- `ab9ef15` · 2026-10-07 — feat: sem bordas verticais, sort por prazo, drag-and-drop tarefas, ver mais/menos (6/seção), prioridade maiúscula
- `efa463d` · 2026-10-07 — feat: datas curtas dd/mm/aa, cores de tempo (verde/amarelo/vermelho), excluir tarefa
- `1db17bb` · 2026-10-07 — fix: dupla persistência localStorage+Supabase; loadAll com merge e fallback; toast permanente
- `8ad742f` · 2026-10-07 — fix: GRANT CRUD ao role authenticated em todas as tabelas
- `59486ec` · 2026-10-07 — fix: parent_id/start_at faltantes; check constraint de status em tasks
- `a21e7bf` · 2026-10-07 — fix: id uuid→text no Supabase; erros de sync visíveis; botão Sync local
- `95feeb8` · 2026-10-07 — feat: Nova Conversa na aba + OCR via Tesseract.js
- `76a3aef` · 2026-10-06 — feat: Hoje ordenado por última modificação + timestamp + logs
- `e675024` · 2026-10-06 — feat: auth email+senha (substituiu magic link)
- `5af0811` · 2026-10-06 — feat: migrar persistência para Supabase
- `a4a3bf3` · 2026-10-06 — feat: exportar/importar backup JSON
