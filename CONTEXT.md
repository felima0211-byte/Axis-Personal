# Axis Personal — Contexto do Projeto

> Documento único, substituído automaticamente a cada atualização da plataforma.

---

## Produção

**URL:** `https://axispersonal01.vercel.app`
**Repo:** `https://github.com/felima0211-byte/Axis-Personal`
**Deploy:** Vercel automático via push no `main`

---

## O que é

Dashboard pessoal single-owner. Um único arquivo HTML (`axis-personal.html`) deployado via Vercel. Zero backend, zero login — tudo persiste em `localStorage` vinculado ao domínio de produção.

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
| Estado | `localStorage` (sem Supabase, sem servidor) |
| Build | Nenhum — arquivo único |
| Deploy | Vercel → `public/index.html` como saída estática |

### Chaves do localStorage

| Chave | Conteúdo |
|-------|----------|
| `axis_projects` | Array de projetos (campo `parent_id` para hierarquia) |
| `axis_tasks` | Array de tarefas |
| `axis_messages` | Array de conversas |
| `axis_documents` | Array de documentos (base64) e links |

### Modelo de projeto
```js
{
  id, name, description, color, status,
  parent_id: null | 'id-do-pai',  // null = projeto raiz
  created_at
}
```

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

---

## Decisões técnicas

### Sub-projetos (hierarquia de 1 nível)
Apenas projetos raiz (`parent_id === null`) aparecem no grid principal. Sub-projetos são listados compactamente dentro do card do pai. Nesting mais profundo não é suportado (proteção via `isAncestor()`).

### Drag-and-drop
HTML5 nativo — `draggable="true"` + eventos `dragstart/dragover/dragleave/drop`. `body.classList.add('is-dragging')` ativa a zona de drop para raiz. `isAncestor()` impede loops circulares.

### Datas (timezone-safe)
```js
const [y,m,d] = iso.slice(0,10).split('-')
task.due_at = new Date(dv + 'T12:00:00').toISOString()
```

### Upload de arquivos (async-safe)
Dentro do `onload` do FileReader, ler localStorage diretamente — não usar `state.documents`.

### Links em Documentos
Salvos com `kind:'link'`, `url:'...'`, `data:null`. Render checa `doc.kind==='link'` para abrir em nova aba.

---

## Histórico de commits recentes

<!-- AUTO-UPDATED BELOW -->
- `91567ed` · 2026-10-05 06:16 — fix: drag-and-drop com suporte correto ao Safari
- `b349740` · 2026-10-05 06:14 — fix: botão + Sub-projeto funcional; remove drag-and-drop (não suportado no Safari)
- `7682ba5` · 2026-10-05 06:10 — feat: sub-projetos com drag-and-drop e hierarquia pai/filho
