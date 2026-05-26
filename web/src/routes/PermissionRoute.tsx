import { Navigate, Outlet } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'

interface Props {
  permission: string | 'admin' | null
}

export default function PermissionRoute({ permission }: Props) {
  const { has, isAdmin } = usePermission()

  if (permission === null) return <Outlet />
  if (permission === 'admin' && !isAdmin) return <AccessDenied />
  if (permission !== 'admin' && !isAdmin && !has(permission)) return <AccessDenied />

  return <Outlet />
}

function AccessDenied() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 16,
      color: '#042C53',
      fontFamily: "'Exo 2', sans-serif",
    }}>
      <ShieldOff size={48} strokeWidth={1.5} color="#378ADD" />
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Acesso negado</h2>
      <p style={{ fontSize: 13, fontWeight: 300, color: '#888', margin: 0, textAlign: 'center', maxWidth: 320 }}>
        Você não tem permissão para acessar esta página.<br />
        Entre em contato com o administrador do sistema.
      </p>
      <a
        href="/"
        style={{ marginTop: 8, fontSize: 13, color: '#378ADD', textDecoration: 'none', fontWeight: 600 }}
      >
        ← Voltar ao início
      </a>
    </div>
  )
}
