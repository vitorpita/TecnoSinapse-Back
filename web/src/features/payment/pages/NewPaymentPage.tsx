import { useNavigate, useLocation } from 'react-router-dom'
import { App, Alert, Button, Form, Input, InputNumber, Row, Col, Select } from 'antd'
import { MoneyInput } from '@/components/MoneyInput'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentService, type PaymentMethod } from '../paymentService'
import { cashRegisterService } from '@/features/cash-register/cashRegisterService'
import styles from './NewPaymentPage.module.css'

interface MethodOption {
  value:       string
  label:       string
  backend:     PaymentMethod
  installable: boolean
}

const PAYMENT_METHODS: MethodOption[] = [
  { value: 'DINHEIRO',          label: 'Dinheiro',                    backend: 'DINHEIRO',       installable: false },
  { value: 'PIX_AVISTA',        label: 'PIX à Vista',                 backend: 'PIX',            installable: false },
  { value: 'CREDITO_AVISTA',    label: 'Cartão de Crédito à Vista',   backend: 'CARTAO_CREDITO', installable: false },
  { value: 'DEBITO',            label: 'Cartão de Débito',            backend: 'CARTAO_DEBITO',  installable: false },
  { value: 'TRANSFERENCIA',     label: 'Transferência',               backend: 'TRANSFERENCIA',  installable: false },
  { value: 'BOLETO_AVISTA',     label: 'Boleto à Vista',              backend: 'BOLETO',         installable: false },
  { value: 'PIX_PARCELADO',     label: 'PIX Parcelado',               backend: 'PIX',            installable: true  },
  { value: 'CREDITO_PARCELADO', label: 'Cartão de Crédito Parcelado', backend: 'CARTAO_CREDITO', installable: true  },
  { value: 'BOLETO_PARCELADO',  label: 'Boleto Parcelado',            backend: 'BOLETO',         installable: true  },
  { value: 'CHEQUE',            label: 'Cheque',                      backend: 'CHEQUE',         installable: true  },
]

const METHOD_MAP = Object.fromEntries(PAYMENT_METHODS.map(m => [m.value, m]))

const BACKEND_TO_METHOD_KEY: Record<string, string> = {
  DINHEIRO:       'DINHEIRO',
  PIX:            'PIX_AVISTA',
  CARTAO_CREDITO: 'CREDITO_AVISTA',
  CARTAO_DEBITO:  'DEBITO',
  BOLETO:         'BOLETO_AVISTA',
  TRANSFERENCIA:  'TRANSFERENCIA',
  CHEQUE:         'CHEQUE',
}

const METHOD_SELECT_OPTIONS = [
  {
    label: 'À Vista',
    options: PAYMENT_METHODS.filter(m => !m.installable).map(m => ({ value: m.value, label: m.label })),
  },
  {
    label: 'Parcelado',
    options: PAYMENT_METHODS.filter(m => m.installable).map(m => ({ value: m.value, label: m.label })),
  },
]

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function toDateTime(date?: string): string | undefined {
  if (!date) return undefined
  return date.includes('T') ? date : `${date}T00:00:00`
}

function formatCurrency(v?: number) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

const fieldLabel = (text: string) => <span className={styles.fieldLabel}>{text}</span>

interface RouteState {
  orderId?:          number
  orderTotal?:       number
  paymentMethod?:    string
  paymentCondition?: string
}

export default function NewPaymentPage() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const pre         = (location.state ?? {}) as RouteState
  const { message } = App.useApp()
  const qc          = useQueryClient()
  const [form]      = Form.useForm()

  const preMethodKey = pre.paymentMethod ? BACKEND_TO_METHOD_KEY[pre.paymentMethod] : undefined

  const methodWatch      = Form.useWatch('methodKey',     form) as string | undefined
  const installmentsWatch = Form.useWatch('installments', form) as number | undefined
  const amountWatch      = Form.useWatch('amount',        form) as number | undefined
  const intervalWatch    = Form.useWatch('intervalDays',  form) as number | undefined
  const orderIdWatch     = Form.useWatch('orderId',       form) as number | undefined
  const dueDateWatch     = Form.useWatch('dueDate',       form) as string | undefined
  const installDatesWatch = Form.useWatch('installmentDates', form) as string[] | undefined

  const selectedMethod    = methodWatch ? METHOD_MAP[methodWatch] : undefined
  const installable       = selectedMethod?.installable ?? true
  const installmentsCount = installable ? Math.max(1, Math.min(24, installmentsWatch ?? 1)) : 1
  const perInstallment    = amountWatch && installmentsCount > 0 ? amountWatch / installmentsCount : 0
  const firstDueDate      = installmentsCount > 1 ? installDatesWatch?.[0] : dueDateWatch

  const { data: currentCash, isLoading: loadingCash } = useQuery({
    queryKey: ['cash-current'],
    queryFn:  cashRegisterService.getCurrentCash,
  })

  const createMutation = useMutation({
    mutationFn: paymentService.create,
    onSuccess: () => {
      message.success('Pagamento criado com sucesso!')
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['cash-current'] })
      qc.invalidateQueries({ queryKey: ['cash-history'] })
      navigate('/payments')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao criar pagamento.')
    },
  })

  const onFinish = (values: Record<string, unknown>) => {
    const method    = METHOD_MAP[values.methodKey as string]
    const n         = installable ? installmentsCount : 1
    const dates     = values.installmentDates as string[] | undefined
    const dueDates  = n > 1 ? (dates ?? []).filter(Boolean) : undefined
    const singleDue = values.dueDate as string | undefined
    const paidAt    = n === 1 ? singleDue : dueDates?.[0]

    createMutation.mutate({
      orderId:             values.orderId as number,
      paymentMethod:       method.backend,
      amount:              values.amount as number,
      installments:        n,
      paidAt:              toDateTime(paidAt),
      dueDate:             toDateTime(singleDue),
      installmentDueDates: dueDates?.length ? dueDates.map(d => toDateTime(d)!) : undefined,
      observation:         values.notes as string | undefined,
    })
  }

  const recalcDates = (n: number, interval: number) => {
    form.setFieldValue('installmentDates', Array.from({ length: n }, (_, i) => addDays(interval * (i + 1))))
  }

  const handleMethodChange = (key: string) => {
    if (!METHOD_MAP[key]?.installable) form.setFieldValue('installments', 1)
  }

  const handleInstallmentsChange = (val: number | null) => {
    const n        = Math.max(1, Math.min(24, val ?? 1))
    const interval = Math.max(1, intervalWatch ?? 30)
    if (n > 1) recalcDates(n, interval)
  }

  const handleIntervalChange = (val: number | null) => {
    const interval = Math.max(1, val ?? 30)
    if (installmentsCount > 1) recalcDates(installmentsCount, interval)
  }

  return (
    <div className={styles.root}>

      {!loadingCash && !currentCash && (
        <Alert
          type="error"
          showIcon
          message="Caixa fechado"
          description="Nenhum caixa está aberto. Não é possível registrar pagamentos sem um caixa aberto. Abra o caixa antes de processar pagamentos."
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* ── Header ─────────────────────────── */}
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate('/payments')}>
          <ArrowLeftOutlined /> Voltar para pagamentos
        </button>
        <h1 className={styles.pageTitle}>Novo Pagamento</h1>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark
        initialValues={{
          installments: 1,
          intervalDays: 30,
          orderId:      pre.orderId,
          amount:       pre.orderTotal,
          methodKey:    preMethodKey,
        }}
      >
        <div className={styles.layout}>

          <div className={styles.mainCol}>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Identificação do Pedido</div>
              <Form.Item
                name="orderId"
                label={fieldLabel('Número do Pedido')}
                rules={[{ required: true, message: 'Informe o número do pedido' }]}
              >
                <InputNumber
                  placeholder="Ex: 42"
                  size="large"
                  min={1}
                  style={{ width: '100%' }}
                  prefix={<span className={styles.inputPrefix}>#</span>}
                />
              </Form.Item>
            </div>

            {/* Condições */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Condições de Pagamento</div>

              <Form.Item
                name="methodKey"
                label={fieldLabel('Método de Pagamento')}
                rules={[{ required: true, message: 'Selecione o método' }]}
              >
                <Select
                  size="large"
                  placeholder="Selecione o método..."
                  onChange={handleMethodChange}
                  options={METHOD_SELECT_OPTIONS}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="amount"
                    label={fieldLabel('Valor Total (R$)')}
                    rules={[{ required: true, message: 'Informe o valor' }]}
                  >
                    <MoneyInput
                      min={0.01}
                      size="large" style={{ width: '100%' }}
                      placeholder="0,00"
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="installments" label={fieldLabel('Parcelas')}>
                    <InputNumber
                      min={1} max={24} size="large" style={{ width: '100%' }}
                      disabled={!installable}
                      onChange={handleInstallmentsChange}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="intervalDays"
                    label={fieldLabel('Intervalo (dias)')}
                    tooltip="Dias entre cada parcela"
                  >
                    <InputNumber
                      min={1} max={365} size="large" style={{ width: '100%' }}
                      disabled={!installable || installmentsCount <= 1}
                      onChange={handleIntervalChange}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {installmentsCount === 1 && (
                <Form.Item
                  name="dueDate"
                  label={fieldLabel('Data de Vencimento')}
                  initialValue={addDays(30)}
                  getValueFromEvent={(e: React.ChangeEvent<HTMLInputElement>) => e.target.value}
                >
                  <input type="date" className={styles.dateInput} />
                </Form.Item>
              )}
            </div>

            {/* Parcelas individuais */}
            {installmentsCount > 1 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Datas das Parcelas</div>
                <div className={styles.installmentsList}>
                  {Array.from({ length: installmentsCount }).map((_, i) => {
                    const isLast = i === installmentsCount - 1
                    const amt    = isLast
                      ? (amountWatch ?? 0) - perInstallment * (installmentsCount - 1)
                      : perInstallment

                    return (
                      <div key={i} className={styles.installmentRow}>
                        <div className={styles.installmentBadge}>{i + 1}</div>
                        <div className={styles.installmentInfo}>
                          <span className={styles.installmentLabel}>Parcela {i + 1} de {installmentsCount}</span>
                          <span className={styles.installmentAmt}>{formatCurrency(amt)}</span>
                        </div>
                        <Form.Item
                          name={['installmentDates', i]}
                          style={{ margin: 0 }}
                          initialValue={addDays((intervalWatch ?? 30) * (i + 1))}
                          getValueFromEvent={(e: React.ChangeEvent<HTMLInputElement>) => e.target.value}
                        >
                          <input type="date" className={styles.dateInput} />
                        </Form.Item>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Observações */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Observações</div>
              <Form.Item name="notes" style={{ marginBottom: 0 }}>
                <Input.TextArea
                  placeholder="Informações adicionais sobre este pagamento..."
                  rows={4}
                  style={{ resize: 'none' }}
                />
              </Form.Item>
            </div>

          </div>

          {/* ── Sidebar ────────────────────── */}
          <div className={styles.sideCol}>

            {/* Resumo */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Resumo</div>

              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Pedido</span>
                  <span className={styles.summaryValue}>
                    {orderIdWatch ? `#${orderIdWatch}` : <span className={styles.summaryEmpty}>—</span>}
                  </span>
                </div>

                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Método</span>
                  <span className={styles.summaryValue}>
                    {selectedMethod
                      ? <span className={styles.methodBadge}>{selectedMethod.label}</span>
                      : <span className={styles.summaryEmpty}>—</span>}
                  </span>
                </div>

                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Valor Total</span>
                  <span className={`${styles.summaryValue} ${styles.summaryHighlight}`}>
                    {amountWatch ? formatCurrency(amountWatch) : <span className={styles.summaryEmpty}>—</span>}
                  </span>
                </div>

                {installmentsCount > 1 && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Parcelamento</span>
                    <span className={styles.summaryValue}>
                      {installmentsCount}x {amountWatch ? formatCurrency(perInstallment) : '—'}
                    </span>
                  </div>
                )}

                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>1º Vencimento</span>
                  <span className={styles.summaryValue}>
                    {firstDueDate ? formatDate(firstDueDate) : <span className={styles.summaryEmpty}>—</span>}
                  </span>
                </div>
              </div>

              {/* Barra de progresso do valor por parcela */}
              {installmentsCount > 1 && amountWatch && (
                <div className={styles.installmentProgress}>
                  {Array.from({ length: installmentsCount }).map((_, i) => (
                    <div
                      key={i}
                      className={styles.installmentProgressBar}
                      style={{ flex: 1, opacity: 0.4 + (i / installmentsCount) * 0.6 }}
                      title={`Parcela ${i + 1}: ${formatCurrency(perInstallment)}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className={styles.actionsBox}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={createMutation.isPending}
                disabled={!currentCash}
                block
                size="large"
                className={styles.submitBtn}
              >
                Criar Pagamento
              </Button>
              <Button
                block
                size="large"
                onClick={() => navigate('/payments')}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
            </div>

          </div>
        </div>
      </Form>
    </div>
  )
}
