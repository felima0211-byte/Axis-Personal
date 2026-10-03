# Arquivos e Google Sheets — Axis Personal

## Tipos de arquivo permitidos (upload)

| Extensão | MIME type |
|---|---|
| pdf | application/pdf |
| docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| pptx | application/vnd.openxmlformats-officedocument.presentationml.presentation |
| csv | text/csv |
| txt | text/plain |
| md | text/markdown |
| png, jpg, jpeg, webp | image/png, image/jpeg, image/webp |

Qualquer outro tipo (html, svg, js, executáveis, compactados) é recusado.

## Limites

| Variável | Padrão | Descrição |
|---|---|---|
| `UPLOAD_MAX_MB` | 25 | Tamanho máximo de upload em MB |
| `SHEETS_MAX_ROWS` | 5000 | Máx. linhas sincronizadas por planilha |
| `SHEETS_MAX_COLS` | 30 | Máx. colunas sincronizadas por planilha |

## Fluxo de upload

1. **Solicitar URL:** `POST /api/v1/projects/:id/files/upload-url` com `{ name, mimeType, size }`
   - Servidor valida tipo e tamanho antes de gerar a URL
   - Retorna `{ fileId, path, token }` (signed upload URL do Supabase Storage)
2. **Enviar arquivo:** `PUT` direto para a Storage URL (não passa pelo servidor Next.js)
3. **Confirmar:** `POST /api/v1/projects/:id/files/confirm` com `{ fileId, name, mimeType, size }`
   - Servidor verifica que o objeto existe no Storage
   - Cria a linha em `project_files` com o nome cifrado

## Fluxo de download

- `GET /api/v1/files/:id/download` retorna `{ url }` (URL assinada de 60 segundos com `download` forçado)
- Cada download é registrado no `audit_log`
- Conteúdo de arquivo **não tem cifragem em nível de aplicação** — apenas a do provedor Supabase (AES-256 em repouso). Pode ser reavaliado para arquivos muito sensíveis.

## Nomes de arquivo

- Sanitizados (sem caminhos, sem caracteres de controle, até 150 caracteres)
- Armazenados **cifrados** em `name_enc` (AES-256-GCM, mesma chave dos outros campos sensíveis)
- O caminho no Storage usa apenas UUIDs: `{userId}/{projectId}/{fileId}`

## Google Sheets — OAuth

### Escopos

```
https://www.googleapis.com/auth/spreadsheets.readonly
```

Somente leitura. O app **nunca** escreve nas planilhas.

### Fluxo de conexão (Authorization Code com PKCE)

1. `GET /api/v1/integrations/google` — gera PKCE (code_verifier no cookie httpOnly), assina o state (HMAC-SHA256), redireciona para Google
2. `GET /api/v1/integrations/google/callback` — valida state + PKCE, troca código por tokens, cifra o refresh token e salva em `google_connections`
3. Access token fica **apenas em memória** durante a sincronização. Nunca é persistido.

### Revogação

`DELETE /api/v1/integrations/google`:
1. Obtém um access token novo
2. Chama `https://oauth2.googleapis.com/revoke`
3. Apaga a linha em `google_connections`
4. Marca todos os arquivos google_sheet do usuário como `disconnected`

### `invalid_grant`

Se o refresh token expirar ou for revogado pelo Google, a conexão é marcada como `needs_reconnect` e a interface exibe o botão "Reconectar".

**Nota:** em modo de teste no Google Cloud, refresh tokens expiram em ~7 dias. Publique o app para uso pessoal sem essa limitação.

## O que é cifrado

| Dado | Onde | Cifrado? |
|---|---|---|
| Nome do arquivo | `project_files.name_enc` | Sim (AES-256-GCM) |
| E-mail Google | `google_connections.google_email_enc` | Sim |
| Refresh token | `google_connections.refresh_token_enc` | Sim |
| Cabeçalhos da planilha | `sheet_snapshots.headers_enc` | Sim (via `encryptJson`) |
| Linhas da planilha | `sheet_snapshots.rows_enc` | Sim (via `encryptJson`) |
| Conteúdo de uploads | Supabase Storage | Apenas pelo provedor |
| Access token | — | Nunca persistido |

## Sincronização de planilhas

1. `POST /api/v1/files/:id/sync` (rate limit: 3/min por arquivo) — sincroniza imediatamente
2. Cron a cada hora (`/api/cron/sheets-sync`) — sincroniza todas as planilhas ativas

### Comportamento

- Se o `content_hash` não mudou, o snapshot **não é regravado**
- Em caso de erro, o **último snapshot bom é preservado** — a interface mostra "dados de DD/MM às HH:MM"
- Lock por arquivo: nunca sincroniza o mesmo arquivo em paralelo
- Backoff em HTTP 429 do Google (aguarda 5 s e retenta uma vez)

### Inferência de tipo de coluna

Cada coluna é classificada automaticamente: `texto`, `número`, `moeda_brl`, `percentual`, `data`, `booleano`.

Critérios:
- `moeda_brl`: `R$ 1.234,56`
- `percentual`: `12,5%`
- `data`: `31/12/2026`
- `booleano`: `sim`, `não`, `true`, `false`
- `número`: valores numéricos com ponto ou vírgula

## Cron

`POST /api/cron/sheets-sync` — protegido por `Authorization: Bearer ${CRON_SECRET}` com comparação em tempo constante.

Configurado em `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/sheets-sync", "schedule": "0 * * * *" }] }
```

**Nota:** planos gratuitos do Vercel limitam crons a uma vez por dia.

## Como revogar o acesso manualmente

1. Acesse [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
2. Encontre "Axis Personal" e clique em "Remover acesso"
3. No app, vá em Configurações > Integrações e clique em "Desconectar"

## Limpeza de uploads órfãos

Objetos enviados para o Storage mas nunca confirmados (aba fechada no meio) são apagados pelo cron quando têm mais de 1 hora sem linha correspondente em `project_files`.
