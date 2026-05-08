import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import styles from './AppLayout.module.css'
import {
  LayoutDashboard, ShoppingCart, Package, ArrowLeftRight,
  Truck, Wallet, CreditCard, Users, Tag, UserCog,
  BarChart3, Scissors, LogOut, ChevronRight,
} from 'lucide-react'

const menuItems = [
  {
    label: 'Principal',
    items: [
      { key: '/',                icon: LayoutDashboard, label: 'Dashboard',      desc: 'Visão geral' },
      { key: '/orders',          icon: ShoppingCart,    label: 'Pedidos',        desc: 'Gestão de pedidos' },
    ],
  },
  {
    label: 'Estoque',
    items: [
      { key: '/products',        icon: Package,         label: 'Produtos',       desc: 'Catálogo de tecidos' },
      { key: '/stock',           icon: ArrowLeftRight,  label: 'Movimentações',  desc: 'Entradas e saídas' },
      { key: '/purchase-orders', icon: Truck,           label: 'Compras',        desc: 'Pedidos de compra' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { key: '/cash-register',   icon: Wallet,          label: 'Caixa',          desc: 'Controle de caixa' },
      { key: '/payments',        icon: CreditCard,      label: 'Pagamentos',     desc: 'Recebimentos' },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { key: '/persons',         icon: Users,           label: 'Pessoas',        desc: 'Clientes e fornecedores' },
      { key: '/categories',      icon: Tag,             label: 'Categorias',     desc: 'Tipos de produto' },
      { key: '/users',           icon: UserCog,         label: 'Usuários',       desc: 'Controle de acesso' },
    ],
  },
  {
    label: 'Relatórios',
    items: [
      { key: '/reports',         icon: BarChart3,       label: 'Relatórios',     desc: 'Análises gerenciais' },
    ],
  },
]

const pageMeta: Record<string, { title: string; sub: string }> = {
  '/':                { title: 'Dashboard',         sub: 'Visão geral do sistema' },
  '/orders':          { title: 'Pedidos',           sub: 'Gestão de pedidos de venda' },
  '/products':        { title: 'Produtos',          sub: 'Catálogo de tecidos' },
  '/stock':           { title: 'Movimentações',     sub: 'Controle de estoque' },
  '/purchase-orders': { title: 'Compras',           sub: 'Pedidos de compra' },
  '/cash-register':   { title: 'Caixa',             sub: 'Controle de caixa' },
  '/payments':        { title: 'Pagamentos',        sub: 'Registros de recebimento' },
  '/persons':         { title: 'Pessoas',           sub: 'Clientes, fornecedores e colaboradores' },
  '/categories':      { title: 'Categorias',        sub: 'Tipos de produto' },
  '/users':           { title: 'Usuários',          sub: 'Controle de acesso ao sistema' },
  '/reports':         { title: 'Relatórios',        sub: 'Análises gerenciais' },
}

export default function AppLayout() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { user, clearAuth } = useAuthStore()
  const [hovered, setHovered] = useState<string | null>(null)

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  const meta = pageMeta[location.pathname] ?? { title: 'TecnoSinapse', sub: '' }

  return (
    <div className={styles.root}>

      {/* ── Sidebar ──────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo} onClick={() => navigate('/')}>
          <div className={styles.logoText}>Tecno<span>Sinapse</span></div>
          <p className={styles.logoSub}>Gestão de Tecidos</p>
        </div>

        <nav className={styles.sidebarMenu}>
          {menuItems.map((group) => (
            <div key={group.label}>
              <div className={styles.menuLabel}>{group.label}</div>
              {group.items.map((item) => {
                const Icon     = item.icon
                const isActive = location.pathname === item.key
                const isHov    = hovered === item.key
                return (
                  <div
                    key={item.key}
                    className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                    onClick={() => navigate(item.key)}
                    onMouseEnter={() => setHovered(item.key)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <Icon size={15} className={styles.menuIcon} />
                    <span className={styles.menuLabel2}>{item.label}</span>
                    {(isActive || isHov) && <ChevronRight size={11} className={styles.chevron} />}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={13} />
            <span>Sair do sistema</span>
          </div>
          <div className={styles.version}>v1.0.0 · TecnoSinapse</div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────── */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.topbarTitle}>{meta.title}</h1>
            <p className={styles.topbarSub}>{meta.sub}</p>
          </div>
          <div className={styles.topbarUser}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name ?? 'Usuário'}</span>
              <span className={styles.userRole}>{user?.role ?? ''}</span>
            </div>
            <div className={styles.avatar}>{getInitials(user?.name ?? 'U')}</div>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}