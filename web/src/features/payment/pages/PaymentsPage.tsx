import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Drawer, Form, InputNumber, Pagination, Select, Spin, Tag, Tooltip, Empty, Divider } from 'antd'
import { PlusOutlined, SearchOutlined, EyeOutlined, DollarOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentService, type PaymentRecord, type PaymentStatus, type PaymentMethod } from '../paymentService'
import styles from './PaymentsPage.module.css'

// ── Constantes ───────────────────────────────────────────────────────────────

const REGISTER_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'DINHEIRO',       label: 'Dinheiro'              },
  { value: 'PIX',            label: 'PIX'                   },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito'     },
  { value: 'CARTAO_DEBITO',  label: 'Cartão de Débito'      },
  { value: 'TRANSFERENCIA',  label: 'Transferência'         },
  { value: 'BOLETO',         label: 'Boleto'                },
  { value: 'CHEQUE',         label: 'Cheque'                },
]

const METHOD_LABELS: Record<PaymentMethod, string> = {
  DINHEIRO:       'Dinheiro',
  PIX:            'PIX',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO:  'Cartão de Débito',
  TRANSFERENCIA:  'Transferência',
  BOLETO:         'Boleto',
  CHEQUE:         'Cheque',
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string }> = {
  PENDENTE:  { label: 'Pendente',  color: 'warning'    },
  PARCIAL:   { label: 'Parcial',   color: 'processing' },
  PAGO:      { label: 'Pago',      color: 'success'    },
  ATRASADO:  { label: 'Atrasado',  color: 'error'      },
  CANCELADO: { label: 'Cancelado', color: 'default'    },
}

const statusFilterOptions = [
  { value: '',          label: 'Todos os status' },
  { value: 'PENDENTE',  label: 'Pendentes'       },
  { value: 'PAGO',      label: 'Pagos'           },
  { value: 'PARCIAL',   label: 'Parciais'        },
  { value: 'ATRASADO',  label: 'Atrasados'       },
  { value: 'CANCELADO', label: 'Cancelados'      },
]

// ── Utilitários ──────────────────────────────────────────────────────────────

function fmt(v?: number) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function fmtDoc(doc?: string) {
  if (!doc) return '—'
  const d = doc.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return doc
}

function toDateTime(date?: string): string | undefined {
  if (!date) return undefined
  return date.includes('T') ? date : `${date}T00:00:00`
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { message }  = App.useApp()
  const navigate     = useNavigate()
  const qc           = useQueryClient()

  const [page,            setPage]            = useState(0)
  const [search,          setSearch]          = useState('')
  const [statusFilter,    setStatusFilter]    = useState<PaymentStatus | ''>('')
  const [detailDrawer,    setDetailDrawer]    = useState(false)
  const [registerDrawer,  setRegisterDrawer]  = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null)

  const [registerForm] = Form.useForm()

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ['payments', page, statusFilter],
    queryFn:  () => paymentService.list(page, 20, statusFilter || undefined),
  })

  // ── Mutations ────────────────────────────────────────────────────────────────

  const registerMutation = useMutation({
    mutationFn: paymentService.registerPayment,
    onSuccess: () => {
      message.success('Pagamento registrado com sucesso!')
      qc.invalidateQueries({ queryKey: ['payments'] })
      setRegisterDrawer(false)
      setDetailDrawer(false)
      registerForm.resetFields()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao registrar pagamento.')
    },
  })

  // ── Dados derivados ──────────────────────────────────────────────────────────

  const payments = data?.content ?? []

  const filtered = payments.filter((p: PaymentRecord) => {
    const matchesSearch = !search ||
      String(p.orderId).includes(search) ||
      p.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      p.clientDocument?.includes(search)
    const matchesStatus = !statusFilter || p.paymentStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPendente = payments
    .filter(p => p.paymentStatus === 'PENDENTE')
    .reduce((a, p) => a + (p.pending ?? 0), 0)

  const totalPago = payments
    .filter(p => p.paymentStatus === 'PAGO')
    .reduce((a, p) => a + (p.totalOrderAmount ?? 0), 0)

  const totalAtrasado = payments
    .filter(p => p.paymentStatus === 'ATRASADO')
    .reduce((a, p) => a + (p.pending ?? 0), 0)

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const openDetail = (payment: PaymentRecord) => {
    setSelectedPayment(payment)
    setDetailDrawer(true)
  }

  const openRegister = (payment: PaymentRecord) => {
    setSelectedPayment(payment)
    registerForm.setFieldsValue({
      amount:  payment.pending,
      paidAt:  new Date().toISOString().split('T')[0],
    })
    setRegisterDrawer(true)
  }

  const onRegisterPayment = (values: Record<string, unknown>) => {
    if (!selectedPayment) return
    registerMutation.mutate({
      orderId:       selectedPayment.orderId,
      amount:        values.amount as number,
      paymentMethod: values.paymentMethod as PaymentMethod,
      paidAt:        toDateTime(values.paidAt as string) ?? new Date().toISOString(),
    })
  }

  const canRegister = (p: PaymentRecord) =>
    p.paymentStatus !== 'PAGO' && p.paymentStatus !== 'CANCELADO'

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>

      {/* Resumo */}
      <div className={styles.cards}>
        {[
          { label: 'Total Pendente',   value: fmt(totalPendente),               accent: '#F59E0B' },
          { label: 'Total Recebido',   value: fmt(totalPago),                   accent: '#1D9E75' },
          { label: 'Total Atrasado',   value: fmt(totalAtrasado),               accent: '#E24B4A' },
          { label: 'Total de Títulos', value: String(data?.totalElements ?? 0), accent: '#378ADD' },
        ].map(card => (
          <div key={card.label} className={styles.card} style={{ borderTopColor: card.accent }}>
            <span className={styles.cardLabel}>{card.label}</span>
            <span className={styles.cardValue} style={{ color: card.accent }}>{card.value}</span>
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
              placeholder="Buscar por pedido, cliente ou documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(0) }}
            options={statusFilterOptions}
            style={{ width: 180 }}
            size="large"
          />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate('/payments/new')}
          className={styles.newBtn}
        >
          Novo Pagamento
        </Button>
      </div>

      {/* Tabela */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Recebimentos</span>
          <span className={styles.tableCount}>
            {isLoading ? '...' : `${data?.totalElements ?? 0} títulos`}
          </span>
        </div>

        {isLoading ? (
          <div className={styles.centerState}><Spin size="large" /></div>
        ) : isError ? (
          <div className={styles.centerState}>
            <span className={styles.errorText}>Erro ao carregar pagamentos.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.centerState}>
            <Empty description="Nenhum pagamento encontrado" />
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Método</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Pendente</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: PaymentRecord) => (
                <tr key={p.id}>
                  <td className={styles.tdOrder}>#{p.orderId}</td>
                  <td className={styles.tdClient}>
                    <div className={styles.clientCell}>
                      <span>{p.clientName ?? '—'}</span>
                      {p.clientDocument && (
                        <span className={styles.clientDoc}>{fmtDoc(p.clientDocument)}</span>
                      )}
                    </div>
                  </td>
                  <td>{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</td>
                  <td className={styles.tdAmount}>{fmt(p.totalOrderAmount)}</td>
                  <td className={styles.tdAmount} style={{ color: '#1D9E75' }}>{fmt(p.totalPaid)}</td>
                  <td className={styles.tdAmount} style={{ color: (p.pending ?? 0) > 0 ? '#E24B4A' : '#1D9E75' }}>
                    {fmt(p.pending)}
                  </td>
                  <td className={styles.tdDate}>{fmtDate(p.paidAt)}</td>
                  <td>
                    <Tag color={STATUS_CONFIG[p.paymentStatus]?.color ?? 'default'}>
                      {STATUS_CONFIG[p.paymentStatus]?.label ?? p.paymentStatus}
                    </Tag>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Tooltip title="Ver detalhes">
                        <button className={styles.actionBtn} onClick={() => openDetail(p)}>
                          <EyeOutlined />
                        </button>
                      </Tooltip>
                      {canRegister(p) && (
                        <Tooltip title="Registrar pagamento">
                          <button
                            className={`${styles.actionBtn} ${styles.actionSuccess}`}
                            onClick={() => openRegister(p)}
                          >
                            <DollarOutlined />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
              showTotal={(t) => `Total: ${t} títulos`}
            />
          </div>
        )}
      </div>

      {/* ── Drawer: Detalhes ─────────────────────────── */}
      {selectedPayment && (
        <Drawer
          title={
            <div>
              <div className={styles.drawerTitle}>Pagamento #{selectedPayment.id}</div>
              <Tag color={STATUS_CONFIG[selectedPayment.paymentStatus]?.color ?? 'default'} style={{ marginTop: 4 }}>
                {STATUS_CONFIG[selectedPayment.paymentStatus]?.label ?? selectedPayment.paymentStatus}
              </Tag>
            </div>
          }
          open={detailDrawer}
          onClose={() => setDetailDrawer(false)}
          width={500}
        >
          {/* Cliente */}
          <Divider orientation="left" className={styles.drawerDivider}>Cliente</Divider>
          <div className={styles.detailGrid}>
            <DetailRow label="Nome"      value={selectedPayment.clientName} />
            <DetailRow label="Documento" value={fmtDoc(selectedPayment.clientDocument)} />
            <DetailRow label="E-mail"    value={selectedPayment.clientEmail} />
            <DetailRow label="Telefone"  value={selectedPayment.clientPhone} />
          </div>

          {/* Pedido */}
          <Divider orientation="left" className={styles.drawerDivider}>Pedido</Divider>
          <div className={styles.detailGrid}>
            <DetailRow label="Nº do Pedido" value={`#${selectedPayment.orderId}`} />
            <DetailRow label="Status Pedido" value={selectedPayment.orderStatus} />
          </div>

          {/* Pagamento */}
          <Divider orientation="left" className={styles.drawerDivider}>Pagamento</Divider>
          <div className={styles.detailGrid}>
            <DetailRow label="Método"     value={METHOD_LABELS[selectedPayment.paymentMethod] ?? selectedPayment.paymentMethod} />
            <DetailRow label="Vencimento" value={fmtDate(selectedPayment.paidAt)} />
            <DetailRow label="Registrado" value={fmtDate(selectedPayment.createdAt)} />
            {selectedPayment.observation && (
              <DetailRow label="Observação" value={selectedPayment.observation} />
            )}
          </div>

          {/* Valores */}
          <Divider orientation="left" className={styles.drawerDivider}>Valores</Divider>
          <div className={styles.amountGrid}>
            <div className={styles.amountCard}>
              <span className={styles.amountLabel}>Total do Pedido</span>
              <span className={styles.amountValue}>{fmt(selectedPayment.totalOrderAmount)}</span>
            </div>
            <div className={styles.amountCard} style={{ borderColor: '#1D9E75' }}>
              <span className={styles.amountLabel}>Já Pago</span>
              <span className={styles.amountValue} style={{ color: '#1D9E75' }}>{fmt(selectedPayment.totalPaid)}</span>
            </div>
            <div className={styles.amountCard} style={{ borderColor: (selectedPayment.pending ?? 0) > 0 ? '#E24B4A' : '#1D9E75' }}>
              <span className={styles.amountLabel}>Pendente</span>
              <span className={styles.amountValue} style={{ color: (selectedPayment.pending ?? 0) > 0 ? '#E24B4A' : '#1D9E75' }}>
                {fmt(selectedPayment.pending)}
              </span>
            </div>
          </div>

          {canRegister(selectedPayment) && (
            <Button
              type="primary" block size="large" icon={<DollarOutlined />}
              style={{ marginTop: 24, background: '#042C53', borderColor: '#042C53' }}
              onClick={() => openRegister(selectedPayment)}
            >
              Registrar Pagamento
            </Button>
          )}
        </Drawer>
      )}

      {/* ── Drawer: Registrar Pagamento ──────────────── */}
      <Drawer
        title={<span className={styles.drawerTitle}>Registrar Pagamento</span>}
        open={registerDrawer}
        onClose={() => { setRegisterDrawer(false); registerForm.resetFields() }}
        width={420}
        maskClosable={false}
        footer={
          <div className={styles.drawerFooter}>
            <Button
              onClick={() => { setRegisterDrawer(false); registerForm.resetFields() }}
              disabled={registerMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              loading={registerMutation.isPending}
              onClick={() => registerForm.submit()}
              className={styles.saveBtn}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        {selectedPayment && (
          <div className={styles.registerSummary}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Cliente</span>
              <span className={styles.detailValue}>{selectedPayment.clientName}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Pedido</span>
              <span className={styles.detailValue}>#{selectedPayment.orderId}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Saldo Pendente</span>
              <span className={styles.detailValue} style={{ color: '#E24B4A', fontWeight: 700 }}>
                {fmt(selectedPayment.pending)}
              </span>
            </div>
          </div>
        )}

        <Form form={registerForm} layout="vertical" onFinish={onRegisterPayment} requiredMark={false}>
          <Form.Item
            name="paymentMethod"
            label={<span className={styles.fieldLabel}>Método de Pagamento</span>}
            rules={[{ required: true, message: 'Selecione o método' }]}
          >
            <Select options={REGISTER_METHODS} size="large" placeholder="Selecione..." />
          </Form.Item>

          <Form.Item
            name="amount"
            label={<span className={styles.fieldLabel}>Valor Recebido (R$)</span>}
            rules={[{ required: true, message: 'Informe o valor' }]}
          >
            <InputNumber
              min={0.01} step={0.01} precision={2}
              size="large" style={{ width: '100%' }}
              prefix="R$"
            />
          </Form.Item>

          <Form.Item
            name="paidAt"
            label={<span className={styles.fieldLabel}>Data do Pagamento</span>}
            rules={[{ required: true, message: 'Informe a data' }]}
            initialValue={new Date().toISOString().split('T')[0]}
            getValueFromEvent={(e: React.ChangeEvent<HTMLInputElement>) => e.target.value}
          >
            <input type="date" className={styles.dateInput} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

// ── Sub-componente ────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  )
}
