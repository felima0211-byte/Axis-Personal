import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from './logout-button'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Axis Personal</h1>
      <p className="text-gray-400">Bem-vindo, {session.user.email}</p>
      <LogoutButton />
    </main>
  )
}
