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
# 2. Sincronizar com Vercel
cp axis-personal.html public/index.html
git add axis-personal.html public/index.html CONTEXT.md
git commit -m "feat/fix: descrição"
git push origin main
# 3. Abrir no Safari
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
| `axis_projects` | Array de projetos |
| `axis_tasks` | Array de tarefas |
| `axis_messages` | Array de conversas |
| `axis_documents` | Array de documentos (base64) e links |

---

## Assets estáticos

| Arquivo | Uso |
|---------|-----|
| `public/axis-icon.png` | Ícone crystal na sidebar (logo) |
| `public/axis-bg.png` | Background espacial (opacity 18%) |

---

## Estrutura do `axis-personal.html`

```
<head>
  <style>        → CSS completo (variáveis, componentes, telas)
</head>
<body>
  sidebar        → nav: Dashboard, Hoje, Calendário + logo crystal + tema toggle
  screen-dashboard  → grid de projetos com cards clicáveis
  screen-today      → tarefas abertas agrupadas por projeto, separadas por linhas
  screen-calendar   → grade mensal com chips de tarefas por data de prazo, nav ← →
  screen-project    → detalhe do projeto (tabs: Visão geral, Tarefas, Conversas, Documentos)
  dialogs           → Nova conversa, Editar conversa, Inserir link, Novo projeto, Editar tarefa
  preview-overlay   → preview de documentos (imagem, PDF, CSV, TXT)
  <script>       → STORE, renders, dialogs, upload, calendário
</body>
```

---

## Funcionalidades implementadas

- [x] Grid de projetos com cards clicáveis e badge "Novidade" 24h
- [x] Paleta de 16 cores ao criar projeto
- [x] Título do projeto editável inline (clique no nome → input → Enter salva)
- [x] Detalhe do projeto com 4 tabs: Visão geral, Tarefas, Conversas, Documentos
- [x] Tabela de tarefas com colunas: título, início, prazo, countdown chip, prioridade
- [x] Edição de tarefa: título, descrição, data de início, prazo, prioridade
- [x] Tela Hoje: todas as tarefas abertas agrupadas por projeto com divisores suaves
- [x] Calendário mensal com chips de tarefas por data de prazo, navegação ← →
- [x] Upload de documentos (imagem, PDF, CSV, TXT) com preview in-app, toggle galeria/lista
- [x] Inserção de links em Documentos (planilhas, URLs externas) com ícone 🔗
- [x] Conversas por projeto: inserção, edição, exclusão
- [x] Extração automática de tarefas ao salvar conversa (cada linha >15 chars vira tarefa)
- [x] Tema dark/light
- [x] Ícone crystal na sidebar (PNG real, proporção vertical correta)
- [x] Background espacial (Terra ao amanhecer, opacity 18%)

---

## Decisões técnicas

### Datas (timezone-safe)
```js
// Parse — nunca new Date('YYYY-MM-DD') que vai UTC e muda o dia
const [y,m,d] = iso.slice(0,10).split('-')
// Salvar sempre com T12:00:00
task.due_at = new Date(dv + 'T12:00:00').toISOString()
```

### Upload de arquivos (async-safe)
Dentro do `onload` do FileReader, ler o localStorage diretamente — não usar `state.documents` para evitar race condition entre uploads simultâneos.

### Links em Documentos
Salvos em `axis_documents` com `kind:'link'`, `url: '...'`, `data: null`. O render checa `doc.kind === 'link'` para exibir 🔗 e abrir em nova aba.

---

## Histórico de commits recentes

<!-- AUTO-UPDATED BELOW -->
