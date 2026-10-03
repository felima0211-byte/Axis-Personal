import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, supabase, error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
  return { user, supabase, error: null }
}
