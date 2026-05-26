import { useState } from 'react'
import { App, Button, Input, Select, Tag, Tooltip, Popconfirm, Pagination, Empty, Spin, Modal, Form } from 'antd'
import { PlusOutlined, SearchOutlined, EyeOutlined,
  EditOutlined, CloseCircleOutlined, DollarOutlined,
  SendOutlined, CheckCircleOutlined, FileTextOutlined,
  TruckOutlined, CheckOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { useOrders, useDeleteOrder, useCancelOrder, useApproveOrder, useAwaitApprovalOrder, useFaturarOrder, useShipOrder, useDeliverOrder } from '../hooks/useOrders'
import OrderFormDrawer   from '../components/OrderFormDrawer'
import OrderDetailDrawer from '../components/OrderDetailDrawer'
import type { OrderResponse, OrderStatus } from '../types/order.types'
import { statusConfig, formatCurrency, formatDate } from '../utils/orderUtils'
import styles from './OrdersPage.module.css'

const statusFilterOptions = [
  { value: '',                     label: 'Todos os status'  },
  { value: 'DIGITACAO',            label: 'Digitação'        },
  { value: 'AGUARDANDO_APROVACAO', label: 'Ag. Aprovação'    },
  { value: 'APROVADO',             label: 'Aprovado'         },
  { value: 'FATURADO',             label: 'Faturado'         },
  { value: 'ENVIADO',              label: 'Enviado'          },
  { value: 'ENTREGUE',             label: 'Entregue'         },
  { value: 'CANCELADO',            label: 'Cancelado'        },
]

export default function OrdersPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const { has, isAdmin } = usePermission()
  const canWrite   = isAdmin || has('order:write')
  const canApprove = isAdmin || has('order:approve')
  const canInvoice = isAdmin || has('order:invoice')
  const [page,          setPage]          = useState(0)
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState<OrderStatus | ''>('')
  const [formOpen,           setFormOpen]           = useState(false)
  const [detailOpen,         setDetailOpen]         = useState(false)
  const [selectedOrder,      setSelectedOrder]      = useState<OrderResponse | null>(null)
  const [faturarModalOpen,   setFaturarModalOpen]   = useState(false)
  const [faturarOrderId,     setFaturarOrderId]     = useState<number | null>(null)
  const [faturarOrderTotal,  setFaturarOrderTotal]  = useState<number>(0)
  const [faturarPayMethod,   setFaturarPayMethod]   = useState<string | undefined>()
  const [faturarPayCond,     setFaturarPayCond]     = useState('')

  const { data, isLoading, isError, refetch } = useOrders(page, search)
  const deleteOrder     = useDeleteOrder()
  const cancelOrder     = useCancelOrder()
  const awaitApproval   = useAwaitApprovalOrder()
  const approveOrder    = useApproveOrder()
  const faturarOrder    = useFaturarOrder()
  const shipOrder       = useShipOrder()
  const deliverOrder    = useDeliverOrder()

  const orders = data?.content ?? []

  const filtered = orders.filter((o: OrderResponse) =>
    !statusFilter || o.status === statusFilter
  )

  const handleNew = () => {
    setSelectedOrder(null)
    setFormOpen(true)
  }

  const handleEdit = (order: OrderResponse) => {
    setSelectedOrder(order)
    setFormOpen(true)
  }

  const handleDetail = (order: OrderResponse) => {
    setSelectedOrder(order)
    setDetailOpen(true)
  }

  const handleFormClose = async () => {
    setFormOpen(false)
    setSelectedOrder(null)
    await refetch()
  }

  const handleDetailClose = () => {
    setDetailOpen(false)
    setSelectedOrder(null)
  }

  const handleAwaitApproval = async (id: number) => {
    await awaitApproval.mutateAsync(id)
    await refetch()
  }

  const handleApprove = async (id: number) => {
    await approveOrder.mutateAsync(id)
    await refetch()
  }

  const openFaturarModal = (order: OrderResponse) => {
    setFaturarOrderId(order.id)
    setFaturarOrderTotal(Number(order.totalAmount))
    setFaturarPayMethod(order.paymentMethod ?? undefined)
    setFaturarPayCond(order.paymentCondition ?? '')
    setFaturarModalOpen(true)
  }

  const handleFaturarConfirm = async () => {
    if (!faturarOrderId) return
    try {
      await faturarOrder.mutateAsync({ id: faturarOrderId, paymentMethod: faturarPayMethod, paymentCondition: faturarPayCond || undefined })
      setFaturarModalOpen(false)
      navigate('/payments/new', {
        state: {
          orderId:          faturarOrderId,
          orderTotal:       faturarOrderTotal,
          paymentMethod:    faturarPayMethod,
          paymentCondition: faturarPayCond || undefined,
        },
      })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      message.error(msg || 'Erro ao faturar pedido. Verifique o estoque e o caixa.')
    }
  }

  const handleShip = async (id: number) => {
    await shipOrder.mutateAsync(id)
    await refetch()
  }

  const handleDeliver = async (id: number) => {
    await deliverOrder.mutateAsync(id)
    await refetch()
  }

  const handleCancel = async (id: number) => {
    await cancelOrder.mutateAsync(id)
    await refetch()
  }

  const handleDelete = async (id: number) => {
    await deleteOrder.mutateAsync(id)
    await refetch()
  }

  const handlePayment = (order: OrderResponse) => {
    navigate('/payments', { state: { orderId: order.id, orderTotal: order.totalAmount } })
  }

  return (
    <div className={styles.root}>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchWrap}>
            <SearchOutlined className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar por cliente, vendedor ou código..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
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
        {canWrite && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={handleNew}
            className={styles.newBtn}
          >
            Novo Pedido
          </Button>
        )}
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Pedidos</span>
          <span className={styles.tableCount}>
            {isLoading ? '...' : `${data?.totalElements ?? 0} pedidos`}
          </span>
        </div>

        {isLoading ? (
          <div className={styles.centerState}><Spin size="large" /></div>
        ) : isError ? (
          <div className={styles.centerState}>
            <span className={styles.errorText}>Erro ao carregar pedidos. Tente novamente.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.centerState}>
            <Empty description="Nenhum pedido encontrado" />
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Produtos</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order: OrderResponse) => {
                  const status = statusConfig[order.status]
                  const isCanceled = order.status === 'CANCELADO'
                  return (
                    <tr key={order.id} className={isCanceled ? styles.rowCanceled : ''}>
                      <td className={styles.tdId}>#{order.id}</td>
                      <td className={styles.tdName}>{order.clientName}</td>
                      <td className={styles.tdSeller}>{order.sellerName}</td>
                      <td className={styles.tdProducts}>
                        {order.items.length === 0 ? (
                          <span className={styles.noItems}>—</span>
                        ) : order.items.length === 1 ? (
                          <span className={styles.productPill}>{order.items[0].productName}</span>
                        ) : (
                          <Tooltip
                            title={
                              <div>
                                {order.items.map((i) => (
                                  <div key={i.id} className={styles.tooltipItem}>
                                    {i.productName} × {Number(i.quantity).toLocaleString('pt-BR')}
                                  </div>
                                ))}
                              </div>
                            }
                          >
                            <span className={styles.productPill}>
                              {order.items[0].productName}
                              <span className={styles.morePills}>+{order.items.length - 1}</span>
                            </span>
                          </Tooltip>
                        )}
                      </td>
                      <td className={styles.tdDate}>{formatDate(order.createdAt)}</td>
                      <td>
                        <Tag color={status.antColor}>{status.label}</Tag>
                      </td>
                      <td className={styles.tdTotal}>
                        {formatCurrency(Number(order.totalAmount))}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <Tooltip title="Ver detalhes">
                            <button className={styles.actionBtn} onClick={() => handleDetail(order)}>
                              <EyeOutlined />
                            </button>
                          </Tooltip>

                          {order.status === 'DIGITACAO' && canWrite && (
                            <>
                              <Tooltip title="Editar">
                                <button className={styles.actionBtn} onClick={() => handleEdit(order)}>
                                  <EditOutlined />
                                </button>
                              </Tooltip>
                              <Popconfirm
                                title="Enviar para aprovação"
                                description="O pedido não poderá mais ser editado."
                                onConfirm={() => handleAwaitApproval(order.id)}
                                okText="Enviar"
                                cancelText="Cancelar"
                              >
                                <Tooltip title="Enviar p/ aprovação">
                                  <button className={`${styles.actionBtn} ${styles.actionPayment}`}>
                                    <SendOutlined />
                                  </button>
                                </Tooltip>
                              </Popconfirm>
                            </>
                          )}

                          {order.status === 'AGUARDANDO_APROVACAO' && canApprove && (
                            <Popconfirm
                              title="Aprovar pedido"
                              description="Confirma a aprovação deste pedido?"
                              onConfirm={() => handleApprove(order.id)}
                              okText="Aprovar"
                              cancelText="Cancelar"
                            >
                              <Tooltip title="Aprovar">
                                <button className={`${styles.actionBtn} ${styles.actionPayment}`}>
                                  <CheckCircleOutlined />
                                </button>
                              </Tooltip>
                            </Popconfirm>
                          )}

                          {order.status === 'APROVADO' && canInvoice && (
                            <Tooltip title="Faturar">
                              <button
                                className={`${styles.actionBtn} ${styles.actionPayment}`}
                                onClick={() => openFaturarModal(order)}
                              >
                                <FileTextOutlined />
                              </button>
                            </Tooltip>
                          )}

                          {(order.status === 'FATURADO' || order.status === 'ENVIADO') && (
                            <Tooltip title="Registrar pagamento">
                              <button
                                className={`${styles.actionBtn} ${styles.actionPayment}`}
                                onClick={() => handlePayment(order)}
                              >
                                <DollarOutlined />
                              </button>
                            </Tooltip>
                          )}

                          {order.status === 'FATURADO' && canWrite && (
                            <Popconfirm
                              title="Enviar para cliente"
                              description="Confirma que o pedido foi enviado ao cliente?"
                              onConfirm={() => handleShip(order.id)}
                              okText="Confirmar envio"
                              cancelText="Cancelar"
                            >
                              <Tooltip title="Enviar para cliente">
                                <button className={`${styles.actionBtn} ${styles.actionPayment}`}>
                                  <TruckOutlined />
                                </button>
                              </Tooltip>
                            </Popconfirm>
                          )}

                          {order.status === 'ENVIADO' && canWrite && (
                            <Popconfirm
                              title="Marcar como entregue"
                              description="Confirma que o pedido foi entregue ao cliente?"
                              onConfirm={() => handleDeliver(order.id)}
                              okText="Confirmar entrega"
                              cancelText="Cancelar"
                            >
                              <Tooltip title="Marcar como entregue">
                                <button className={`${styles.actionBtn} ${styles.actionSuccess}`}>
                                  <CheckOutlined />
                                </button>
                              </Tooltip>
                            </Popconfirm>
                          )}

                          {!isCanceled && order.status !== 'ENTREGUE' && canWrite && (
                            <Popconfirm
                              title="Cancelar pedido"
                              description="Tem certeza que deseja cancelar este pedido?"
                              onConfirm={() => handleCancel(order.id)}
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
          </div>
        )}

        {!isLoading && (data?.totalPages ?? 0) > 1 && (
          <div className={styles.pagination}>
            <Pagination
              current={(data?.number ?? 0) + 1}
              total={data?.totalElements ?? 0}
              pageSize={data?.size ?? 20}
              onChange={(p) => setPage(p - 1)}
              showSizeChanger={false}
              showTotal={(total) => `Total: ${total} pedidos`}
            />
          </div>
        )}
      </div>

      <OrderFormDrawer
        open={formOpen}
        order={selectedOrder}
        onClose={handleFormClose}
      />
      <OrderDetailDrawer
        open={detailOpen}
        order={selectedOrder}
        onClose={handleDetailClose}
      />

      <Modal
        open={faturarModalOpen}
        title="Faturar Pedido"
        okText="Confirmar Faturamento"
        cancelText="Cancelar"
        onCancel={() => setFaturarModalOpen(false)}
        onOk={handleFaturarConfirm}
        okButtonProps={{ loading: faturarOrder.isPending, disabled: !faturarPayMethod }}
        centered
      >
        <p style={{ marginBottom: 16, color: '#555' }}>
          O estoque será baixado e as parcelas financeiras serão geradas.
        </p>
        <Form layout="vertical">
          <Form.Item label="Forma de Pagamento" required>
            <Select
              value={faturarPayMethod}
              onChange={(v) => {
                setFaturarPayMethod(v)
                if (v === 'DINHEIRO' || v === 'PIX' || v === 'CARTAO_DEBITO') {
                  setFaturarPayCond('')
                }
              }}
              placeholder="Selecione a forma de pagamento"
              size="large"
              options={[
                { value: 'DINHEIRO',       label: 'Dinheiro'          },
                { value: 'PIX',            label: 'Pix'               },
                { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
                { value: 'CARTAO_DEBITO',  label: 'Cartão de Débito'  },
                { value: 'BOLETO',         label: 'Boleto'            },
                { value: 'TRANSFERENCIA',  label: 'Transferência'     },
                { value: 'CHEQUE',         label: 'Cheque'            },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Condição de Pagamento"
            style={{ marginBottom: 0 }}
            extra={
              <span style={{ minHeight: 20, display: 'block' }}>
                {faturarPayMethod === 'DINHEIRO' || faturarPayMethod === 'PIX' || faturarPayMethod === 'CARTAO_DEBITO'
                  ? 'Pagamento à vista — vencimento gerado para hoje.'
                  : 'Ex: 30 (30 dias), 30/60 (parcelado). Vazio = à vista.'}
              </span>
            }
          >
            <Input
              value={faturarPayCond}
              onChange={e => setFaturarPayCond(e.target.value)}
              placeholder="Deixe vazio para à vista"
              size="large"
              disabled={faturarPayMethod === 'DINHEIRO' || faturarPayMethod === 'PIX' || faturarPayMethod === 'CARTAO_DEBITO'}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}