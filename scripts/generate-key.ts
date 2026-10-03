#!/usr/bin/env npx tsx
import { randomBytes } from 'node:crypto'

const key = randomBytes(32).toString('base64')
console.log('\n🔑 Nova chave gerada (32 bytes, base64):')
console.log(key)
console.log('\nInstruções:')
console.log('1. Copie esta chave para o gerenciador de senhas (backup separado do repositório)')
console.log('2. Adicione em ENCRYPTION_KEYS: {"1":"<chave>"} (ou adicione nova versão ao mapa existente)')
console.log('3. Defina ENCRYPTION_ACTIVE_VERSION=1 (ou o número da versão da nova chave)')
console.log('4. Para BLIND_INDEX_KEY, gere uma chave separada rodando este script novamente\n')
