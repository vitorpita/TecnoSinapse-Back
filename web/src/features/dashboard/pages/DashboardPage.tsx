import { useNavigate } from 'react-router-dom'
import { Spin } from 'antd'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid,
         Tooltip, ResponsiveContainer } from 'recharts'
import { ShoppingCart, TrendingUp, Users, Receipt, Plus, BarChart3, Package } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../DashboardService'
import styles from './DashboardPage.module.css'

// Tooltip customizado do gráfico
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipValue}>
        R$ {payload[0].value.toLocaleString('pt-BR')}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()

  // Busca dados reais do dashboard
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
    staleTime: 1000 * 60 * 2, 
  })

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
      }}>
        <Spin size="large" />
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        flexDirection: 'column',
        gap: 16,
        fontFamily: "'Exo 2', sans-serif",
        color: '#E24B4A',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Erro ao carregar dashboard</div>
        <p style={{ fontWeight: 300, color: '#888', fontSize: 12 }}>Tente atualizar a página</p>
      </div>
    )
  }

  const statCards = [
    {
      label:   'Vendas',
      value:   `R$ ${(stats.totalSalesMonth / 1000).toFixed(1)}k`,
      sub:     'Total do mês',
      icon:    TrendingUp,
      color:   '#378ADD',
      accent:  '#378ADD',
    },
    {
      label:   'Vendas Hoje',
      value:   `R$ ${(stats.totalSalesDay / 1000).toFixed(1)}k`,
      sub:     `${stats.ordersDay} pedidos hoje`,
      icon:    ShoppingCart,
      color:   '#1D9E75',
      accent:  '#1D9E75',
    },
    {
      label:   'Ticket Médio',
      value:   `R$ ${stats.averageTicket.toLocaleString('pt-BR')}`,
      sub:     'Por pedido no mês',
      icon:    Receipt,
      color:   '#F59E0B',
      accent:  '#F59E0B',
    },
    {
      label:   'Clientes Ativos',
      value:   String(stats.activeClients),
      sub:     'Compraram este mês',
      icon:    Users,
      color:   '#85B7EB',
      accent:  '#185FA5',
    },
  ]

  const quickActions = [
    {
      icon:  Plus,
      label: 'Nova Venda',
      desc:  'Registrar venda',
      path:  '/orders',
      color: '#042C53',
    },
    {
      icon:  BarChart3,
      label: 'Relatório',
      desc:  'Gerar relatório',
      path:  '/reports',
      color: '#378ADD',
    },
    {
      icon:  Package,
      label: 'Produtos',
      desc:  'Ver catálogo',
      path:  '/products',
      color: '#1D9E75',
    },
    {
      icon:  Users,
      label: 'Clientes',
      desc:  'Gerenciar clientes',
      path:  '/persons',
      color: '#F59E0B',
    },
  ]

  // Formata dados de vendas para o gráfico
  const chartData = stats.salesByDay || []

  return (
    <div className={styles.root}>

      {/* ── Cards ──────────────────────────────── */}
      <div className={styles.cards}>
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={styles.card}
              style={{ borderTopColor: card.accent }}
            >
              <div className={styles.cardTop}>
                <div>
                  <div className={styles.cardLabel}>{card.label}</div>
                  <div className={styles.cardValue}>{card.value}</div>
                </div>
                <div
                  className={styles.cardIcon}
                  style={{ background: `${card.color}18` }}
                >
                  <Icon size={22} color={card.color} />
                </div>
              </div>
              <div className={styles.cardSub}>{card.sub}</div>
            </div>
          )
        })}
      </div>

      {/* ── Gráfico Vendas do Mês ───────────────────── */}
      {chartData.length > 0 ? (
        <div className={styles.chartBox}>
          <div className={styles.chartHeader}>
            <div>
              <h2 className={styles.chartTitle}>Vendas do Mês</h2>
              <p className={styles.chartSub}>Evolução diária das vendas</p>
            </div>
            <div className={styles.chartBadge}>
              <span className={styles.chartBadgeDot} />
              Faturamento (R$)
            </div>
          </div>

          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#378ADD" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#378ADD" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#eef2f7"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fill: '#888', letterSpacing: 1 }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(chartData.length / 8))}
                />
                <YAxis
                  tick={{ fontFamily: "'Exo 2', sans-serif", fontSize: 10, fill: '#888', fontWeight: 300 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  width={48}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#378ADD"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#378ADD', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className={styles.chartBox} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 350,
        }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", color: '#888' }}>
            Sem dados de vendas para este período
          </p>
        </div>
      )}

      {/* ── Acesso Rápido ───────────────────────────── */}
      <div className={styles.quickSection}>
        <h2 className={styles.quickTitle}>Acesso Rápido</h2>
        <div className={styles.quickGrid}>
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <div
                key={action.label}
                className={styles.quickItem}
                onClick={() => navigate(action.path)}
              >
                <div
                  className={styles.quickIcon}
                  style={{ background: `${action.color}12` }}
                >
                  <Icon size={24} color={action.color} />
                </div>
                <span className={styles.quickLabel}>{action.label}</span>
                <p className={styles.quickDesc}>{action.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}