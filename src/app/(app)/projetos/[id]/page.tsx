import ProjetoScreen from '@/components/screens/ProjetoScreen'
export default async function ProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProjetoScreen id={id} />
}
