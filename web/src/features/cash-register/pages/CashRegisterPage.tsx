import { useState, useCallback } from 'react'
import { App, Alert, Button, Drawer, Form, Input,
  Select, Spin, Tag, Tooltip, Empty, Pagination, Popconfirm, Modal, Descriptions } from 'antd'
import { MoneyInput } from '@/components/MoneyInput'
import {
  PlusOutlined, SearchOutlined, LockOutlined, UnlockOutlined, DeleteOutlined, EyeOutlined, PrinterOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cashRegisterService,
  type CreateCashMovementRequest,
  type CloseCashRegisterRequest,
  type CashRegisterRecord,
  type CashMovement,
} from '../cashRegisterService'
import { usePermission } from '@/hooks/usePermission'
import styles from './CashRegisterPage.module.css'

const MOVEMENT_TYPES = [
  { value: 'ENTRADA', label: '⬇ Entrada — Aumenta o caixa' },
  { value: 'SAIDA', label: '⬆ Saída — Reduz o caixa' },
]

const MOVEMENT_DISPLAY: Record<string, { label: string; color: string; prefix: string; cssClass: string }> = {
  ENTRADA:      { label: '⬇ Entrada',     color: 'green',  prefix: '+', cssClass: 'amountIn'  },
  RECEBIMENTO:  { label: '💳 Recebimento', color: 'blue',   prefix: '+', cssClass: 'amountIn'  },
  SUPRIMENTO:   { label: '⬇ Suprimento',  color: 'green',  prefix: '+', cssClass: 'amountIn'  },
  ABERTURA:     { label: '🔓 Abertura',    color: 'geekblue', prefix: '+', cssClass: 'amountIn' },
  SAIDA:        { label: '⬆ Saída',       color: 'red',    prefix: '-', cssClass: 'amountOut' },
  SANGRIA:      { label: '⬆ Sangria',     color: 'volcano',prefix: '-', cssClass: 'amountOut' },
  FECHAMENTO:   { label: '🔒 Fechamento', color: 'red',    prefix: '-', cssClass: 'amountOut' },
  ESTORNO:      { label: '↩ Estorno',     color: 'orange', prefix: '+', cssClass: 'amountIn'  },
  TRANSFERENCIA:{ label: '↔ Transf.',     color: 'cyan',   prefix: '',  cssClass: 'amountIn'  },
}

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
  const { has, isAdmin } = usePermission()
  const canWrite = isAdmin || has('cash:write')

  const [page, setPage] = useState(0)
  const [movementDrawer, setMovementDrawer] = useState(false)
  const [closeDrawer, setCloseDrawer] = useState(false)
  const [search, setSearch] = useState('')
  const [historyDetailCash, setHistoryDetailCash] = useState<CashRegisterRecord | null>(null)
  const [previewHtml,       setPreviewHtml]       = useState('')
  const [previewOpen,       setPreviewOpen]       = useState(false)
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

  const deleteMovementMutation = useMutation({
    mutationFn: ({ cashId, movementId }: { cashId: number; movementId: number }) =>
      cashRegisterService.deleteMovement(cashId, movementId),
    onSuccess: () => {
      message.success('Movimentação excluída.')
      qc.invalidateQueries({ queryKey: ['cash-current'] })
    },
    onError: (err: unknown) => {
      const msg = (err as HttpError)?.response?.data?.message
      message.error(msg || 'Erro ao excluir movimentação.')
    },
  })

  const handleViewHistoryCash = async (cash: CashRegisterRecord) => {
    try {
      const detail = await cashRegisterService.findById(cash.id)
      setHistoryDetailCash(detail)
    } catch {
      setHistoryDetailCash(cash)
    }
  }

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

  const buildCashHtml = (cash: CashRegisterRecord) => {
    const movements = cash.movements ?? []
    const rows = movements.map(m => {
      const d = MOVEMENT_DISPLAY[m.type] ?? { label: m.type, prefix: '', cssClass: 'amountIn' }
      const sign = d.prefix === '+' ? 'color:#1D9E75' : d.prefix === '-' ? 'color:#E24B4A' : ''
      return `<tr>
        <td>${m.description}</td>
        <td>${d.label}</td>
        <td style="${sign};font-weight:600">${d.prefix} ${formatCurrency(m.amount)}</td>
        <td>${formatDate(m.createdAt)}</td>
      </tr>`
    }).join('')
    return `<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Relatório de Caixa #${cash.id}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:13px;color:#222;margin:24px}
        .header{display:flex;align-items:center;gap:16px;margin-bottom:8px}
        .header img{height:40px;width:auto;object-fit:contain}
        .header-info h2{margin:0 0 2px;font-size:18px}
        .header-info p{margin:0;color:#555;font-size:12px}
        p{margin:0 0 2px;color:#555;font-size:12px}
        hr{border:none;border-top:1px solid #ddd;margin:12px 0}
        .summary{display:flex;gap:32px;margin:12px 0;flex-wrap:wrap}
        .summary div{min-width:120px}.summary label{font-size:11px;color:#888;display:block}
        .summary span{font-size:15px;font-weight:700}
        table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
        th{text-align:left;padding:6px 8px;background:#042C53;color:#fff;font-size:11px}
        td{padding:6px 8px;border-bottom:1px solid #eee}
        tr:last-child td{border-bottom:none}
        @media print{body{margin:0}}
      </style>
    </head><body>
      <div class="header">
        <img src="${window.location.origin}/Logo_impresso.png" alt="TecnoSinapse" />
        <div class="header-info">
          <h2>Relatório de Caixa #${cash.id}</h2>
          <p>Responsável: ${cash.openedByName}</p>
        </div>
      </div>
      <p>Abertura: ${formatDate(cash.openedAt)}${cash.closedAt ? ' · Fechamento: ' + formatDate(cash.closedAt) : ''}</p>
      <hr/>
      <div class="summary">
        <div><label>Saldo Inicial</label><span>${formatCurrency(cash.openingBalance)}</span></div>
        <div><label>Total Entradas</label><span style="color:#1D9E75">${formatCurrency(cash.totalIn ?? 0)}</span></div>
        <div><label>Total Saídas</label><span style="color:#E24B4A">${formatCurrency(cash.totalOut ?? 0)}</span></div>
        <div><label>Saldo Esperado</label><span>${formatCurrency(cash.expectedBalance ?? cash.openingBalance)}</span></div>
        ${cash.closingBalance != null ? `<div><label>Saldo Real</label><span>${formatCurrency(cash.closingBalance)}</span></div>` : ''}
      </div>
      ${cash.observation ? `<p><b>Observações:</b> ${cash.observation}</p>` : ''}
      <hr/>
      <table>
        <thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Hora</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`
  }

  const handlePrintPreview = (cash: CashRegisterRecord) => {
    setPreviewHtml(buildCashHtml(cash))
    setPreviewOpen(true)
  }

  const handleConfirmPrint = () => {
    const win = window.open('', '_blank', 'width=820,height=700')
    if (!win) {
      alert('Permita pop-ups nesta página para imprimir.')
      return
    }
    const htmlWithScript = previewHtml.replace(
      '</body>',
      `<script>window.addEventListener('load',function(){window.print();window.addEventListener('afterprint',function(){window.close()})})</script></body>`
    )
    win.document.write(htmlWithScript)
    win.document.close()
    setPreviewOpen(false)
  }

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
                {!currentCash.closed ? 'ABERTO' : 'FECHADO'}
              </div>
              <div className={styles.statusTime}>
                {formatDate(currentCash.openedAt)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Alert
          type="warning"
          showIcon
          message="Caixa Fechado"
          description="Nenhum caixa está aberto. Pagamentos e movimentações estão bloqueados até que um novo caixa seja aberto."
          action={canWrite ? (
            <Button
              type="primary"
              size="large"
              onClick={handleOpenCash}
              loading={openCashMutation.isPending}
              icon={<UnlockOutlined />}
            >
              Abrir Caixa
            </Button>
          ) : undefined}
          style={{ borderRadius: 10, marginBottom: 0 }}
        />
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
            {canWrite && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={() => setMovementDrawer(true)}
                className={styles.actionBtn}
              >
                + Movimentação
              </Button>
            )}
            <Button
              icon={<PrinterOutlined />}
              size="large"
              onClick={() => handlePrintPreview(currentCash!)}
            >
              Imprimir
            </Button>
            {canWrite && (
              <Button
                danger
                icon={<LockOutlined />}
                size="large"
                onClick={() => setCloseDrawer(true)}
                className={styles.actionBtnSecondary}
              >
                Fechar Caixa
              </Button>
            )}
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
                        {(() => {
                          const d = MOVEMENT_DISPLAY[movement.type] ?? { label: movement.type, color: 'default', prefix: '', cssClass: 'amountIn' }
                          return <Tag color={d.color}>{d.label}</Tag>
                        })()}
                      </td>
                      <td className={styles.tdAmount}>
                        {(() => {
                          const d = MOVEMENT_DISPLAY[movement.type] ?? { label: movement.type, color: 'default', prefix: '', cssClass: 'amountIn' }
                          return (
                            <span className={styles[d.cssClass as keyof typeof styles]}>
                              {d.prefix} {formatCurrency(movement.amount)}
                            </span>
                          )
                        })()}
                      </td>
                      <td className={styles.tdDate}>
                        {formatDate(movement.createdAt)}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {canWrite && (
                            <Popconfirm
                              title="Excluir movimentação"
                              description="Deseja realmente excluir esta movimentação?"
                              onConfirm={() => deleteMovementMutation.mutate({ cashId: currentCash!.id, movementId: movement.id })}
                              okText="Sim, excluir"
                              cancelText="Cancelar"
                              okButtonProps={{ danger: true }}
                            >
                              <Tooltip title="Excluir">
                                <button
                                  className={`${styles.actionIconBtn} ${styles.actionDanger}`}
                                >
                                  <DeleteOutlined />
                                </button>
                              </Tooltip>
                            </Popconfirm>
                          )}
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
                      {!cash.closed ? 'Aberto' : '✓ Fechado'}
                    </Tag>
                  </td>
                  <td>{cash.openedByName || '—'}</td>
                  <td>
                    <div className={styles.actions}>
                      <Tooltip title="Ver detalhes">
                        <button
                          className={styles.actionIconBtn}
                          onClick={() => handleViewHistoryCash(cash)}
                        >
                          <EyeOutlined />
                        </button>
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
          requiredMark
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
            <MoneyInput
              min={0.01}
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

      <Modal
        open={!!historyDetailCash}
        onCancel={() => setHistoryDetailCash(null)}
        onOk={() => setHistoryDetailCash(null)}
        okText="Fechar"
        cancelButtonProps={{ style: { display: 'none' } }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 32 }}>
            <span>Detalhes do Caixa #{historyDetailCash?.id ?? ''}</span>
            {historyDetailCash && (
              <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintPreview(historyDetailCash!)}>
                Imprimir
              </Button>
            )}
          </div>
        }
        width={600}
      >
        {historyDetailCash && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Responsável (abertura)" span={2}>
                {historyDetailCash.openedByName}
              </Descriptions.Item>
              <Descriptions.Item label="Abertura">
                {formatDate(historyDetailCash.openedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Encerramento">
                {historyDetailCash.closedAt ? formatDate(historyDetailCash.closedAt) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Saldo Inicial">
                {formatCurrency(historyDetailCash.openingBalance)}
              </Descriptions.Item>
              <Descriptions.Item label="Saldo Final">
                {historyDetailCash.closingBalance ? formatCurrency(historyDetailCash.closingBalance) : '—'}
              </Descriptions.Item>
              {historyDetailCash.totalIn != null && (
                <Descriptions.Item label="Total Entradas">
                  {formatCurrency(historyDetailCash.totalIn)}
                </Descriptions.Item>
              )}
              {historyDetailCash.totalOut != null && (
                <Descriptions.Item label="Total Saídas">
                  {formatCurrency(historyDetailCash.totalOut)}
                </Descriptions.Item>
              )}
              {historyDetailCash.expectedBalance != null && (
                <Descriptions.Item label="Saldo Esperado" span={2}>
                  {formatCurrency(historyDetailCash.expectedBalance)}
                </Descriptions.Item>
              )}
              {historyDetailCash.observation && (
                <Descriptions.Item label="Observações" span={2}>
                  {historyDetailCash.observation}
                </Descriptions.Item>
              )}
            </Descriptions>
            {(historyDetailCash.movements ?? []).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Movimentações</div>
                <table className={styles.table} style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historyDetailCash.movements ?? []).map((m: CashMovement) => {
                      const d = MOVEMENT_DISPLAY[m.type] ?? { label: m.type, color: 'default', prefix: '', cssClass: 'amountIn' }
                      return (
                        <tr key={m.id}>
                          <td>{m.description}</td>
                          <td><Tag color={d.color}>{d.label}</Tag></td>
                          <td><span className={styles[d.cssClass as keyof typeof styles]}>{d.prefix} {formatCurrency(m.amount)}</span></td>
                          <td>{formatDate(m.createdAt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Pré-visualização de impressão */}
      <Modal
        open={previewOpen}
        title={
          <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, color: '#042C53' }}>
            <PrinterOutlined style={{ marginRight: 8 }} />
            Pré-visualização de Impressão
          </span>
        }
        onCancel={() => setPreviewOpen(false)}
        onOk={handleConfirmPrint}
        okText={<><PrinterOutlined style={{ marginRight: 6 }} />Confirmar Impressão</>}
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
              requiredMark
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
                <MoneyInput
                  min={0}
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