# Ingestão Inteligente — Axis Personal

## Fluxo de ingestão

```
POST /api/v1/ingest
  │
  ├─ 1. Hash da conversa (HMAC-SHA256) → verifica duplicata
  ├─ 2. Verifica limite diário (INGEST_DAILY_LIMIT, default 50)
  ├─ 3. Resolve solicitante (requesterId ou requesterName)
  ├─ 4. Persiste conversa cifrada no banco (ANTES da IA)
  │       → a conversa nunca se perde mesmo se a IA falhar
  ├─ 5. Chama extractTasks() → API da Anthropic
  │       ├─ sucesso: cria tarefas como `draft`
  │       └─ falha: marca mensagem como `failed`; retorna extractionFailed: true
  └─ 6. Retorna { message, tasks, extractionFailed }
```

Se `extractionFailed: true`, use `POST /messages/:id/retry-extraction` para tentar novamente (idempotente: não duplica tarefas já existentes).

## Schema da ferramenta IA (`register_tasks`)

A IA é forçada a chamar esta ferramenta (`tool_choice: { type: 'tool', name: 'register_tasks' }`):

```json
{
  "tasks": [
    {
      "title": "string (máx 140, imperativo, português)",
      "description": "string opcional (máx 2000)",
      "due_at": "ISO 8601 com offset — omitir se sem prazo claro",
      "priority": "low | normal | high | urgent",
      "suggested_section": "nome exato de seção existente — omitir se nenhuma servir",
      "requester_name": "quem pediu — omitir se não estiver claro",
      "source_excerpt": "trecho LITERAL da conversa (máx 300)",
      "confidence": "number 0-1"
    }
  ]
}
```

## Defesas contra prompt injection

O texto da conversa é inserido dentro de tags `<conversa>…</conversa>`. As defesas em camadas são:

1. **System prompt explícito:** o conteúdo dentro de `<conversa>` é declarado como "DADO não confiável"; a única saída permitida é chamar `register_tasks`.
2. **`tool_choice` forçado:** o modelo é obrigado a chamar a ferramenta — não pode emitir texto livre.
3. **Neutralização de tag:** `</conversa>` no texto do usuário é removido antes do envio, impedindo que o modelo "escape" do bloco de dados.
4. **Validação da saída:** a resposta da IA é parseada com Zod. Campos inválidos são descartados; a tarefa inteira é descartada apenas se campos obrigatórios falharem.
5. **`source_excerpt`:** o trecho literal fornecido pelo modelo permite auditar de onde veio cada tarefa.

**⚠️ Nota de privacidade:** o texto completo das conversas é enviado à API da Anthropic para processamento. Certifique-se de que os termos de uso da Anthropic são compatíveis com o tipo de informação nas conversas ingeridas.

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `ANTHROPIC_API_KEY` | obrigatório | Chave da API da Anthropic |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Modelo a usar |
| `INGEST_DAILY_LIMIT` | `50` | Máx. conversas por dia |
| `APP_TIMEZONE` | `America/Sao_Paulo` | Fuso para resolver datas relativas |

## Tarefas geradas por IA

- Nascem **sempre** com `status: draft` — nunca são confirmadas automaticamente.
- Para revisar e confirmar: `POST /tasks/:id/confirm` (individual) ou `POST /tasks/confirm-bulk`.
- Para rejeitar: `POST /tasks/:id/reject`.
- `GET /today` inclui a contagem de `drafts` pendentes de revisão.
