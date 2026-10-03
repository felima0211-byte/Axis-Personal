import { redirect } from 'next/navigation'

export default function Home() {
  // All protected routes go here; middleware ensures AAL2 before reaching this
  redirect('/dashboard')
}
