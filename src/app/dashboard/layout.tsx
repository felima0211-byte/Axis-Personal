import { AppShell } from '@/components/layout/AppShell'
import { RealtimeInit } from '@/components/RealtimeInit'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <RealtimeInit />
      {children}
    </AppShell>
  )
}
