import { useState } from 'react'
import { DatePicker, Select, Spin, Tag, Empty, Button, Modal } from 'antd'
import {
  RiseOutlined, ShoppingCartOutlined, SwapOutlined,
  DollarOutlined, AppstoreOutlined, TeamOutlined,
  DownloadOutlined, PrinterOutlined,
  TrophyOutlined, BarChartOutlined, DatabaseOutlined,
  RetweetOutlined, CreditCardOutlined, UserOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import { reportService } from '../reportService'
import { buildPrintHtml, openPrintWindow, type PrintData } from '../reportPrint'
import { useAuthStore } from '@/store/authStore'
import styles from './ReportsPage.module.css'

const { RangePicker } = DatePicker

function fmt(v?: number) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtN(v?: number, dec = 2) {
  return (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtDate(iso?: string) {
  if (!iso) return '—'
  // date-only strings (YYYY-MM-DD) are parsed as UTC by the browser; append T00:00:00 to force local time
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso
  return new Date(safe).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function downloadCsv(filename: string, rows: unknown[]) {
  if (!rows.length) return
  const keys = Object.keys(rows[0] as object)
  const esc  = (v: string) => (v.includes(';') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v)
  const csv  = [keys.join(';'), ...(rows as Record<string, unknown>[]).map(r => keys.map(k => esc(String(r[k] ?? ''))).join(';'))].join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: filename }).click()
  URL.revokeObjectURL(url)
}

const MOVEMENT_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada', SAIDA: 'Saída', AJUSTE: 'Ajuste',
  VENDA: 'Venda', COMPRA: 'Compra', DEVOLUCAO: 'Devolução', TRANSFERENCIA: 'Transferência',
}

const PAY_STATUS: Record<string, { label: string; cls: string }> = {
  PENDENTE:  { label: 'Pendente',  cls: styles.tdOrange },
  PAGO:      { label: 'Pago',      cls: styles.tdGreen  },
  PARCIAL:   { label: 'Parcial',   cls: styles.tdBlue   },
  ATRASADO:  { label: 'Atrasado',  cls: styles.tdRed    },
  CANCELADO: { label: 'Cancelado', cls: ''              },
}

function CountBadge({ shown, total }: { shown: number; total: number }) {
  if (!total) return null
  return (
    <div className={styles.countBadge}>
      Mostrando <strong>{shown}</strong> de <strong>{total}</strong> registros
      {shown < total && <span className={styles.countHint}> — use &ldquo;Exportar CSV&rdquo; para ver todos</span>}
    </div>
  )
}

type ReportKey    = 'VENDAS' | 'COMPRAS' | 'MOVIMENTACOES' | 'PAGAMENTOS' | 'PRODUTOS' | 'PESSOAS'
type SubReportKey = 'TOP_PRODUCTS' | 'SALES_RANK' | 'PURCHASE_ORDERS' | 'STOCK_MOVEMENTS' | 'PAYMENTS' | 'STOCK_INVENTORY' | 'PERSONS'

interface SubReport {
  key:      SubReportKey
  label:    string
  desc:     string
  icon:     React.ReactNode
  hasRange: boolean
}

const CARDS = [
  { key: 'VENDAS'        as ReportKey, label: 'Vendas',        icon: <RiseOutlined />,         color: '#378ADD', bg: '#e8f3fb' },
  { key: 'COMPRAS'       as ReportKey, label: 'Compras',       icon: <ShoppingCartOutlined />, color: '#F59E0B', bg: '#fef3cd' },
  { key: 'MOVIMENTACOES' as ReportKey, label: 'Movimentações', icon: <SwapOutlined />,         color: '#8B5CF6', bg: '#ede9fe' },
  { key: 'PAGAMENTOS'    as ReportKey, label: 'Pagamentos',    icon: <DollarOutlined />,       color: '#1D9E75', bg: '#d1fae5' },
  { key: 'PRODUTOS'      as ReportKey, label: 'Produtos',      icon: <AppstoreOutlined />,     color: '#0891B2', bg: '#cffafe' },
  { key: 'PESSOAS'       as ReportKey, label: 'Pessoas',       icon: <TeamOutlined />,         color: '#E24B4A', bg: '#fee2e2' },
]

const SUB_REPORTS: Record<ReportKey, SubReport[]> = {
  VENDAS: [
    { key: 'TOP_PRODUCTS', label: 'Top Produtos Vendidos',  desc: 'Produtos com maior receita no período', icon: <TrophyOutlined />,   hasRange: true  },
    { key: 'SALES_RANK',   label: 'Ranking de Vendedores',  desc: 'Performance de vendas por vendedor',   icon: <BarChartOutlined />, hasRange: true  },
  ],
  COMPRAS: [
    { key: 'PURCHASE_ORDERS', label: 'Ordens de Compra', desc: 'Histórico de pedidos de compra',          icon: <ShoppingCartOutlined />, hasRange: false },
  ],
  MOVIMENTACOES: [
    { key: 'STOCK_MOVEMENTS', label: 'Movimentações de Estoque', desc: 'Entradas, saídas e ajustes',      icon: <RetweetOutlined />,  hasRange: true  },
  ],
  PAGAMENTOS: [
    { key: 'PAYMENTS', label: 'Pagamentos', desc: 'Títulos e recebimentos registrados',                   icon: <CreditCardOutlined />, hasRange: false },
  ],
  PRODUTOS: [
    { key: 'STOCK_INVENTORY', label: 'Inventário de Estoque', desc: 'Posição atual e valor do estoque',   icon: <DatabaseOutlined />, hasRange: false },
  ],
  PESSOAS: [
    { key: 'PERSONS', label: 'Clientes & Fornecedores', desc: 'Cadastro completo de pessoas',             icon: <UserOutlined />,     hasRange: false },
  ],
}

const PREVIEW_OPTIONS = [
  { value: 15, label: '15 registros' },
  { value: 20, label: '20 registros' },
  { value: 40, label: '40 registros' },
]

function defaultRange(): [string, string] {
  const now = dayjs()
  return [now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]
}

export default function ReportsPage() {
  const { user } = useAuthStore()

  const [activeCard,   setActiveCard]   = useState<ReportKey | null>(null)
  const [activeSub,    setActiveSub]    = useState<SubReportKey | null>(null)
  const [range,        setRange]        = useState<[string, string]>(defaultRange)
  const [previewSize,  setPreviewSize]  = useState(20)
  const [exporting,    setExporting]    = useState(false)
  const [previewOpen,  setPreviewOpen]  = useState(false)
  const [previewHtml,  setPreviewHtml]  = useState('')

  const card   = CARDS.find(c => c.key === activeCard)
  const subDef = activeCard ? SUB_REPORTS[activeCard].find(s => s.key === activeSub) : null
  const on     = (k: SubReportKey) => activeSub === k

  const topProducts = useQuery({
    queryKey: ['report', 'top-products', range],
    queryFn:  () => reportService.topProducts(range[0], range[1]),
    enabled:  on('TOP_PRODUCTS'), staleTime: 60_000,
  })
  const salesRank = useQuery({
    queryKey: ['report', 'sales-rank', range],
    queryFn:  () => reportService.salesRank(range[0], range[1]),
    enabled:  on('SALES_RANK'), staleTime: 60_000,
  })
  const stockInventory = useQuery({
    queryKey: ['report', 'stock-inventory'],
    queryFn:  reportService.stockInventory,
    enabled:  on('STOCK_INVENTORY'), staleTime: 60_000,
  })
  const stockMovements = useQuery({
    queryKey: ['report', 'stock-movements', range],
    queryFn:  () => reportService.stockMovements(range[0], range[1]),
    enabled:  on('STOCK_MOVEMENTS'), staleTime: 60_000,
  })
  const payments = useQuery({
    queryKey: ['report', 'payments', previewSize],
    queryFn:  () => reportService.payments(previewSize),
    enabled:  on('PAYMENTS'), staleTime: 60_000,
  })
  const purchaseOrders = useQuery({
    queryKey: ['report', 'purchase-orders', previewSize],
    queryFn:  () => reportService.purchaseOrders(previewSize),
    enabled:  on('PURCHASE_ORDERS'), staleTime: 60_000,
  })
  const persons = useQuery({
    queryKey: ['report', 'persons', previewSize],
    queryFn:  () => reportService.persons(previewSize),
    enabled:  on('PERSONS'), staleTime: 60_000,
  })

  const isLoading = (() => {
    switch (activeSub) {
      case 'TOP_PRODUCTS':    return topProducts.isLoading
      case 'SALES_RANK':      return salesRank.isLoading
      case 'PURCHASE_ORDERS': return purchaseOrders.isLoading
      case 'STOCK_MOVEMENTS': return stockMovements.isLoading
      case 'PAYMENTS':        return payments.isLoading
      case 'STOCK_INVENTORY': return stockInventory.isLoading
      case 'PERSONS':         return persons.isLoading
      default:                return false
    }
  })()

  const sliced = <T,>(arr?: T[]) => (arr ?? []).slice(0, previewSize)

  const handleRange = (dates: [Dayjs | null, Dayjs | null] | null, _: [string, string]) => {
    if (dates?.[0] && dates?.[1]) {
      setRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')])
    }
  }

  const handleCardClick = (key: ReportKey) => {
    if (activeCard === key) {
      setActiveCard(null)
      setActiveSub(null)
      return
    }
    setActiveCard(key)
    const subs = SUB_REPORTS[key]
    setActiveSub(subs.length === 1 ? subs[0].key : null)
  }

  const handleSubClick = (key: SubReportKey) => setActiveSub(key)

  const buildPrintData = (): PrintData | null => {
    switch (activeSub) {
      case 'TOP_PRODUCTS':    return { type: 'TOP_PRODUCTS',    rows: sliced(topProducts.data)      }
      case 'SALES_RANK':      return { type: 'SALES_RANK',      rows: sliced(salesRank.data)        }
      case 'PURCHASE_ORDERS': return { type: 'PURCHASE_ORDERS', rows: purchaseOrders.data?.content ?? [] }
      case 'STOCK_MOVEMENTS': return { type: 'STOCK_MOVEMENTS', rows: sliced(stockMovements.data)   }
      case 'PAYMENTS':        return { type: 'PAYMENTS',        rows: payments.data?.content ?? []  }
      case 'STOCK_INVENTORY': return { type: 'STOCK_INVENTORY', rows: sliced(stockInventory.data)   }
      case 'PERSONS':         return { type: 'PERSONS',         rows: persons.data?.content ?? []   }
      default:                return null
    }
  }

  const buildOptions = (totalRecords: number) => {
    const fmtD = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR')
    const filters: { label: string; value: string }[] = []
    if (subDef?.hasRange) {
      filters.push({ label: 'Período', value: `${fmtD(range[0])} a ${fmtD(range[1])}` })
    }
    return {
      reportTitle:  subDef?.label  ?? '',
      reportDesc:   subDef?.desc   ?? '',
      userName:     user?.name     ?? 'Usuário',
      userRole:     user?.role     ?? '',
      filters,
      previewSize,
      totalRecords,
    }
  }

  const getTotalRecords = () => {
    switch (activeSub) {
      case 'TOP_PRODUCTS':    return (topProducts.data    ?? []).length
      case 'SALES_RANK':      return (salesRank.data      ?? []).length
      case 'PURCHASE_ORDERS': return purchaseOrders.data?.total ?? 0
      case 'STOCK_MOVEMENTS': return (stockMovements.data ?? []).length
      case 'PAYMENTS':        return payments.data?.total ?? 0
      case 'STOCK_INVENTORY': return (stockInventory.data ?? []).length
      case 'PERSONS':         return persons.data?.total ?? 0
      default:                return 0
    }
  }

  const handlePrintPreview = () => {
    const data = buildPrintData()
    if (!data) return
    const html = buildPrintHtml(buildOptions(getTotalRecords()), data)
    // Strip auto-print script so iframe preview doesn't trigger print dialog immediately
    const safeHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    setPreviewHtml(safeHtml)
    setPreviewOpen(true)
  }

  const handleConfirmPrint = () => {
    // Re-inject the auto-print script only when opening the real print window
    const htmlWithPrint = previewHtml.replace(
      '</body>',
      `<script>window.addEventListener('load',function(){window.print();window.addEventListener('afterprint',function(){window.close()})})</script></body>`
    )
    openPrintWindow(htmlWithPrint)
    setPreviewOpen(false)
  }

  const handleExport = async () => {
    if (!activeSub) return
    setExporting(true)
    try {
      switch (activeSub) {
        case 'TOP_PRODUCTS':    downloadCsv('top-produtos.csv',    topProducts.data    ?? []); break
        case 'SALES_RANK':      downloadCsv('ranking-vendedores.csv', salesRank.data   ?? []); break
        case 'PURCHASE_ORDERS': downloadCsv('compras.csv',         await reportService.exportPurchaseOrders()); break
        case 'STOCK_MOVEMENTS': downloadCsv('movimentacoes.csv',   stockMovements.data ?? []); break
        case 'PAYMENTS':        downloadCsv('pagamentos.csv',      await reportService.exportPayments()); break
        case 'STOCK_INVENTORY': downloadCsv('inventario.csv',      stockInventory.data ?? []); break
        case 'PERSONS':         downloadCsv('pessoas.csv',         await reportService.exportPersons()); break
      }
    } finally {
      setExporting(false)
    }
  }

  const showPanel = activeSub !== null

  return (
    <div className={styles.root}>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Relatórios</h1>
          <p className={styles.pageSub}>Selecione um módulo e o relatório desejado</p>
        </div>
      </div>

      <div className={styles.grid}>
        {CARDS.map(c => (
          <div
            key={c.key}
            className={`${styles.card} ${activeCard === c.key ? styles.cardActive : ''}`}
            onClick={() => handleCardClick(c.key)}
          >
            <div className={styles.iconWrap} style={{ background: c.bg, color: c.color }}>
              {c.icon}
            </div>
            <span className={styles.cardLabel}>{c.label}</span>
            <span className={styles.cardDesc}>{SUB_REPORTS[c.key].length} relatório{SUB_REPORTS[c.key].length > 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>

      {activeCard && (
        <div className={styles.subReports}>
          <span className={styles.subLabel}>Selecione o relatório:</span>
          <div className={styles.subBtnRow}>
            {SUB_REPORTS[activeCard].map(s => (
              <button
                key={s.key}
                className={`${styles.subBtn} ${activeSub === s.key ? styles.subBtnActive : ''}`}
                style={activeSub === s.key ? {
                  borderColor: card?.color,
                  background:  card?.bg,
                  color:       card?.color,
                } : {}}
                onClick={() => handleSubClick(s.key)}
              >
                <span className={styles.subBtnIcon}>{s.icon}</span>
                <div className={styles.subBtnText}>
                  <span className={styles.subBtnLabel}>{s.label}</span>
                  <span className={styles.subBtnDesc}>{s.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!activeCard ? (
        <div className={styles.panel}>
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>📊</span>
            <span className={styles.placeholderText}>Selecione um módulo acima para começar</span>
          </div>
        </div>
      ) : !showPanel ? (
        <div className={styles.panel}>
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon} style={{ fontSize: 36 }}>
              {card?.icon}
            </span>
            <span className={styles.placeholderText}>
              Escolha um dos {SUB_REPORTS[activeCard].length} relatórios acima
            </span>
          </div>
        </div>
      ) : (
        <div className={styles.panel}>

          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <div className={styles.panelIcon} style={{ background: card!.bg, color: card!.color }}>
                {subDef?.icon}
              </div>
              <div>
                <p className={styles.panelTitle}>{subDef?.label}</p>
                <p className={styles.panelCount}>{subDef?.desc}</p>
              </div>
            </div>

            <div className={styles.panelControls}>
              {subDef?.hasRange && (
                <RangePicker
                  format="DD/MM/YYYY"
                  value={[dayjs(range[0]), dayjs(range[1])]}
                  onChange={handleRange as never}
                  allowClear={false}
                />
              )}
              <Select
                value={previewSize}
                onChange={setPreviewSize}
                options={PREVIEW_OPTIONS}
                size="middle"
                style={{ width: 140 }}
              />
              <Button
                icon={<PrinterOutlined />}
                onClick={handlePrintPreview}
                disabled={isLoading}
              >
                Imprimir
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exporting}
                disabled={isLoading}
              >
                Exportar CSV
              </Button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            {isLoading ? (
              <div className={styles.centerState}><Spin size="large" /></div>
            ) : (
              <>
                {activeSub === 'TOP_PRODUCTS' && (() => {
                  const rows  = sliced(topProducts.data)
                  const total = (topProducts.data ?? []).length
                  return (
                    <>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>#</th><th>Produto</th><th>SKU</th>
                            <th className={styles.thRight}>Qtd Vendida</th>
                            <th className={styles.thRight}>Nº Pedidos</th>
                            <th className={styles.thRight}>Receita Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 ? (
                            <tr><td colSpan={6}><div className={styles.centerState}><Empty description="Nenhuma venda no período" /></div></td></tr>
                          ) : rows.map((r, i) => (
                            <tr key={r.productId}>
                              <td className={`${styles.tdMono} ${styles.tdBlue}`}>#{i + 1}</td>
                              <td className={styles.tdBold}>{r.productName}</td>
                              <td className={styles.tdMono}>{r.sku || '—'}</td>
                              <td className={`${styles.tdRight} ${styles.tdMono}`}>{fmtN(r.totalQuantitySold)}</td>
                              <td className={`${styles.tdRight} ${styles.tdMono}`}>{r.orderCount}</td>
                              <td className={`${styles.tdRight} ${styles.tdGreen}`}>{fmt(r.totalRevenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <CountBadge shown={rows.length} total={total} />
                    </>
                  )
                })()}

                {activeSub === 'SALES_RANK' && (() => {
                  const rows  = sliced(salesRank.data)
                  const total = (salesRank.data ?? []).length
                  return (
                    <>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>#</th><th>Vendedor</th>
                            <th className={styles.thRight}>Nº Pedidos</th>
                            <th className={styles.thRight}>Ticket Médio</th>
                            <th className={styles.thRight}>Receita Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 ? (
                            <tr><td colSpan={5}><div className={styles.centerState}><Empty description="Nenhum dado no período" /></div></td></tr>
                          ) : rows.map((r, i) => (
                            <tr key={r.sellerId}>
                              <td className={`${styles.tdMono} ${styles.tdBlue}`}>#{i + 1}</td>
                              <td className={styles.tdBold}>{r.sellerName}</td>
                              <td className={`${styles.tdRight} ${styles.tdMono}`}>{r.totalOrders}</td>
                              <td className={`${styles.tdRight} ${styles.tdMono}`}>{fmt(r.averageOrderValue)}</td>
                              <td className={`${styles.tdRight} ${styles.tdGreen}`}>{fmt(r.totalRevenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <CountBadge shown={rows.length} total={total} />
                    </>
                  )
                })()}

                {activeSub === 'PURCHASE_ORDERS' && (() => {
                  const orders = purchaseOrders.data?.content ?? []
                  const total  = purchaseOrders.data?.total   ?? 0
                  type FlatRow = {
                    orderId: number; supplier: string; status: string
                    productName: string; qty: number; received: number
                    unitCost: number; subTotal: number
                    expectedDate: string; createdAt: string
                  }
                  const rows: FlatRow[] = orders.flatMap(o =>
                    (o.items ?? []).length === 0
                      ? [{ orderId: o.id, supplier: o.supplierName || '—', status: o.status || '—',
                           productName: '—', qty: 0, received: 0, unitCost: 0, subTotal: 0,
                           expectedDate: o.expectedDeliveryDate || '', createdAt: o.createdAt || '' }]
                      : (o.items ?? []).map(it => ({
                          orderId: o.id, supplier: o.supplierName || '—', status: o.status || '—',
                          productName: it.productName, qty: it.quantity, received: it.receivedQuantity,
                          unitCost: it.unitCost, subTotal: it.subTotal,
                          expectedDate: o.expectedDeliveryDate || '', createdAt: o.createdAt || '',
                        }))
                  )
                  return (
                    <>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Fornecedor</th>
                            <th>Produto</th>
                            <th className={styles.thRight}>Qtd Comprada</th>
                            <th className={styles.thRight}>Qtd Recebida</th>
                            <th className={styles.thRight}>Custo Unit.</th>
                            <th className={styles.thRight}>Subtotal</th>
                            <th>Status</th>
                            <th>Dt. Prevista</th>
                            <th>Dt. Criação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 ? (
                            <tr><td colSpan={10}><div className={styles.centerState}><Empty description="Nenhuma compra" /></div></td></tr>
                          ) : rows.map((r, i) => (
                            <tr key={i}>
                              <td className={`${styles.tdMono} ${styles.tdBlue}`}>#{r.orderId}</td>
                              <td className={styles.tdBold}>{r.supplier}</td>
                              <td>{r.productName}</td>
                              <td className={`${styles.tdRight} ${styles.tdMono}`}>{r.qty > 0 ? fmtN(r.qty) : '—'}</td>
                              <td className={`${styles.tdRight} ${styles.tdMono} ${r.received >= r.qty && r.qty > 0 ? styles.tdGreen : r.received > 0 ? styles.tdOrange : ''}`}>
                                {r.qty > 0 ? fmtN(r.received) : '—'}
                              </td>
                              <td className={`${styles.tdRight} ${styles.tdMono}`}>{r.unitCost > 0 ? fmt(r.unitCost) : '—'}</td>
                              <td className={`${styles.tdRight} ${styles.tdMono} ${styles.tdGreen}`}>{r.subTotal > 0 ? fmt(r.subTotal) : '—'}</td>
                              <td><Tag>{r.status}</Tag></td>
                              <td>{fmtDate(r.expectedDate)}</td>
                              <td>{fmtDate(r.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <CountBadge shown={orders.length} total={total} />
                    </>
                  )
                })()}

                {activeSub === 'STOCK_MOVEMENTS' && (() => {
                  const rows  = sliced(stockMovements.data)
                  const total = (stockMovements.data ?? []).length
                  return (
                    <>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Produto</th><th>Tipo</th>
                            <th className={styles.thRight}>Quantidade</th>
                            <th>Motivo</th><th>Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 ? (
                            <tr><td colSpan={5}><div className={styles.centerState}><Empty description="Nenhuma movimentação no período" /></div></td></tr>
                          ) : rows.map(r => (
                            <tr key={r.id}>
                              <td className={styles.tdBold}>{r.productName}</td>
                              <td>
                                <Tag color={r.type === 'ENTRADA' || r.type === 'COMPRA' ? 'green' : r.type === 'SAIDA' || r.type === 'VENDA' ? 'red' : 'blue'}>
                                  {MOVEMENT_LABELS[r.type] ?? r.type}
                                </Tag>
                              </td>
                              <td className={`${styles.tdRight} ${styles.tdMono} ${r.type === 'ENTRADA' || r.type === 'COMPRA' ? styles.tdGreen : styles.tdRed}`}>
                                {fmtN(r.quantity)}
                              </td>
                              <td>{r.reason || '—'}</td>
                              <td>{fmtDate(r.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <CountBadge shown={rows.length} total={total} />
                    </>
                  )
                })()}

                {activeSub === 'PAYMENTS' && (() => {
                  const rows  = payments.data?.content ?? []
                  const total = payments.data?.total   ?? 0
                  return (
                    <>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Pedido</th><th>Cliente</th><th>Método</th>
                            <th className={styles.thRight}>Valor</th>
                            <th>Status</th><th>Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 ? (
                            <tr><td colSpan={6}><div className={styles.centerState}><Empty description="Nenhum pagamento" /></div></td></tr>
                          ) : rows.map(r => {
                            const st = PAY_STATUS[r.paymentStatus] ?? { label: r.paymentStatus, cls: '' }
                            return (
                              <tr key={r.id}>
                                <td className={`${styles.tdMono} ${styles.tdBlue}`}>#{r.orderId}</td>
                                <td className={styles.tdBold}>{r.clientName || '—'}</td>
                                <td>{r.paymentMethod?.replace(/_/g, ' ')}</td>
                                <td className={`${styles.tdRight} ${styles.tdGreen}`}>{fmt(r.amount)}</td>
                                <td><span className={st.cls}>{st.label}</span></td>
                                <td>{fmtDate(r.createdAt)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      <CountBadge shown={rows.length} total={total} />
                    </>
                  )
                })()}

                {activeSub === 'STOCK_INVENTORY' && (() => {
                  const rows  = sliced(stockInventory.data)
                  const total = (stockInventory.data ?? []).length
                  return (
                    <>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Produto</th><th>SKU</th><th>Categoria</th>
                            <th className={styles.thRight}>Estoque</th>
                            <th className={styles.thRight}>Preço Venda</th>
                            <th className={styles.thRight}>Preço Custo</th>
                            <th className={styles.thRight}>Valor em Estoque</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 ? (
                            <tr><td colSpan={7}><div className={styles.centerState}><Empty description="Nenhum produto" /></div></td></tr>
                          ) : rows.map(r => (
                            <tr key={r.productId}>
                              <td className={styles.tdBold}>{r.productName}</td>
                              <td className={styles.tdMono}>{r.sku || '—'}</td>
                              <td>{r.categoryName || '—'}</td>
                              <td className={`${styles.tdRight} ${styles.tdMono} ${Number(r.stockQuantity) > 0 ? styles.tdGreen : styles.tdRed}`}>
                                {fmtN(r.stockQuantity)}
                              </td>
                              <td className={`${styles.tdRight} ${styles.tdMono}`}>{fmt(r.unitPrice)}</td>
                              <td className={`${styles.tdRight} ${styles.tdMono}`}>{r.purchasePrice != null ? fmt(r.purchasePrice) : '—'}</td>
                              <td className={`${styles.tdRight} ${styles.tdBlue}`}>{fmt(r.totalValueSale)}</td>
                            </tr>
                          ))}
                        </tbody>
                        {rows.length > 0 && (
                          <tfoot>
                            <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                              <td colSpan={6} style={{ padding: '10px 16px', fontFamily: "'Exo 2'", fontSize: 12, color: '#042C53' }}>
                                Total em estoque (preço de venda)
                              </td>
                              <td className={styles.tdRight} style={{ padding: '10px 16px', fontFamily: "'Exo 2'", fontSize: 13, color: '#378ADD', fontWeight: 700 }}>
                                {fmt(stockInventory.data!.reduce((s, r) => s + Number(r.totalValueSale), 0))}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                      <CountBadge shown={rows.length} total={total} />
                    </>
                  )
                })()}

                {activeSub === 'PERSONS' && (() => {
                  const rows  = persons.data?.content ?? []
                  const total = persons.data?.total   ?? 0
                  return (
                    <>
                      <table className={styles.table}>
                        <thead>
                          <tr><th>#</th><th>Nome</th><th>Documento</th><th>E-mail</th><th>Telefone</th><th>Papéis</th></tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 ? (
                            <tr><td colSpan={6}><div className={styles.centerState}><Empty description="Nenhuma pessoa" /></div></td></tr>
                          ) : rows.map(r => (
                            <tr key={r.id}>
                              <td className={`${styles.tdMono} ${styles.tdBlue}`}>#{r.id}</td>
                              <td className={styles.tdBold}>{r.name}</td>
                              <td className={styles.tdMono}>{r.document || '—'}</td>
                              <td>{r.email || '—'}</td>
                              <td>{r.phone || '—'}</td>
                              <td>
                                {(r.roles ?? []).map(role => (
                                  <Tag key={role} color={role === 'CLIENTE' ? 'blue' : role === 'FORNECEDOR' ? 'orange' : 'default'}>
                                    {role}
                                  </Tag>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <CountBadge shown={rows.length} total={total} />
                    </>
                  )
                })()}

              </>
            )}
          </div>
        </div>
      )}

      <Modal
        open={previewOpen}
        title={
          <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, color: '#042C53' }}>
            <PrinterOutlined style={{ marginRight: 8 }} />
            Pré-visualização — {subDef?.label}
          </span>
        }
        onCancel={() => setPreviewOpen(false)}
        onOk={handleConfirmPrint}
        okText={<><PrinterOutlined /> Confirmar Impressão</>}
        cancelText="Fechar"
        width="82vw"
        style={{ top: 24 }}
        styles={{ body: { padding: 0, overflow: 'hidden', borderRadius: '0 0 8px 8px' } }}
        okButtonProps={{ size: 'large' }}
        cancelButtonProps={{ size: 'large' }}
      >
        <iframe
          srcDoc={previewHtml}
          style={{ width: '100%', height: '68vh', border: 'none', display: 'block' }}
          title="Pré-visualização de impressão"
        />
      </Modal>

    </div>
  )
}
