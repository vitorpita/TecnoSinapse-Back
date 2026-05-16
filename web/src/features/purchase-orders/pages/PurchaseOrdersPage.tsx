import { useState } from 'react'
import { App, Button, Select, Tag, Tooltip, Popconfirm, Pagination, Empty, Spin, Drawer, Divider } from 'antd'
import { PlusOutlined, EyeOutlined, EditOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  purchaseOrderService,
  type PurchaseOrderRecord,
  type PurchaseOrderStatus,
  type CreatePurchaseOrderRequest,
} from '../purchaseOrderService'
import PurchaseOrderFormDrawer from '../components/PurchaseOrderFormDrawer'
import styles from './PurchaseOrdersPage.module.css'

const statusConfig: Record<PurchaseOrderStatus, { label: string; color: string }> = {
  PENDENTE:   { label: 'Pendente',   color: 'orange'  },
  CONFIRMADO: { label: 'Confirmado', color: 'blue'    },
  RECEBIDO:   { label: 'Recebido',   color: 'green'   },
  CANCELADO:  { label: 'Cancelado',  color: 'red'     },
}

const statusFilterOptions = [
  { value: '',           label: 'Todos os status' },
  { value: 'PENDENTE',   label: 'Pendente'        },
  { value: 'CONFIRMADO', label: 'Confirmado'      },
  { value: 'RECEBIDO',   label: 'Recebido'        },
  { value: 'CANCELADO',  label: 'Cancelado'       },
]

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}
function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function PurchaseOrdersPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()

  const [page,          setPage]          = useState(0)
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState<PurchaseOrderStatus | ''>('')
  const [formOpen,      setFormOpen]      = useState(false)
  const [detailOpen,    setDetailOpen]    = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderRecord | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchase-orders', page],
    queryFn:  () => purchaseOrderService.list(page),
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreatePurchaseOrderRequest) => purchaseOrderService.create(payload),
    onSuccess: () => {
      message.success('Ordem de compra criada!')
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      setFormOpen(false)
      setSelectedOrder(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao criar ordem de compra.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreatePurchaseOrderRequest }) =>
      purchaseOrderService.update(id, payload),
    onSuccess: () => {
      message.success('Ordem atualizada!')
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      setFormOpen(false)
      setSelectedOrder(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao atualizar ordem.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: purchaseOrderService.delete,
    onSuccess: () => {
      message.success('Ordem cancelada.')
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao cancelar ordem.')
    },
  })

  const orders = data?.content ?? []
  const filtered = orders.filter((o: PurchaseOrderRecord) => {
    const matchSearch = !search ||
      o.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
      String(o.id).includes(search) ||
      o.invoiceNumber?.includes(search)
    const matchStatus = !statusFilter || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleFormSubmit = (values: Parameters<typeof createMutation.mutate>[0]) => {
    if (selectedOrder) {
      updateMutation.mutate({ id: selectedOrder.id, payload: values as CreatePurchaseOrderRequest })
    } else {
      createMutation.mutate(values as CreatePurchaseOrderRequest)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  // Totalizadores
  const totalPendente   = orders.filter(o => o.status === 'PENDENTE').reduce((a, o) => a + Number(o.totalAmount), 0)
  const totalConfirmado = orders.filter(o => o.status === 'CONFIRMADO').reduce((a, o) => a + Number(o.totalAmount), 0)
  const totalRecebido   = orders.filter(o => o.status === 'RECEBIDO').reduce((a, o) => a + Number(o.totalAmount), 0)
  const qtdTotal        = data?.totalElements ?? 0

  return (
    <div className={styles.root}>

      {/* ── Cards de resumo ───────────────────────── */}
      <div className={styles.cards}>
        {[
          { label: 'Total de Ordens',   value: String(qtdTotal),              color: '#042C53', accent: '#042C53' },
          { label: 'Pendentes',         value: formatCurrency(totalPendente),  color: '#F59E0B', accent: '#F59E0B' },
          { label: 'Confirmadas',       value: formatCurrency(totalConfirmado),color: '#378ADD', accent: '#378ADD' },
          { label: 'Recebidas',         value: formatCurrency(totalRecebido),  color: '#1D9E75', accent: '#1D9E75' },
        ].map(card => (
          <div key={card.label} className={styles.card} style={{ borderTopColor: card.accent }}>
            <span className={styles.cardLabel}>{card.label}</span>
            <span className={styles.cardValue} style={{ color: card.color }}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchWrap}>
            <SearchOutlined className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar por fornecedor, NF ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            options={statusFilterOptions}
            style={{ width: 180 }}
            size="large"
          />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => { setSelectedOrder(null); setFormOpen(true) }}
          className={styles.newBtn}
        >
          Nova Ordem
        </Button>
      </div>

      {/* ── Tabela ───────────────────────────────── */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Ordens de Compra</span>
          <span className={styles.tableCount}>
            {isLoading ? '...' : `${data?.totalElements ?? 0} ordens`}
          </span>
        </div>

        {isLoading ? (
          <div className={styles.centerState}><Spin size="large" /></div>
        ) : isError ? (
          <div className={styles.centerState}><span className={styles.errorText}>Erro ao carregar ordens.</span></div>
        ) : filtered.length === 0 ? (
          <div className={styles.centerState}><Empty description="Nenhuma ordem encontrada" /></div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Fornecedor</th>
                <th>NF</th>
                <th>Itens</th>
                <th>Previsão</th>
                <th>Status</th>
                <th>Total</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order: PurchaseOrderRecord) => {
                const status = statusConfig[order.status]
                const isCanceled = order.status === 'CANCELADO'
                return (
                  <tr key={order.id} className={isCanceled ? styles.rowCanceled : ''}>
                    <td className={styles.tdId}>#{order.id}</td>
                    <td className={styles.tdSupplier}>{order.supplierName}</td>
                    <td className={styles.tdNf}>{order.invoiceNumber || <span className={styles.empty}>—</span>}</td>
                    <td className={styles.tdItems}>
                      <span className={styles.itemsBadge}>{order.items?.length ?? 0} produto{(order.items?.length ?? 0) !== 1 ? 's' : ''}</span>
                    </td>
                    <td className={styles.tdDate}>{formatDate(order.expectedAt)}</td>
                    <td><Tag color={status.color}>{status.label}</Tag></td>
                    <td className={styles.tdTotal}>{formatCurrency(Number(order.totalAmount))}</td>
                    <td>
                      <div className={styles.actions}>
                        <Tooltip title="Ver detalhes">
                          <button className={styles.actionBtn} onClick={() => { setSelectedOrder(order); setDetailOpen(true) }}>
                            <EyeOutlined />
                          </button>
                        </Tooltip>
                        {!isCanceled && (
                          <>
                            <Tooltip title="Editar">
                              <button className={styles.actionBtn} onClick={() => { setSelectedOrder(order); setFormOpen(true) }}>
                                <EditOutlined />
                              </button>
                            </Tooltip>
                            <Popconfirm
                              title="Cancelar ordem"
                              description="Tem certeza que deseja cancelar esta ordem de compra?"
                              onConfirm={() => deleteMutation.mutate(order.id)}
                              okText="Sim, cancelar"
                              cancelText="Não"
                              okButtonProps={{ danger: true }}
                            >
                              <Tooltip title="Cancelar">
                                <button className={`${styles.actionBtn} ${styles.actionDanger}`}>
                                  <CloseCircleOutlined />
                                </button>
                              </Tooltip>
                            </Popconfirm>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {!isLoading && (data?.totalPages ?? 0) > 1 && (
          <div className={styles.pagination}>
            <Pagination
              current={(data?.number ?? 0) + 1}
              total={data?.totalElements ?? 0}
              pageSize={data?.size ?? 20}
              onChange={(p) => setPage(p - 1)}
              showSizeChanger={false}
              showTotal={(t) => `Total: ${t} ordens`}
            />
          </div>
        )}
      </div>

      {/* ── Drawer de detalhe ─────────────────────── */}
      {selectedOrder && (
        <Drawer
          title={
            <div className={styles.detailTitle}>
              <span>Ordem #{selectedOrder.id}</span>
              <Tag color={statusConfig[selectedOrder.status].color}>
                {statusConfig[selectedOrder.status].label}
              </Tag>
            </div>
          }
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          width={540}
        >
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Fornecedor</span>
              <span className={styles.detailValue}>{selectedOrder.supplierName}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Nota Fiscal</span>
              <span className={styles.detailValue}>{selectedOrder.invoiceNumber || '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Previsão de Chegada</span>
              <span className={styles.detailValue}>{formatDate(selectedOrder.expectedAt)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Data de Criação</span>
              <span className={styles.detailValue}>{formatDate(selectedOrder.createdAt)}</span>
            </div>
            {selectedOrder.notes && (
              <div className={`${styles.detailItem} ${styles.detailFull}`}>
                <span className={styles.detailLabel}>Observações</span>
                <span className={styles.detailValue}>{selectedOrder.notes}</span>
              </div>
            )}
          </div>

          <Divider style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#888' }}>
            Produtos
          </Divider>

          <div className={styles.detailItems}>
            {(selectedOrder.items ?? []).map((item, i) => (
              <div key={i} className={styles.detailItemRow}>
                <div>
                  <div className={styles.detailItemName}>{item.productName ?? `Produto #${item.productId}`}</div>
                  <div className={styles.detailItemQty}>
                    {Number(item.quantity).toLocaleString('pt-BR')} × R$ {Number(item.unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <span className={styles.detailItemTotal}>
                  R$ {(Number(item.quantity) * Number(item.unitCost)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          <Divider />

          <div className={styles.detailTotals}>
            <div className={styles.detailTotalRow}>
              <span>Subtotal</span>
              <span>{formatCurrency((selectedOrder.items ?? []).reduce((a, i) => a + Number(i.quantity) * Number(i.unitCost), 0))}</span>
            </div>
            {Number(selectedOrder.freightCost) > 0 && (
              <div className={styles.detailTotalRow}>
                <span>Frete</span>
                <span>+ {formatCurrency(Number(selectedOrder.freightCost))}</span>
              </div>
            )}
            {Number(selectedOrder.discount) > 0 && (
              <div className={styles.detailTotalRow}>
                <span>Desconto</span>
                <span className={styles.discountText}>- {formatCurrency(Number(selectedOrder.discount))}</span>
              </div>
            )}
            <div className={`${styles.detailTotalRow} ${styles.detailTotalFinal}`}>
              <span>Total</span>
              <span>{formatCurrency(Number(selectedOrder.totalAmount))}</span>
            </div>
          </div>
        </Drawer>
      )}

      {/* ── Drawer de form ───────────────────────── */}
      <PurchaseOrderFormDrawer
        open={formOpen}
        order={selectedOrder}
        onClose={() => { setFormOpen(false); setSelectedOrder(null) }}
        onSuccess={() => {}}
        saving={saving}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}