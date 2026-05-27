import { useState } from 'react'
import { App, Button, Select, Tag, Tooltip, Popconfirm, Pagination, Empty, Spin,
         Drawer, Divider, Modal, Input, InputNumber, Progress, Badge, Form, Row, Col } from 'antd'
import {
  PlusOutlined, EyeOutlined, EditOutlined, CloseCircleOutlined, SearchOutlined,
  SendOutlined, CheckCircleOutlined, LoadingOutlined, AuditOutlined,
  FileProtectOutlined, CheckOutlined, RightCircleOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  purchaseOrderService,
  type PurchaseOrderRecord,
  type PurchaseOrderStatus,
  type CreatePurchaseOrderRequest,
  type ReceiveItemRequest,
} from '../purchaseOrderService'
import PurchaseOrderFormDrawer from '../components/PurchaseOrderFormDrawer'
import { usePermission } from '@/hooks/usePermission'
import styles from './PurchaseOrdersPage.module.css'

const statusConfig: Record<PurchaseOrderStatus, { label: string; color: string }> = {
  ABERTO:                 { label: 'Aberto',           color: 'default' },
  APROVADO:               { label: 'Aprovado',         color: 'blue'    },
  AGUARDANDO_RECEBIMENTO: { label: 'Ag. Recebimento',  color: 'orange'  },
  RECEBIDO_PARCIAL:       { label: 'Rec. Parcial',     color: 'purple'  },
  RECEBIDO_TOTAL:         { label: 'Recebido',         color: 'cyan'    },
  CANCELADO:              { label: 'Cancelado',        color: 'red'     },
  FINALIZADO:             { label: 'Finalizado',       color: 'green'   },
}

const statusFilterOptions = [
  { value: '',                      label: 'Todos os status'    },
  { value: 'ABERTO',                label: 'Aberto'             },
  { value: 'APROVADO',              label: 'Aprovado'           },
  { value: 'AGUARDANDO_RECEBIMENTO',label: 'Ag. Recebimento'    },
  { value: 'RECEBIDO_PARCIAL',      label: 'Rec. Parcial'       },
  { value: 'RECEBIDO_TOTAL',        label: 'Recebido'           },
  { value: 'CANCELADO',             label: 'Cancelado'          },
  { value: 'FINALIZADO',            label: 'Finalizado'         },
]

const freightLabel: Record<string, string> = { CIF: 'CIF', FOB: 'FOB', OUTRO: 'Outro' }

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}
function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}
function formatDateTime(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR')
}

interface ReceiptItemState {
  itemId:          number
  productName:     string
  orderedQty:      number
  alreadyReceived: number
  pendingQty:      number
  receivedQty:     number
  damagedQty:      number
  damageReason:    string
}

export default function PurchaseOrdersPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const { has, isAdmin } = usePermission()
  const canWrite    = isAdmin || has('purchase:write')
  const canApprove  = isAdmin || has('purchase:approve')
  const canReceive  = isAdmin || has('purchase:receive')
  const canFinalize = isAdmin || has('purchase:finalize')
  const canCancel   = isAdmin || has('purchase:cancel')

  const [page,          setPage]          = useState(0)
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState<PurchaseOrderStatus | ''>('')
  const [formOpen,      setFormOpen]      = useState(false)
  const [detailOpen,    setDetailOpen]    = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderRecord | null>(null)

  // Receipt modal state
  const [receiptOrder,    setReceiptOrder]    = useState<PurchaseOrderRecord | null>(null)
  const [receiptInvoice,  setReceiptInvoice]  = useState('')
  const [receiptObs,      setReceiptObs]      = useState('')
  const [receiptItems,    setReceiptItems]    = useState<ReceiptItemState[]>([])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchase-orders', page, search],
    queryFn:  () => purchaseOrderService.list(page, 20, search || undefined),
  })

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['stock-movements'] })
  }

  const onError = (err: unknown, fallback: string) => {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
    message.error(msg || fallback)
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreatePurchaseOrderRequest) => purchaseOrderService.create(payload),
    onSuccess: () => { message.success('Ordem de compra criada!'); invalidateAll(); setFormOpen(false); setSelectedOrder(null) },
    onError: (e) => onError(e, 'Erro ao criar ordem de compra.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreatePurchaseOrderRequest }) =>
      purchaseOrderService.update(id, payload),
    onSuccess: () => { message.success('Ordem atualizada!'); invalidateAll(); setFormOpen(false); setSelectedOrder(null) },
    onError: (e) => onError(e, 'Erro ao atualizar ordem.'),
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => purchaseOrderService.approve(id),
    onSuccess: () => { message.success('Pedido aprovado!'); qc.invalidateQueries({ queryKey: ['purchase-orders'] }) },
    onError: (e) => onError(e, 'Erro ao aprovar pedido.'),
  })

  const sendToReceivingMutation = useMutation({
    mutationFn: (id: number) => purchaseOrderService.sendToReceiving(id),
    onSuccess: () => { message.success('Pedido enviado para recebimento!'); qc.invalidateQueries({ queryKey: ['purchase-orders'] }) },
    onError: (e) => onError(e, 'Erro ao enviar para recebimento.'),
  })

  const receiveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof purchaseOrderService.receive>[1] }) =>
      purchaseOrderService.receive(id, payload),
    onSuccess: (result) => {
      const isTotal = result.status === 'RECEBIDO_TOTAL'
      message.success(isTotal ? 'Recebimento total registrado! Estoque atualizado.' : 'Recebimento parcial registrado.')
      setReceiptOrder(null)
      invalidateAll()
    },
    onError: (e) => onError(e, 'Erro ao registrar recebimento.'),
  })

  const finalizeMutation = useMutation({
    mutationFn: (id: number) => purchaseOrderService.finalize(id),
    onSuccess: () => { message.success('Pedido finalizado! Movimentação de caixa registrada.'); invalidateAll() },
    onError: (e) => onError(e, 'Erro ao finalizar pedido.'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => purchaseOrderService.cancel(id),
    onSuccess: () => { message.success('Ordem cancelada.'); qc.invalidateQueries({ queryKey: ['purchase-orders'] }) },
    onError: (e) => onError(e, 'Erro ao cancelar ordem.'),
  })

  const openReceiptModal = (order: PurchaseOrderRecord) => {
    setReceiptOrder(order)
    setReceiptInvoice(order.invoiceNumber ?? '')
    setReceiptObs('')
    setReceiptItems(order.items.map(item => ({
      itemId:          item.id!,
      productName:     item.productName ?? `Produto #${item.productId}`,
      orderedQty:      Number(item.quantity),
      alreadyReceived: Number(item.receivedQuantity ?? 0),
      pendingQty:      Number(item.pendingQuantity ?? item.quantity),
      receivedQty:     Number(item.pendingQuantity ?? item.quantity),
      damagedQty:      0,
      damageReason:    '',
    })))
  }

  const handleReceiptSubmit = () => {
    if (!receiptOrder) return
    const hasAnyInput = receiptItems.some(i => i.receivedQty > 0 || i.damagedQty > 0)
    if (!hasAnyInput) {
      message.warning('Informe pelo menos uma quantidade recebida.')
      return
    }
    const items: ReceiveItemRequest[] = receiptItems.map(i => ({
      itemId:           i.itemId,
      receivedQuantity: i.receivedQty,
      damagedQuantity:  i.damagedQty > 0 ? i.damagedQty : undefined,
      damageReason:     i.damageReason || undefined,
    }))
    receiveMutation.mutate({
      id: receiptOrder.id,
      payload: { invoiceNumber: receiptInvoice || undefined, observations: receiptObs || undefined, items },
    })
  }

  const updateReceiptItem = (index: number, field: keyof ReceiptItemState, value: number | string) => {
    setReceiptItems(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const orders      = data?.content ?? []
  const filtered    = orders.filter((o: PurchaseOrderRecord) => !statusFilter || o.status === statusFilter)
  const saving      = createMutation.isPending || updateMutation.isPending

  const handleFormSubmit = (values: Parameters<typeof createMutation.mutate>[0]) => {
    if (selectedOrder) {
      updateMutation.mutate({ id: selectedOrder.id, payload: values as CreatePurchaseOrderRequest })
    } else {
      createMutation.mutate(values as CreatePurchaseOrderRequest)
    }
  }

  const totalAberto    = orders.filter(o => o.status === 'ABERTO').reduce((a, o) => a + Number(o.totalAmount), 0)
  const totalAndamento = orders.filter(o => ['APROVADO','AGUARDANDO_RECEBIMENTO','RECEBIDO_PARCIAL'].includes(o.status)).reduce((a, o) => a + Number(o.totalAmount), 0)
  const totalFinalizado = orders.filter(o => o.status === 'FINALIZADO').reduce((a, o) => a + Number(o.totalAmount), 0)
  const qtdTotal       = data?.totalElements ?? 0

  const receiptTotalReceived = receiptItems.reduce((a, i) => a + Math.max(0, i.receivedQty - i.damagedQty) * (receiptOrder?.items.find(it => it.id === i.itemId)?.unitCost ?? 0), 0)

  return (
    <div className={styles.root}>

      {/* Cards */}
      <div className={styles.cards}>
        {[
          { label: 'Total de Ordens', value: String(qtdTotal),                 color: '#042C53', accent: '#042C53' },
          { label: 'Em Aberto',       value: formatCurrency(totalAberto),      color: '#F59E0B', accent: '#F59E0B' },
          { label: 'Em Andamento',    value: formatCurrency(totalAndamento),   color: '#378ADD', accent: '#378ADD' },
          { label: 'Finalizados',     value: formatCurrency(totalFinalizado),  color: '#1D9E75', accent: '#1D9E75' },
        ].map(card => (
          <div key={card.label} className={styles.card} style={{ borderTopColor: card.accent }}>
            <span className={styles.cardLabel}>{card.label}</span>
            <span className={styles.cardValue} style={{ color: card.color }}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchWrap}>
            <SearchOutlined className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar por fornecedor, NF ou código..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            options={statusFilterOptions}
            style={{ width: 200 }}
            size="large"
          />
        </div>
        {canWrite && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => { setSelectedOrder(null); setFormOpen(true) }}
            className={styles.newBtn}
          >
            Nova Ordem
          </Button>
        )}
      </div>

      {/* Tabela */}
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
                const status              = statusConfig[order.status]
                const isCanceled          = order.status === 'CANCELADO'
                const isFinal             = order.status === 'FINALIZADO' || order.status === 'RECEBIDO_TOTAL'
                const orderCanBeReceived  = order.status === 'AGUARDANDO_RECEBIMENTO' || order.status === 'RECEBIDO_PARCIAL'
                const orderCanBeFinalized = order.status === 'RECEBIDO_TOTAL'
                return (
                  <tr key={order.id} className={isCanceled ? styles.rowCanceled : ''}>
                    <td className={styles.tdId}>#{order.id}</td>
                    <td className={styles.tdSupplier}>{order.supplierName}</td>
                    <td className={styles.tdNf}>{order.invoiceNumber ?? <span className={styles.empty}>—</span>}</td>
                    <td className={styles.tdItems}>
                      <span className={styles.itemsBadge}>{order.items?.length ?? 0} prod.</span>
                    </td>
                    <td className={styles.tdDate}>{formatDate(order.expectedDeliveryDate)}</td>
                    <td><Tag color={status.color}>{status.label}</Tag></td>
                    <td className={styles.tdTotal}>{formatCurrency(Number(order.totalAmount))}</td>
                    <td>
                      <div className={styles.actions}>
                        <Tooltip title="Ver detalhes">
                          <button className={styles.actionBtn} onClick={() => { setSelectedOrder(order); setDetailOpen(true) }}>
                            <EyeOutlined />
                          </button>
                        </Tooltip>

                        {order.status === 'ABERTO' && (
                          <>
                            {canWrite && (
                              <Tooltip title="Editar">
                                <button className={styles.actionBtn} onClick={() => { setSelectedOrder(order); setFormOpen(true) }}>
                                  <EditOutlined />
                                </button>
                              </Tooltip>
                            )}
                            {canApprove && (
                              <Popconfirm
                                title="Aprovar pedido"
                                description="Ao aprovar, o pedido não poderá mais ser editado."
                                onConfirm={() => approveMutation.mutate(order.id)}
                                okText="Aprovar"
                                cancelText="Cancelar"
                              >
                                <Tooltip title="Aprovar">
                                  <button className={`${styles.actionBtn} ${styles.actionPrimary}`}
                                    disabled={approveMutation.isPending && approveMutation.variables === order.id}>
                                    {approveMutation.isPending && approveMutation.variables === order.id
                                      ? <LoadingOutlined /> : <CheckCircleOutlined />}
                                  </button>
                                </Tooltip>
                              </Popconfirm>
                            )}
                          </>
                        )}

                        {order.status === 'APROVADO' && canReceive && (
                          <Popconfirm
                            title="Enviar para recebimento"
                            description="O pedido será liberado para dar entrada das mercadorias."
                            onConfirm={() => sendToReceivingMutation.mutate(order.id)}
                            okText="Confirmar"
                            cancelText="Cancelar"
                          >
                            <Tooltip title="Enviar p/ Recebimento">
                              <button className={`${styles.actionBtn} ${styles.actionPrimary}`}>
                                <SendOutlined />
                              </button>
                            </Tooltip>
                          </Popconfirm>
                        )}

                        {canReceive && orderCanBeReceived && (
                          <Tooltip title="Registrar Recebimento">
                            <button
                              className={`${styles.actionBtn} ${styles.actionSuccess}`}
                              onClick={() => openReceiptModal(order)}
                            >
                              <AuditOutlined />
                            </button>
                          </Tooltip>
                        )}

                        {canFinalize && orderCanBeFinalized && (
                          <Popconfirm
                            title="Finalizar pedido"
                            description="Todos os itens foram recebidos. O pedido será fechado e a saída de caixa registrada."
                            onConfirm={() => finalizeMutation.mutate(order.id)}
                            okText="Finalizar"
                            cancelText="Cancelar"
                          >
                            <Tooltip title="Finalizar Pedido">
                              <button className={`${styles.actionBtn} ${styles.actionSuccess}`}
                                disabled={finalizeMutation.isPending && finalizeMutation.variables === order.id}>
                                {finalizeMutation.isPending && finalizeMutation.variables === order.id
                                  ? <LoadingOutlined /> : <FileProtectOutlined />}
                              </button>
                            </Tooltip>
                          </Popconfirm>
                        )}

                        {canCancel && !isCanceled && !isFinal && (
                          <Popconfirm
                            title="Cancelar ordem"
                            description="Tem certeza que deseja cancelar esta ordem de compra?"
                            onConfirm={() => cancelMutation.mutate(order.id)}
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

      {/* Modal de Recebimento */}
      <Modal
        open={!!receiptOrder}
        onCancel={() => setReceiptOrder(null)}
        title={null}
        footer={null}
        width={560}
        centered
        styles={{ body: { padding: 0 } }}
      >
        {receiptOrder && (
          <div className={styles.inspModal}>

            <div className={styles.inspHeader}>
              <div className={styles.inspHeaderLeft}>
                <AuditOutlined className={styles.inspHeaderIcon} />
                <div>
                  <div className={styles.inspTitle}>Recebimento de Mercadorias</div>
                  <div className={styles.inspSubtitle}>
                    Ordem #{receiptOrder.id} · {receiptOrder.supplierName}
                    {receiptOrder.status === 'RECEBIDO_PARCIAL' && ' · Complemento'}
                  </div>
                </div>
              </div>
              <Badge
                count={statusConfig[receiptOrder.status].label}
                style={{ backgroundColor: receiptOrder.status === 'RECEBIDO_PARCIAL' ? '#7c3aed' : '#378ADD',
                         fontFamily: "'Exo 2', sans-serif" }}
              />
            </div>

            {/* NF + Obs */}
            <div style={{ padding: '12px 20px 0' }}>
              <Row gutter={[12, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<span className={styles.fieldLabelSm}>Nota Fiscal (NF)</span>}
                    style={{ marginBottom: 8 }}
                  >
                    <Input
                      value={receiptInvoice}
                      onChange={e => setReceiptInvoice(e.target.value)}
                      placeholder="Número da NF"
                      size="middle"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<span className={styles.fieldLabelSm}>Observações</span>}
                    style={{ marginBottom: 8 }}
                  >
                    <Input
                      value={receiptObs}
                      onChange={e => setReceiptObs(e.target.value)}
                      placeholder="Avarias, divergências..."
                      size="middle"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <Divider style={{ margin: '0 0 0' }} />

            {/* Lista de itens */}
            <div className={styles.inspList}>
              {receiptItems.map((ri, index) => (
                <div key={ri.itemId} className={styles.receiptItem}>
                  <div className={styles.receiptItemHeader}>
                    <span className={styles.inspItemName}>{ri.productName}</span>
                    <div className={styles.receiptQtyInfo}>
                      <span className={styles.inspQtyBadge}>Pedido: {ri.orderedQty.toLocaleString('pt-BR')}</span>
                      {ri.alreadyReceived > 0 && (
                        <span className={styles.receiptReceivedBadge}>Já recebido: {ri.alreadyReceived.toLocaleString('pt-BR')}</span>
                      )}
                      <span className={styles.receiptPendingBadge}>Pendente: {ri.pendingQty.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  <Row gutter={[8, 0]} style={{ marginTop: 8 }}>
                    <Col xs={12}>
                      <div className={styles.fieldLabelSm} style={{ marginBottom: 4 }}>Qtd. Recebida</div>
                      <InputNumber
                        value={ri.receivedQty}
                        min={0}
                        max={ri.pendingQty}
                        step={0.5}
                        precision={2}
                        decimalSeparator=","
                        formatter={(v) => String(v ?? '').replace('.', ',')}
                        parser={(v) => parseFloat((v ?? '').replace(/\./g, '').replace(',', '.')) || 0}
                        size="middle"
                        style={{ width: '100%' }}
                        onChange={v => updateReceiptItem(index, 'receivedQty', Number(v ?? 0))}
                      />
                    </Col>
                    <Col xs={12}>
                      <div className={styles.fieldLabelSm} style={{ marginBottom: 4 }}>Qtd. Avariada</div>
                      <InputNumber
                        value={ri.damagedQty}
                        min={0}
                        max={ri.receivedQty}
                        step={0.5}
                        precision={2}
                        decimalSeparator=","
                        formatter={(v) => String(v ?? '').replace('.', ',')}
                        parser={(v) => parseFloat((v ?? '').replace(/\./g, '').replace(',', '.')) || 0}
                        size="middle"
                        style={{ width: '100%' }}
                        onChange={v => updateReceiptItem(index, 'damagedQty', Number(v ?? 0))}
                      />
                    </Col>
                    {ri.damagedQty > 0 && (
                      <Col xs={24} style={{ marginTop: 6 }}>
                        <div className={styles.fieldLabelSm} style={{ marginBottom: 4, color: '#E24B4A' }}>Motivo da Avaria</div>
                        <Input
                          value={ri.damageReason}
                          onChange={e => updateReceiptItem(index, 'damageReason', e.target.value)}
                          placeholder="Descreva o problema..."
                          size="middle"
                        />
                      </Col>
                    )}
                  </Row>

                  {ri.receivedQty > 0 && (
                    <div className={styles.receiptNetLine}>
                      <RightCircleOutlined style={{ color: '#1D9E75', fontSize: 12 }} />
                      <span>
                        Entrada líquida: <strong>{(ri.receivedQty - ri.damagedQty).toLocaleString('pt-BR')} un</strong>
                        {ri.damagedQty > 0 && <span className={styles.receiptDamageNote}> ({ri.damagedQty.toLocaleString('pt-BR')} avariadas → quarentena)</span>}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total recebido */}
            <div className={styles.receiptTotal}>
              <span className={styles.receiptTotalLabel}>Valor líquido a receber</span>
              <strong className={styles.receiptTotalValue}>{formatCurrency(receiptTotalReceived)}</strong>
            </div>

            {/* Rodapé */}
            <div className={styles.inspFooter}>
              <Button onClick={() => setReceiptOrder(null)}>Fechar</Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={receiveMutation.isPending}
                onClick={handleReceiptSubmit}
                style={{ background: '#1D9E75', borderColor: '#1D9E75' }}
              >
                Confirmar Recebimento
              </Button>
            </div>

          </div>
        )}
      </Modal>

      {/* Drawer de detalhe */}
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
              <span className={styles.detailValue}>{selectedOrder.invoiceNumber ?? '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Condição de Pagamento</span>
              <span className={styles.detailValue}>{selectedOrder.paymentCondition ?? '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Tipo de Frete</span>
              <span className={styles.detailValue}>{selectedOrder.freightType ? freightLabel[selectedOrder.freightType] : '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Previsão de Chegada</span>
              <span className={styles.detailValue}>{formatDate(selectedOrder.expectedDeliveryDate)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Data de Criação</span>
              <span className={styles.detailValue}>{formatDate(selectedOrder.createdAt)}</span>
            </div>
            {selectedOrder.receivedAt && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Recebido em</span>
                <span className={styles.detailValue}>{formatDateTime(selectedOrder.receivedAt)}</span>
              </div>
            )}
            {selectedOrder.observation && (
              <div className={`${styles.detailItem} ${styles.detailFull}`}>
                <span className={styles.detailLabel}>Observações</span>
                <span className={styles.detailValue}>{selectedOrder.observation}</span>
              </div>
            )}
          </div>

          <Divider style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#888' }}>
            Produtos
          </Divider>

          <div className={styles.detailItems}>
            {(selectedOrder.items ?? []).map((item, i) => {
              const pending = Number(item.pendingQuantity ?? Number(item.quantity) - Number(item.receivedQuantity ?? 0))
              return (
                <div key={i} className={styles.detailItemRow}>
                  <div style={{ flex: 1 }}>
                    <div className={styles.detailItemName}>{item.productName ?? `Produto #${item.productId}`}</div>
                    <div className={styles.detailItemQty}>
                      Pedido: {Number(item.quantity).toLocaleString('pt-BR')} un ·
                      Recebido: {Number(item.receivedQuantity ?? 0).toLocaleString('pt-BR')} un
                      {Number(item.damagedQuantity ?? 0) > 0 && (
                        <span style={{ color: '#E24B4A' }}> · Avariado: {Number(item.damagedQuantity).toLocaleString('pt-BR')} un</span>
                      )}
                      {pending > 0 && (
                        <span style={{ color: '#F59E0B' }}> · Pendente: {pending.toLocaleString('pt-BR')} un</span>
                      )}
                    </div>
                    {item.damageReason && (
                      <div style={{ fontSize: 11, color: '#E24B4A', marginTop: 2 }}>Avaria: {item.damageReason}</div>
                    )}
                  </div>
                  <span className={styles.detailItemTotal}>
                    R$ {(Number(item.quantity) * Number(item.unitCost)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )
            })}
          </div>

          <Divider />
          <div className={styles.detailTotals}>
            <div className={styles.detailTotalRow}>
              <span>Total do Pedido</span>
              <span>{formatCurrency(Number(selectedOrder.totalAmount))}</span>
            </div>
          </div>
        </Drawer>
      )}

      {/* Drawer de form */}
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
