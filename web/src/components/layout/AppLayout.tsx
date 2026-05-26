import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Tooltip, Modal } from 'antd'
import { useAuthStore } from '@/store/authStore'
import { usePermission } from '@/hooks/usePermission'
import styles from './AppLayout.module.css'
import {
  LayoutDashboard, ShoppingCart, Package, ArrowLeftRight,
  Truck, Wallet, CreditCard, Users, Tag, UserCog,
  BarChart3, LogOut, ChevronRight, PanelLeftClose, PanelLeftOpen,
  ShieldCheck, ClipboardList, User, Info, Camera, Menu, X,
} from 'lucide-react'

const menuItems = [
  {
    label: 'Principal',
    items: [
      { key: '/',                icon: LayoutDashboard, label: 'Dashboard',      permission: null },
      { key: '/orders',          icon: ShoppingCart,    label: 'Pedidos',        permission: 'order:read' },
    ],
  },
  {
    label: 'Estoque',
    items: [
      { key: '/products',        icon: Package,         label: 'Produtos',       permission: 'product:read' },
      { key: '/stock',           icon: ArrowLeftRight,  label: 'Movimentações',  permission: 'product:read' },
      { key: '/purchase-orders', icon: Truck,           label: 'Compras',        permission: 'purchase:read' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { key: '/cash-register',   icon: Wallet,          label: 'Caixa',          permission: 'cash:read' },
      { key: '/payments',        icon: CreditCard,      label: 'Pagamentos',     permission: 'cash:read' },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { key: '/persons',         icon: Users,           label: 'Pessoas',        permission: 'person:read' },
      { key: '/categories',      icon: Tag,             label: 'Categorias',     permission: 'category:read' },
      { key: '/users',           icon: UserCog,         label: 'Usuários',       permission: 'user:read' },
      { key: '/cargos',          icon: ShieldCheck,     label: 'Cargos',         permission: 'admin' },
    ],
  },
  {
    label: 'Relatórios',
    items: [
      { key: '/reports',         icon: BarChart3,       label: 'Relatórios',     permission: 'report:read' },
      { key: '/audit-logs',      icon: ClipboardList,   label: 'Logs',           permission: 'admin' },
    ],
  },
]

const pageMeta: Record<string, { title: string; sub: string }> = {
  '/':                { title: 'Dashboard',         sub: 'Visão geral do sistema' },
  '/orders':          { title: 'Pedidos',           sub: 'Gestão de pedidos de venda' },
  '/products':        { title: 'Produtos',          sub: 'Catálogo de tecidos' },
  '/products/new':    { title: 'Novo Produto',      sub: 'Cadastrar produto no catálogo' },
  '/stock':           { title: 'Movimentações',     sub: 'Controle de estoque' },
  '/purchase-orders': { title: 'Compras',           sub: 'Pedidos de compra' },
  '/cash-register':   { title: 'Caixa',             sub: 'Controle de caixa' },
  '/payments':        { title: 'Pagamentos',        sub: 'Registros de recebimento' },
  '/payments/new':    { title: 'Novo Pagamento',    sub: 'Registrar recebimento' },
  '/persons':         { title: 'Pessoas',           sub: 'Clientes, fornecedores e colaboradores' },
  '/categories':      { title: 'Categorias',        sub: 'Tipos de produto' },
  '/users':           { title: 'Usuários',          sub: 'Controle de acesso ao sistema' },
  '/profile':         { title: 'Meu Perfil',        sub: 'Editar nome e senha da sua conta' },
  '/cargos':          { title: 'Cargos',            sub: 'Gerenciamento de permissões por cargo' },
  '/audit-logs':      { title: 'Logs de Auditoria', sub: 'Histórico de ações do sistema' },
  '/reports':         { title: 'Relatórios',        sub: 'Análises gerenciais' },
}

function getPageMeta(pathname: string) {
  if (pageMeta[pathname]) return pageMeta[pathname]
  if (pathname.startsWith('/products/')) return { title: 'Produto', sub: 'Editar produto do catálogo' }
  return { title: 'TecnoSinapse', sub: '' }
}

const COLLAPSE_KEY   = 'sidebar_collapsed'
const AVATAR_KEY     = 'ts-avatar'
const FULL_SCREEN_ROUTES = ['/orders']

export default function AppLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, clearAuth } = useAuthStore()
  const { has, isAdmin } = usePermission()
  const [hovered,        setHovered]        = useState<string | null>(null)
  const [collapsed,      setCollapsed]      = useState(() => {
    const saved = localStorage.getItem(COLLAPSE_KEY)
    if (saved !== null) return saved === 'true'
    return FULL_SCREEN_ROUTES.includes(location.pathname)
  })
  const [mobileOpen,     setMobileOpen]     = useState(false)
  const [dropdownOpen,   setDropdownOpen]   = useState(false)
  const [aboutOpen,      setAboutOpen]      = useState(false)
  const [avatarUrl,      setAvatarUrl]      = useState<string | null>(
    () => localStorage.getItem(AVATAR_KEY)
  )
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (FULL_SCREEN_ROUTES.includes(location.pathname) && !collapsed) {
      setCollapsed(true)
      localStorage.setItem(COLLAPSE_KEY, 'true')
    }
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSE_KEY, String(next))
  }

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      setAvatarUrl(url)
      localStorage.setItem(AVATAR_KEY, url)
    }
    reader.readAsDataURL(file)
    setDropdownOpen(false)
  }

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  const canSeeItem = (permission: string | null): boolean => {
    if (permission === null) return true
    if (permission === 'admin') return isAdmin
    return isAdmin || has(permission)
  }

  const meta = getPageMeta(location.pathname)
  const effectiveCollapsed = collapsed && !mobileOpen

  return (
    <div className={styles.root}>

      {mobileOpen && (
        <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${mobileOpen ? styles.sidebarMobileOpen : ''}`}>
        <div className={styles.sidebarLogo} onClick={() => navigate('/')}>
          {effectiveCollapsed ? (
            <img src="/Logo.png" alt="TecnoSinapse" className={styles.logoImgCollapsed} />
          ) : (
            <div className={styles.logoExpanded}>
              <img src="/Logo.png" alt="TecnoSinapse" className={styles.logoImgCollapsed} />
              <span className={styles.logoExpandedText}>Tecno<span>Sinapse</span></span>
            </div>
          )}
        </div>

        <nav className={styles.sidebarMenu}>
          {menuItems.map((group) => {
            const visibleItems = group.items.filter(item => canSeeItem(item.permission))
            if (visibleItems.length === 0) return null
            return (
              <div key={group.label}>
                {!effectiveCollapsed && <div className={styles.menuLabel}>{group.label}</div>}
                {effectiveCollapsed && <div className={styles.menuLabelDot} />}
                {visibleItems.map((item) => {
                  const Icon     = item.icon
                  const isActive = item.key === '/'
                    ? location.pathname === '/'
                    : location.pathname === item.key || location.pathname.startsWith(item.key + '/')
                  const isHov    = hovered === item.key

                  const menuEl = (
                    <div
                      key={item.key}
                      className={`${styles.menuItem} ${isActive ? styles.active : ''} ${effectiveCollapsed ? styles.menuItemCollapsed : ''}`}
                      onClick={() => navigate(item.key)}
                      onMouseEnter={() => setHovered(item.key)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <Icon size={15} className={styles.menuIcon} />
                      {!effectiveCollapsed && <span className={styles.menuLabel2}>{item.label}</span>}
                      {!effectiveCollapsed && (isActive || isHov) && <ChevronRight size={11} className={styles.chevron} />}
                    </div>
                  )

                  return effectiveCollapsed ? (
                    <Tooltip key={item.key} title={item.label} placement="right">
                      {menuEl}
                    </Tooltip>
                  ) : menuEl
                })}
              </div>
            )
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.collapseBtn} onClick={toggleCollapse} title={collapsed ? 'Expandir menu' : 'Recolher menu'}>
            {effectiveCollapsed
              ? <PanelLeftOpen  size={14} />
              : <><PanelLeftClose size={14} /><span>Recolher</span></>
            }
          </button>
          {!effectiveCollapsed && (
            <div className={styles.logoutBtn} onClick={handleLogout}>
              <LogOut size={13} />
              <span>Sair do sistema</span>
            </div>
          )}
          {effectiveCollapsed && (
            <Tooltip title="Sair do sistema" placement="right">
              <div className={styles.logoutBtnIcon} onClick={handleLogout}>
                <LogOut size={13} />
              </div>
            </Tooltip>
          )}
          {!effectiveCollapsed && <div className={styles.version}>v1.0.0 · TecnoSinapse</div>}
        </div>
      </aside>

      <div className={`${styles.main} ${collapsed ? styles.mainCollapsed : ''}`}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button className={styles.hamburger} onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h1 className={styles.topbarTitle}>{meta.title}</h1>
              <p className={styles.topbarSub}>{meta.sub}</p>
            </div>
          </div>

          <div className={styles.topbarUser} ref={dropdownRef}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name ?? 'Usuário'}</span>
              <span className={styles.userRole}>{user?.cargoName ?? user?.role ?? ''}</span>
            </div>

            <div
              className={`${styles.avatarWrap} ${dropdownOpen ? styles.avatarWrapOpen : ''}`}
              onClick={() => setDropdownOpen(o => !o)}
            >
              {avatarUrl ? (
                <img src={avatarUrl} className={styles.avatarImg} alt="avatar" />
              ) : (
                <div className={styles.avatar}>{getInitials(user?.name ?? 'U')}</div>
              )}
            </div>

            {dropdownOpen && (
              <div className={styles.profileDropdown}>
                <div className={styles.profileDropdownHeader}>
                  <div className={styles.profileDropdownName}>{user?.name}</div>
                  <div className={styles.profileDropdownRole}>{user?.cargoName ?? user?.role}</div>
                </div>
                <div className={styles.profileDropdownDivider} />
                <button
                  className={styles.profileDropdownItem}
                  onClick={() => { fileInputRef.current?.click() }}
                >
                  <Camera size={14} /> Alterar foto
                </button>
                <button
                  className={styles.profileDropdownItem}
                  onClick={() => { setDropdownOpen(false); navigate('/profile') }}
                >
                  <User size={14} /> Meu perfil
                </button>
                <div className={styles.profileDropdownDivider} />
                <button
                  className={styles.profileDropdownItem}
                  onClick={() => { setDropdownOpen(false); setAboutOpen(true) }}
                >
                  <Info size={14} /> Sobre o sistema
                </button>
                <button
                  className={`${styles.profileDropdownItem} ${styles.profileDropdownItemDanger}`}
                  onClick={handleLogout}
                >
                  <LogOut size={14} /> Sair
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      <Modal
        open={aboutOpen}
        onCancel={() => setAboutOpen(false)}
        footer={null}
        title="Sobre o Sistema"
        centered
        width={400}
      >
        <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
          <div style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 22, fontWeight: 900, color: '#042C53', marginBottom: 4 }}>
            Tecno<span style={{ color: '#378ADD' }}>Sinapse</span>
          </div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Gestão de Tecidos · v1.0.0</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
            Sistema integrado para gestão de pedidos, estoque, financeiro e relatórios de loja de tecidos.
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: '#aaa' }}>
            Desenvolvido por TecnoSinapse © 2025
          </div>
        </div>
      </Modal>
    </div>
  )
}
