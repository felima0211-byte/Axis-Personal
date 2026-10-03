'use client'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  async function handleLogout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }
  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300"
    >
      Sair
    </button>
  )
}
