import { useState } from 'react'
import { App, Button, Drawer, Form, Select, InputNumber, Input,
         Modal, Popconfirm, Tag, Tooltip, Spin, Empty, Pagination } from 'antd'
import { PlusOutlined, SearchOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { stockMovementService, type StockMovementRecord, type MovementType } from '../stockMovementService'
import styles from './StockMovementsPage.module.css'

const { TextArea } = Input

const TYPE_CONFIG: Record<MovementType, { label: string; color: string; icon: React.ReactNode }> = {
  ENTRADA: { label: 'Entrada', color: 'green',  icon: <ArrowDownOutlined /> },
  SAIDA:   { label: 'Saída',   color: 'red',    icon: <ArrowUpOutlined />   },
}

const REF_TYPE_LABELS: Record<string, string> = {
  ORDER:       'Pedido de Venda',
  PURCHASE:    'Compra',
  CUT_ORDER:   'Ordem de Corte',
  MANUAL:      'Manual',
  ADJUSTMENT:  'Ajuste',
}

const typeFilterOptions = [
  { value: '',        label: 'Todos os tipos' },
  { value: 'ENTRADA', label: 'Entradas'       },
  { value: 'SAIDA',   label: 'Saídas'         },
]

const movementTypeOptions = [
  { value: 'ENTRADA', label: '⬇ Entrada — Aumenta o estoque'  },
  { value: 'SAIDA',   label: '⬆ Saída — Reduz o estoque'      },
]

const reasonOptions = [
  { value: 'Compra de mercadoria',          label: 'Compra de mercadoria'          },
  { value: 'Devolução de cliente',          label: 'Devolução de cliente'          },
  { value: 'Ajuste de inventário',          label: 'Ajuste de inventário'          },
  { value: 'Venda',                         label: 'Venda'                         },
  { value: 'Perda / Avaria',                label: 'Perda / Avaria'                },
  { value: 'Transferência entre filiais',   label: 'Transferência entre filiais'   },
  { value: 'Brinde / Amostra',              label: 'Brinde / Amostra'              },
  { value: 'Outro',                         label: 'Outro'                         },
]

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function StockMovementsPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()

  const [page,        setPage]        = useState(0)
  const [search,      setSearch]      = useState('')
  const [typeFilter,  setTypeFilter]  = useState('')
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [customReason, setCustomReason] = useState(false)

  const [form] = Form.useForm()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stock-movements', page],
    queryFn:  () => stockMovementService.list(page),
  })

  const { data: productsData } = useQuery({
    queryKey: ['stock-products'],
    queryFn:  stockMovementService.getProducts,
    staleTime: 1000 * 60 * 5,
  })

  const createMutation = useMutation({
    mutationFn: stockMovementService.create,
    onSuccess: () => {
      message.success('Movimentação registrada com sucesso!')
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      forceClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao registrar movimentação.')
    },
  })

  const movements = data?.content ?? []
  const products  = productsData?.content ?? []

  const filtered = movements.filter((m: StockMovementRecord) => {
    const matchSearch = !search ||
      m.productName?.toLowerCase().includes(search.toLowerCase()) ||
      m.reason?.toLowerCase().includes(search.toLowerCase()) ||
      m.createdBy?.toLowerCase().includes(search.toLowerCase())
    const matchType = !typeFilter || m.type === typeFilter
    return matchSearch && matchType
  })

  // Totalizadores
  const totalEntradas = movements.filter(m => m.type === 'ENTRADA').reduce((a, m) => a + Number(m.quantity), 0)
  const totalSaidas   = movements.filter(m => m.type === 'SAIDA').reduce((a, m) => a + Number(m.quantity), 0)
  const totalMov      = data?.totalElements ?? 0

  const handleCloseRequest = () => {
    const values = form.getFieldsValue()
    const hasData = Object.values(values).some(v => !!v)
    if (hasData) setConfirmClose(true)
    else forceClose()
  }

  const forceClose = () => {
    setDrawerOpen(false)
    setConfirmClose(false)
    setCustomReason(false)
    form.resetFields()
  }

  const onFinish = (values: { productId: number; type: MovementType; quantity: number; reason: string; customReason?: string }) => {
    createMutation.mutate({
      productId: values.productId,
      type:      values.type,
      quantity:  values.quantity,
      reason:    values.reason === 'Outro' ? (values.customReason ?? 'Outro') : values.reason,
    })
  }

  const selectedProductId = Form.useWatch('productId', form)
  const selectedProduct   = products.find(p => p.id === selectedProductId)
  const saving            = createMutation.isPending

  return (
    <div className={styles.root}>

      {/* ── Cards de resumo ───────────────────────── */}
      <div className={styles.cards}>
        {[
          { label: 'Total de Movimentações', value: String(totalMov),                                    accent: '#042C53' },
          { label: 'Total de Entradas',      value: totalEntradas.toLocaleString('pt-BR') + ' un.',      accent: '#1D9E75' },
          { label: 'Total de Saídas',        value: totalSaidas.toLocaleString('pt-BR') + ' un.',        accent: '#E24B4A' },
          { label: 'Saldo do Período',       value: (totalEntradas - totalSaidas).toLocaleString('pt-BR') + ' un.', accent: '#378ADD' },
        ].map(card => (
          <div key={card.label} className={styles.card} style={{ borderTopColor: card.accent }}>
            <span className={styles.cardLabel}>{card.label}</span>
            <span className={styles.cardValue}>{isLoading ? '...' : card.value}</span>
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
              placeholder="Buscar por produto, motivo ou usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeFilterOptions}
            style={{ width: 160 }}
            size="large"
          />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setDrawerOpen(true)}
          className={styles.newBtn}
        >
          Nova Movimentação
        </Button>
      </div>

      {/* ── Tabela ───────────────────────────────── */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Movimentações de Estoque</span>
          <span className={styles.tableCount}>
            {isLoading ? '...' : `${data?.totalElements ?? 0} movimentações`}
          </span>
        </div>

        {isLoading ? (
          <div className={styles.centerState}><Spin size="large" /></div>
        ) : isError ? (
          <div className={styles.centerState}><span className={styles.errorText}>Erro ao carregar movimentações.</span></div>
        ) : filtered.length === 0 ? (
          <div className={styles.centerState}><Empty description="Nenhuma movimentação encontrada" /></div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Motivo</th>
                <th>Referência</th>
                <th>Usuário</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m: StockMovementRecord) => {
                const type = TYPE_CONFIG[m.type]
                return (
                  <tr key={m.id}>
                    <td className={styles.tdId}>#{m.id}</td>
                    <td className={styles.tdProduct}>{m.productName}</td>
                    <td>
                      <Tag color={type.color} icon={type.icon}>{type.label}</Tag>
                    </td>
                    <td>
                      <span className={m.type === 'ENTRADA' ? styles.qtyIn : styles.qtyOut}>
                        {m.type === 'ENTRADA' ? '+' : '-'}{Number(m.quantity).toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className={styles.tdReason}>{m.reason}</td>
                    <td className={styles.tdRef}>
                      {m.referenceType ? (
                        <span className={styles.refBadge}>
                          {REF_TYPE_LABELS[m.referenceType] ?? m.referenceType}
                          {m.referenceId ? ` #${m.referenceId}` : ''}
                        </span>
                      ) : <span className={styles.empty}>—</span>}
                    </td>
                    <td className={styles.tdUser}>{m.createdBy || '—'}</td>
                    <td className={styles.tdDate}>{formatDate(m.createdAt)}</td>
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
              showTotal={(t) => `Total: ${t} movimentações`}
            />
          </div>
        )}
      </div>

      {/* ── Drawer ───────────────────────────────── */}
      <Drawer
        title={<span className={styles.drawerTitle}>Nova Movimentação Manual</span>}
        open={drawerOpen}
        onClose={handleCloseRequest}
        width={480}
        maskClosable={false}
        keyboard={false}
        footer={
          <div className={styles.drawerFooter}>
            <Button onClick={handleCloseRequest} disabled={saving}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()} className={styles.saveBtn}>
              Registrar movimentação
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>

          {/* Produto */}
          <Form.Item
            name="productId"
            label={<span className={styles.fieldLabel}>Produto</span>}
            rules={[{ required: true, message: 'Selecione o produto' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Buscar produto..."
              size="large"
              options={products.map(p => ({
                value: p.id,
                label: `${p.name}${p.sku ? ` — ${p.sku}` : ''}`,
              }))}
            />
          </Form.Item>

          {/* Estoque atual */}
          {selectedProduct && (
            <div className={styles.stockInfo}>
              <span className={styles.stockInfoLabel}>Estoque atual</span>
              <span className={`${styles.stockInfoValue} ${Number(selectedProduct.stockQuantity) <= 0 ? styles.stockEmpty : styles.stockOk}`}>
                {Number(selectedProduct.stockQuantity).toLocaleString('pt-BR')} unidades
              </span>
            </div>
          )}

          {/* Tipo */}
          <Form.Item
            name="type"
            label={<span className={styles.fieldLabel}>Tipo de Movimentação</span>}
            rules={[{ required: true, message: 'Selecione o tipo' }]}
          >
            <Select options={movementTypeOptions} size="large" placeholder="Selecione..." />
          </Form.Item>

          {/* Quantidade */}
          <Form.Item
            name="quantity"
            label={<span className={styles.fieldLabel}>Quantidade</span>}
            rules={[{ required: true, message: 'Informe a quantidade' }]}
          >
            <InputNumber
              min={0.01} step={0.5} precision={2}
              style={{ width: '100%' }} size="large"
              placeholder="0,00"
            />
          </Form.Item>

          {/* Motivo */}
          <Form.Item
            name="reason"
            label={<span className={styles.fieldLabel}>Motivo</span>}
            rules={[{ required: true, message: 'Informe o motivo' }]}
          >
            <Select
              options={reasonOptions}
              size="large"
              placeholder="Selecione o motivo..."
              onChange={(v) => setCustomReason(v === 'Outro')}
            />
          </Form.Item>

          {/* Motivo customizado */}
          {customReason && (
            <Form.Item
              name="customReason"
              label={<span className={styles.fieldLabel}>Descreva o motivo</span>}
              rules={[{ required: true, message: 'Descreva o motivo' }]}
            >
              <TextArea rows={3} placeholder="Descreva o motivo da movimentação..." style={{ resize: 'none' }} />
            </Form.Item>
          )}

          {/* Aviso de saída sem estoque */}
          <Form.Item noStyle shouldUpdate={(prev, curr) =>
            prev.type !== curr.type || prev.quantity !== curr.quantity
          }>
            {({ getFieldValue }) => {
              const type = getFieldValue('type')
              const qty  = getFieldValue('quantity') ?? 0
              const stock = Number(selectedProduct?.stockQuantity ?? 0)
              if (type === 'SAIDA' && qty > stock && stock > 0) {
                return (
                  <div className={styles.warningBox}>
                    ⚠️ A quantidade informada ({qty}) é maior que o estoque disponível ({stock}).
                  </div>
                )
              }
              if (type === 'SAIDA' && stock <= 0) {
                return (
                  <div className={styles.warningBox}>
                    ⚠️ Este produto não tem estoque disponível.
                  </div>
                )
              }
              return null
            }}
          </Form.Item>

        </Form>
      </Drawer>

      <Modal
        open={confirmClose}
        onOk={forceClose}
        onCancel={() => setConfirmClose(false)}
        okText="Sim, descartar"
        cancelText="Continuar"
        okButtonProps={{ danger: true }}
        title="Descartar movimentação?"
        centered
      >
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 300, color: '#555', margin: 0 }}>
          As informações preenchidas serão perdidas. Deseja continuar?
        </p>
      </Modal>
    </div>
  )
}