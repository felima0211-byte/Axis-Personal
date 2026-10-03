# API — Axis Personal

Todas as rotas exigem sessão autenticada com AAL2 (MFA TOTP), exceto `/api/v1/health`.

**Base URL:** `/api/v1`  
**Autenticação:** Cookie de sessão Supabase (AAL2)  
**Rate limit geral:** 60 req/min por usuário  
**Formato:** JSON (`Content-Type: application/json` em POST/PATCH)  
**CSRF:** POST/PATCH/DELETE exigem `Origin` igual ao host da aplicação

## Códigos de erro

| Código | HTTP | Descrição |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Sem sessão ou AAL2 não satisfeito |
| `FORBIDDEN` | 403 | E-mail não é o dono ou CSRF |
| `NOT_FOUND` | 404 | Recurso inexistente |
| `VALIDATION_ERROR` | 422 | Schema inválido |
| `RATE_LIMITED` | 429 | Limite atingido; ver `Retry-After` |
| `CONFLICT` | 409 | Duplicata ou transição inválida |
| `PAYLOAD_TOO_LARGE` | 413 | Corpo > 1 MB |
| `INTERNAL` | 500 | Erro interno (sem detalhes expostos) |

Todas as respostas de erro têm `Cache-Control: no-store` e `X-Request-Id`.

---

## Health

### `GET /health`
Público. Verifica se a aplicação está viva.

**Resposta:** `{ ok: true }`

---

## Seções

### `GET /sections`
Lista seções não-arquivadas, ordenadas por `sort_order`.

**Resposta:** `{ items: Section[], nextCursor: null }`

### `POST /sections`
**Body:** `{ name, color?, kind?, sortOrder? }`  
**Status:** 201  
**Resposta:** `Section`

### `GET /sections/:id`
### `PATCH /sections/:id`
**Body:** `{ name?, color?, kind?, sortOrder?, archived? }`

### `DELETE /sections/:id`
Arquiva a seção (não exclui).

---

## Solicitantes

### `GET /requesters?name=&limit=25&cursor=`
Busca por nome exato (blind index). Pagina por cursor.

### `POST /requesters`
**Body:** `{ name, notes? }`  **Status:** 201

### `GET /requesters/:id`
### `PATCH /requesters/:id`
**Body:** `{ name?, notes? }`

### `DELETE /requesters/:id`
Arquiva.

---

## Tarefas

### `GET /tasks?status=&priority=&section_id=&requester_id=&due_from=&due_to=&limit=25&cursor=`
`status` e `priority` aceitam listas separadas por vírgula.

### `POST /tasks`
**Body:** `{ title, description?, sectionId?, requesterId?, priority?, dueAt?, status? }`  
**Status:** 201

### `GET /tasks/:id`
### `PATCH /tasks/:id`
**Body:** `{ title?, description?, sectionId?, requesterId?, priority?, dueAt?, status? }`

Transições de status permitidas:
- `draft` → `confirmed`, `archived`
- `confirmed` → `in_progress`, `done`, `archived`
- `in_progress` → `confirmed`, `done`, `archived`
- `done` → `in_progress`, `archived`
- `archived` → (nenhuma)

### `DELETE /tasks/:id`
Arquiva.

### `POST /tasks/:id/confirm`
**Body (opcional):** `{ title?, dueAt?, sectionId?, priority? }`  
Confirma um rascunho. Retorna 409 se não for `draft`.

### `POST /tasks/:id/reject`
Rejeita um rascunho (arquiva). Retorna 409 se não for `draft`.

### `POST /tasks/confirm-bulk`
**Body:** `{ ids: string[] }` (máx 50)  
**Resposta:** `{ confirmed: string[], skipped: string[] }`

---

## Lembretes

### `GET /reminders?remind_from=&remind_to=&include_done=false&limit=25&cursor=`
### `POST /reminders`
**Body:** `{ title, remindAt, taskId?, sectionId?, recurrence? }`  **Status:** 201

### `GET /reminders/:id`
### `PATCH /reminders/:id`
### `DELETE /reminders/:id`
Remove permanentemente.

### `POST /reminders/:id/complete`
Marca como concluído.

---

## Mensagens

### `GET /messages?requester_id=&extraction_status=&limit=25&cursor=`
Retorna apenas metadados (sem o texto da conversa).

### `GET /messages/:id`
Retorna metadados + texto decifrado. Auditado.

### `POST /messages/:id/retry-extraction`
Retenta a extração de tarefas de uma mensagem com status `failed` ou `pending_extraction`.  
Rate limit: 10/min.

---

## Ingestão

### `POST /ingest`
**Body:** `{ text, requesterId?, requesterName?, sectionId?, source }`  
**Status:** 201  
**Rate limit adicional:** 10/min

Fluxo completo: grava a conversa cifrada → chama a IA → cria rascunhos de tarefas.  
Ver [AI-INGESTION.md](AI-INGESTION.md) para detalhes.

**Resposta:**
```json
{
  "message": { "id": "...", "extractionStatus": "extracted", ... },
  "tasks": [...],
  "extractionFailed": false
}
```

---

## Painel do dia

### `GET /today`
Retorna overdue, tarefas do dia (agrupadas por seção), lembretes do dia e contagens.

### `GET /upcoming?until=YYYY-MM-DD`
Retorna tarefas e lembretes agrupados por semana até a data informada (padrão: 31/12 do ano corrente).
