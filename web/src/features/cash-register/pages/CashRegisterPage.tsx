import { useState, useCallback } from 'react'
import { App, Button, Drawer, Form, Input, InputNumber,
  Select, Spin, Tag, Tooltip, Empty, Pagination } from 'antd'
import {
  PlusOutlined, SearchOutlined, LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cashRegisterService,
  type CreateCashMovementRequest,
  type CloseCashRegisterRequest,
  type CashRegisterRecord,
  type CashMovement,
} from '../cashRegisterService'
import styles from './CashRegisterPage.module.css'

const MOVEMENT_TYPES = [
  { value: 'ENTRADA', label: '⬇ Entrada — Aumenta o caixa' },
  { value: 'SAIDA', label: '⬆ Saída — Reduz o caixa' },
]

interface HttpError extends Error {
  response?: {
    data?: {
      message?: string
    }
  }
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CashRegisterPage() {
  const { message, modal } = App.useApp()
  const qc = useQueryClient()

  const [page, setPage] = useState(0)
  const [movementDrawer, setMovementDrawer] = useState(false)
  const [closeDrawer, setCloseDrawer] = useState(false)
  const [search, setSearch] = useState('')
  const [form] = Form.useForm()
  const [closeForm] = Form.useForm()

  const { data: currentCash, isLoading: loadingCurrent } = useQuery({
    queryKey: ['cash-current'],
    queryFn: cashRegisterService.getCurrentCash,
  })

  const { data: historyCash, isLoading: loadingHistory } = useQuery({
    queryKey: ['cash-history', page],
    queryFn: () => cashRegisterService.list(page),
  })

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(0)
  }, [])

  const addMovementMutation = useMutation({
    mutationFn: (payload: CreateCashMovementRequest) =>
      cashRegisterService.addMovement(currentCash!.id, payload),
    onSuccess: () => {
      message.success('Movimentação registrada!')
      qc.invalidateQueries({ queryKey: ['cash-current'] })
      qc.invalidateQueries({ queryKey: ['cash-history'] })
      setMovementDrawer(false)
      form.resetFields()
    },
    onError: (err: unknown) => {
      const msg = (err as HttpError)?.response?.data?.message
      message.error(msg || 'Erro ao registrar movimentação.')
    },
  })

  const closeCashMutation = useMutation({
    mutationFn: (payload: CloseCashRegisterRequest) =>
      cashRegisterService.closeCash(currentCash!.id, payload),
    onSuccess: () => {
      message.success('Caixa fechado com sucesso!')
      qc.invalidateQueries({ queryKey: ['cash-current'] })
      qc.invalidateQueries({ queryKey: ['cash-history'] })
      setCloseDrawer(false)
      closeForm.resetFields()
    },
    onError: (err: unknown) => {
      const msg = (err as HttpError)?.response?.data?.message
      message.error(msg || 'Erro ao fechar caixa.')
    },
  })

  const openCashMutation = useMutation({
    mutationFn: (openingBalance: number) =>
      cashRegisterService.openCash(openingBalance),
    onSuccess: () => {
      message.success('Caixa aberto com sucesso!')
      qc.invalidateQueries({ queryKey: ['cash-current'] })
    },
    onError: (err: unknown) => {
      const msg = (err as HttpError)?.response?.data?.message
      message.error(msg || 'Erro ao abrir caixa.')
    },
  })

  const totalIn = currentCash?.totalIn ?? 0
  const totalOut = currentCash?.totalOut ?? 0
  const balance = currentCash?.expectedBalance ?? (currentCash?.openingBalance ?? 0)
  const historyCashes = historyCash?.content ?? []

  const handleAddMovement = (values: CreateCashMovementRequest) => {
    addMovementMutation.mutate({
      type: values.type,
      amount: values.amount,
      description: values.description,
    })
  }

  const handleCloseCash = (values: { closingBalance: number; observation?: string }) => {
    closeCashMutation.mutate({
      closingBalance: values.closingBalance,
      observation: values.observation,
    })
  }

  const handleOpenCash = () => {
    modal.confirm({
      title: 'Abrir novo caixa',
      content: (
        <Input
          type="number"
          placeholder="Informe o valor inicial do caixa (ex: 500.00)"
          id="opening-balance"
          size="large"
          min={0}
          step={0.01}
        />
      ),
      okText: 'Abrir caixa',
      cancelText: 'Cancelar',
      onOk: () => {
        const input = document.getElementById('opening-balance') as HTMLInputElement
        const value = parseFloat(input?.value || '0')
        if (value < 0) {
          message.error('O valor inicial deve ser maior ou igual a zero.')
          return
        }
        openCashMutation.mutate(value)
      },
    })
  }

  const saving = addMovementMutation.isPending || closeCashMutation.isPending

  return (
    <div className={styles.root}>
      {loadingCurrent ? (
        <div className={styles.centerState}>
          <Spin />
        </div>
      ) : currentCash ? (
        <div className={styles.statusCard}>
          <div className={styles.statusCardTitle}>Caixa Aberto</div>
          <div className={styles.statusCardContent}>
            <div>
              <div className={styles.statusCardValue}>
                {formatCurrency(balance)}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 4,
                }}
              >
                Saldo Atual
              </div>
            </div>
            <div className={styles.statusCardStatus}>
              <div className={styles.statusBadge}>
                {!currentCash.closed ? '🟢 ABERTO' : '🔴 FECHADO'}
              </div>
              <div className={styles.statusTime}>
                {formatDate(currentCash.openedAt)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: 10,
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: "'Exo 2', sans-serif",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#92400e',
                marginBottom: 4,
              }}
            >
              Caixa Fechado
            </div>
            <div style={{ fontSize: 12, fontWeight: 300, color: '#92400e' }}>
              Abra um novo caixa para iniciar as operações
            </div>
          </div>
          <Button
            type="primary"
            size="large"
            onClick={handleOpenCash}
            loading={openCashMutation.isPending}
          >
            <UnlockOutlined /> Abrir Caixa
          </Button>
        </div>
      )}

      {currentCash && (
        <div className={styles.summaryCards}>
          {[
            {
              label: 'Saldo inicial',
              value: formatCurrency(currentCash.openingBalance),
              accent: '#378ADD',
            },
            {
              label: 'Total entradas',
              value: formatCurrency(totalIn),
              accent: '#1D9E75',
            },
            {
              label: 'Total saídas',
              value: formatCurrency(totalOut),
              accent: '#E24B4A',
            },
            {
              label: 'Saldo atual',
              value: formatCurrency(balance),
              accent: '#042C53',
            },
            {
              label: 'Movimentações',
              value: String(currentCash.movements?.length ?? 0),
              accent: '#F59E0B',
            },
          ].map((card) => (
            <div
              key={card.label}
              className={styles.card}
              style={{ borderTopColor: card.accent }}
            >
              <span className={styles.cardLabel}>{card.label}</span>
              <span className={styles.cardValue} style={{ color: card.accent }}>
                {card.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {currentCash && (
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.searchWrap}>
              <SearchOutlined className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Buscar por descrição ou método de pagamento..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.actionBtns}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setMovementDrawer(true)}
              className={styles.actionBtn}
            >
              + Movimentação
            </Button>
            <Button
              danger
              icon={<LockOutlined />}
              size="large"
              onClick={() => setCloseDrawer(true)}
              className={styles.actionBtnSecondary}
            >
              Fechar Caixa
            </Button>
          </div>
        </div>
      )}

      {currentCash && (
        <div className={styles.tableWrap}>
          <div className={styles.tableHeader}>
            <span className={styles.tableTitle}>Movimentações de Hoje</span>
            <span className={styles.tableCount}>
              {(currentCash.movements ?? []).length} movimentações
            </span>
          </div>

          {(currentCash.movements ?? []).length === 0 ? (
            <div className={styles.centerState}>
              <Empty description="Nenhuma movimentação registrada" />
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Hora</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(currentCash.movements ?? [])
                  .filter(
                    (m: CashMovement) =>
                      !search ||
                      m.description.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((movement: CashMovement) => (
                    <tr key={movement.id}>
                      <td className={styles.tdId}>#{movement.id}</td>
                      <td className={styles.tdDesc}>{movement.description}</td>
                      <td>
                        <Tag
                          color={movement.type === 'ENTRADA' ? 'green' : 'red'}
                        >
                          {movement.type === 'ENTRADA'
                            ? '⬇ Entrada'
                            : '⬆ Saída'}
                        </Tag>
                      </td>
                      <td className={styles.tdAmount}>
                        <span
                          className={
                            movement.type === 'ENTRADA'
                              ? styles.amountIn
                              : styles.amountOut
                          }
                        >
                          {movement.type === 'ENTRADA' ? '+' : '-'}{' '}
                          {formatCurrency(movement.amount)}
                        </span>
                      </td>
                      <td className={styles.tdDate}>
                        {formatDate(movement.createdAt)}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <Tooltip title="Deletar">
                            <button
                              className={`${styles.actionIconBtn} ${styles.actionDanger}`}
                            >
                              <DeleteOutlined />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Histórico de Caixas</span>
          <span className={styles.tableCount}>
            {loadingHistory ? '...' : `${historyCash?.totalElements ?? 0} caixas`}
          </span>
        </div>

        {loadingHistory ? (
          <div className={styles.centerState}>
            <Spin size="large" />
          </div>
        ) : historyCashes.length === 0 ? (
          <div className={styles.centerState}>
            <Empty description="Nenhum caixa encontrado" />
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Abertura</th>
                <th>Encerramento</th>
                <th>Saldo Inicial</th>
                <th>Saldo Final</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {historyCashes.map((cash: CashRegisterRecord) => (
                <tr key={cash.id}>
                  <td className={styles.tdId}>#{cash.id}</td>
                  <td className={styles.tdDesc}>{formatDate(cash.openedAt)}</td>
                  <td>{cash.closedAt ? formatDate(cash.closedAt) : '—'}</td>
                  <td>{formatCurrency(cash.openingBalance)}</td>
                  <td>
                    {cash.closingBalance
                      ? formatCurrency(cash.closingBalance)
                      : '—'}
                  </td>
                  <td>
                    <Tag color={!cash.closed ? 'blue' : 'green'}>
                      {!cash.closed ? '🟢 Aberto' : '✓ Fechado'}
                    </Tag>
                  </td>
                  <td>{cash.openedByName || '—'}</td>
                  <td>
                    <div className={styles.actions}>
                      <Tooltip title="Ver detalhes">
                        <button className={styles.actionIconBtn}>📋</button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loadingHistory && (historyCash?.totalPages ?? 0) > 1 && (
          <div className={styles.pagination}>
            <Pagination
              current={(historyCash?.number ?? 0) + 1}
              total={historyCash?.totalElements ?? 0}
              pageSize={historyCash?.size ?? 20}
              onChange={(p) => setPage(p - 1)}
              showSizeChanger={false}
              showTotal={(t) => `Total: ${t} caixas`}
            />
          </div>
        )}
      </div>

      <Drawer
        title={<span className={styles.drawerTitle}>Nova Movimentação</span>}
        open={movementDrawer}
        onClose={() => setMovementDrawer(false)}
        width={480}
        maskClosable={false}
        keyboard={false}
        footer={
          <div className={styles.drawerFooter}>
            <Button onClick={() => setMovementDrawer(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="primary"
              loading={saving}
              onClick={() => form.submit()}
              className={styles.saveBtn}
            >
              Registrar movimentação
            </Button>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddMovement}
          requiredMark={false}
        >
          <Form.Item
            name="type"
            label={<span className={styles.fieldLabel}>Tipo</span>}
            rules={[{ required: true, message: 'Selecione o tipo' }]}
          >
            <Select
              options={MOVEMENT_TYPES}
              size="large"
              placeholder="Selecione..."
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label={<span className={styles.fieldLabel}>Valor (R$)</span>}
            rules={[{ required: true, message: 'Informe o valor' }]}
          >
            <InputNumber
              min={0.01}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              size="large"
              placeholder="0,00"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span className={styles.fieldLabel}>Descrição</span>}
            rules={[{ required: true, message: 'Informe a descrição' }]}
          >
            <Input
              placeholder="Ex: Venda do pedido #123, Devolução, etc."
              size="large"
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={<span className={styles.drawerTitle}>Fechar Caixa</span>}
        open={closeDrawer}
        onClose={() => setCloseDrawer(false)}
        width={480}
        maskClosable={false}
        keyboard={false}
        footer={
          <div className={styles.drawerFooter}>
            <Button onClick={() => setCloseDrawer(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="primary"
              danger
              loading={saving}
              onClick={() => closeForm.submit()}
              className={styles.saveBtn}
            >
              Fechar caixa
            </Button>
          </div>
        }
      >
        {currentCash && (
          <>
            <div className={styles.closingAlert}>
              ⚠️ Ao fechar o caixa, você não poderá mais registrar movimentações.
              Verifique se todos os valores estão corretos.
            </div>

            <div className={styles.summaryBox}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Saldo Inicial</span>
                <span className={styles.summaryValue}>
                  {formatCurrency(currentCash.openingBalance)}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>+ Entradas</span>
                <span
                  className={styles.summaryValue}
                  style={{ color: '#1D9E75' }}
                >
                  {formatCurrency(totalIn)}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>- Saídas</span>
                <span
                  className={styles.summaryValue}
                  style={{ color: '#E24B4A' }}
                >
                  {formatCurrency(totalOut)}
                </span>
              </div>
              <div
                style={{
                  borderTop: '1px solid #eef2f7',
                  paddingTop: 6,
                  marginTop: 6,
                }}
              >
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Saldo Esperado</span>
                  <span
                    className={styles.summaryValue}
                    style={{ fontSize: 16 }}
                  >
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
            </div>

            <Form
              form={closeForm}
              layout="vertical"
              onFinish={handleCloseCash}
              requiredMark={false}
            >
              <Form.Item
                name="closingBalance"
                label={
                  <span className={styles.fieldLabel}>
                    Saldo Real (Confira no Caixa)
                  </span>
                }
                rules={[{ required: true, message: 'Informe o saldo real' }]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="0,00"
                />
              </Form.Item>

              <Form.Item
                name="observation"
                label={
                  <span className={styles.fieldLabel}>
                    Observações (Opcional)
                  </span>
                }
              >
                <Input.TextArea
                  placeholder="Notas sobre discrepâncias ou informações importantes"
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Drawer>
    </div>
  )
}