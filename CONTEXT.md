# Axis Personal — Contexto do Projeto

> Atualizado automaticamente a cada commit via `.git/hooks/post-commit`

---

## O que é

Dashboard pessoal single-owner. **Um único arquivo HTML** (`axis-personal.html`) que roda localmente via `file://` no Safari. Zero backend, zero login — tudo persiste em `localStorage`.

## Como abrir

```bash
open -a Safari /Users/Fe/laboratorio-produtos/axis-personal/axis-personal.html
```

> **Importante:** nunca mover o arquivo de pasta — o `localStorage` é vinculado ao path `file://`. Mover = dados somem.

---

## Arquitetura

| Camada | Tecnologia |
|--------|-----------|
| UI | HTML + CSS custom properties (dark/light theme) |
| Estado | `localStorage` (sem Supabase, sem servidor) |
| Build | Nenhum — arquivo único, abre direto |

### Chaves do localStorage

| Chave | Conteúdo |
|-------|----------|
| `axis_projects` | Array de projetos |
| `axis_tasks` | Array de tarefas |
| `axis_messages` | Array de conversas |
| `axis_documents` | Array de documentos (base64) |

---

## Estrutura do arquivo `axis-personal.html`

```
<head>
  <style>        → CSS completo (variáveis, componentes, telas)
</head>
<body>
  sidebar        → nav: Dashboard, Hoje, Calendário
  screen-dashboard  → grid de projetos
  screen-today      → tarefas abertas agrupadas por projeto
  screen-calendar   → grade mensal com chips de tarefas
  screen-project    → detalhe do projeto (tabs: Visão geral, Tarefas, Conversas, Documentos)
  dialogs           → Nova conversa, Editar conversa, Novo projeto, Editar tarefa
  preview-overlay   → preview de documentos (imagem, PDF, CSV, TXT)
  <script>       → todo o JS (STORE, renderização, dialogs, upload)
</script>
</body>
```

---

## Funcionalidades implementadas

- [x] Grid de projetos com cards clicáveis
- [x] Detalhe do projeto com 4 tabs: Visão geral, Tarefas, Conversas, Documentos
- [x] Tabela de tarefas com colunas: título, início, prazo, countdown chip, prioridade
- [x] Edição de tarefa: título, descrição, data de início, prazo, prioridade
- [x] Tela Hoje: todas as tarefas abertas agrupadas por projeto, separadas por linhas suaves
- [x] Calendário mensal com chips de tarefas plotados por data de prazo, navegação ← →
- [x] Upload de documentos (imagem, PDF, CSV, TXT) com preview in-app e toggle lista/galeria
- [x] Conversas por projeto: inserção, edição e exclusão
- [x] Tema dark/light
- [x] Badge "Novidade" com TTL 24h nos cards

---

## Decisões técnicas importantes

### Datas (timezone-safe)
```js
// Parse sempre assim — nunca new Date('YYYY-MM-DD') que vai UTC e muda o dia
const [y,m,d] = iso.slice(0,10).split('-')
const dt = new Date(+y, +m-1, +d)

// Salvar sempre com T12:00:00 para ancorar ao meio-dia
task.due_at = new Date(dv + 'T12:00:00').toISOString()
```

### Upload de arquivos (async-safe)
O FileReader é assíncrono. Dentro do `onload`, **ler o localStorage diretamente** (não usar `state.documents`) para evitar race condition entre múltiplos uploads simultâneos.

### Nunca usar
```js
localStorage.clear()       // ← destrói todos os dados do usuário
document.body.innerHTML = // ← nunca substituir o body inteiro
```

---

## Histórico de commits recentes

<!-- AUTO-UPDATED BELOW -->
