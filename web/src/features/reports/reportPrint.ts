import type {
  TopProductItem, SalesRankItem, StockInventoryItem,
  StockMovementItem, PaymentItem, PurchaseOrderItem, PersonItem,
} from './reportService'

export interface PrintOptions {
  reportTitle:  string
  reportDesc:   string
  userName:     string
  userRole:     string
  filters:      { label: string; value: string }[]
  previewSize:  number
  totalRecords: number
}

export type PrintData =
  | { type: 'TOP_PRODUCTS';    rows: TopProductItem[]     }
  | { type: 'SALES_RANK';      rows: SalesRankItem[]      }
  | { type: 'PURCHASE_ORDERS'; rows: PurchaseOrderItem[]  }
  | { type: 'STOCK_MOVEMENTS'; rows: StockMovementItem[]  }
  | { type: 'PAYMENTS';        rows: PaymentItem[]        }
  | { type: 'STOCK_INVENTORY'; rows: StockInventoryItem[] }
  | { type: 'PERSONS';         rows: PersonItem[]         }

const money = (v?: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num = (v?: number) => (v ?? 0).toLocaleString('pt-BR')
const dt  = (iso?: string) => {
  if (!iso) return '—'
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso
  return new Date(safe).toLocaleDateString('pt-BR')
}

function tbl(headers: string[], rows: string[][]): string {
  const align = headers.map(h => h.startsWith('>'))
  const ths = headers.map((h, i) => `<th${align[i] ? ' class="r"' : ''}>${h.replace(/^>/, '')}</th>`).join('')
  const trs = rows.length
    ? rows.map(cells => `<tr>${cells.map((c, i) => `<td${align[i] ? ' class="r"' : ''}>${c}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}" class="empty-row">Nenhum registro encontrado.</td></tr>`
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
}

const MOVE_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada', SAIDA: 'Saída', AJUSTE: 'Ajuste',
  VENDA: 'Venda', COMPRA: 'Compra', DEVOLUCAO: 'Devolução', TRANSFERENCIA: 'Transferência',
}

const PAY_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente', PAGO: 'Pago', PARCIAL: 'Parcial',
  ATRASADO: 'Atrasado', CANCELADO: 'Cancelado',
}

function buildTablesHtml(data: PrintData): string {
  switch (data.type) {
    case 'TOP_PRODUCTS':
      return tbl(
        ['#', 'Produto', 'SKU', '>Qtd Vendida', '>Nº Pedidos', '>Receita Total'],
        data.rows.map((r, i) => [
          String(i + 1), r.productName, r.sku || '—',
          num(r.totalQuantitySold), String(r.orderCount), money(r.totalRevenue),
        ])
      )

    case 'SALES_RANK':
      return tbl(
        ['#', 'Vendedor', '>Nº Pedidos', '>Ticket Médio', '>Receita Total'],
        data.rows.map((r, i) => [
          String(i + 1), r.sellerName, String(r.totalOrders),
          money(r.averageOrderValue), money(r.totalRevenue),
        ])
      )

    case 'PURCHASE_ORDERS': {
      // flatten: one row per line item so products are visible
      type FR = { orderId: number; supplier: string; product: string; qty: number; received: number; unitCost: number; sub: number; status: string; expected: string; created: string }
      const flatRows: FR[] = data.rows.flatMap(o =>
        (o.items ?? []).length === 0
          ? [{ orderId: o.id, supplier: o.supplierName || '—', product: '—', qty: 0, received: 0, unitCost: 0, sub: 0, status: o.status || '—', expected: o.expectedDeliveryDate || '', created: o.createdAt || '' }]
          : (o.items ?? []).map(it => ({ orderId: o.id, supplier: o.supplierName || '—', product: it.productName, qty: it.quantity, received: it.receivedQuantity, unitCost: it.unitCost, sub: it.subTotal, status: o.status || '—', expected: o.expectedDeliveryDate || '', created: o.createdAt || '' }))
      )
      return tbl(
        ['# Pedido', 'Fornecedor', 'Produto', 'Qtd Comprada', 'Qtd Recebida', 'Custo Unit.', 'Subtotal', 'Status', 'Dt. Prevista', 'Dt. Criação'],
        flatRows.map(r => [
          `#${r.orderId}`, r.supplier, r.product,
          r.qty > 0 ? num(r.qty) : '—', r.qty > 0 ? num(r.received) : '—',
          r.unitCost > 0 ? money(r.unitCost) : '—', r.sub > 0 ? money(r.sub) : '—',
          r.status, dt(r.expected), dt(r.created),
        ])
      )
    }

    case 'STOCK_MOVEMENTS':
      return tbl(
        ['Produto', 'Tipo', '>Quantidade', 'Motivo', 'Data'],
        data.rows.map(r => [
          r.productName, MOVE_LABELS[r.type] ?? r.type,
          num(r.quantity), r.reason || '—', dt(r.createdAt),
        ])
      )

    case 'PAYMENTS':
      return tbl(
        ['Pedido', 'Cliente', 'Método', '>Valor', 'Status', 'Data'],
        data.rows.map(r => [
          `#${r.orderId}`, r.clientName || '—',
          r.paymentMethod?.replace(/_/g, ' ') || '—',
          money(r.amount), PAY_LABELS[r.paymentStatus] ?? r.paymentStatus,
          dt(r.createdAt),
        ])
      )

    case 'STOCK_INVENTORY': {
      const totalValue = data.rows.reduce((s, r) => s + Number(r.totalValueSale), 0)
      const table = tbl(
        ['Produto', 'SKU', 'Categoria', '>Estoque', '>Preço Venda', '>Preço Custo', '>Valor Estoque'],
        data.rows.map(r => [
          r.productName, r.sku || '—', r.categoryName || '—',
          num(r.stockQuantity), money(r.unitPrice),
          r.purchasePrice != null ? money(r.purchasePrice) : '—',
          money(r.totalValueSale),
        ])
      )
      const footer = data.rows.length
        ? `<div class="total-row"><span>Total em estoque (preço de venda):</span><strong>${money(totalValue)}</strong></div>`
        : ''
      return table + footer
    }

    case 'PERSONS':
      return tbl(
        ['#', 'Nome', 'Documento', 'E-mail', 'Telefone', 'Papéis'],
        data.rows.map(r => [
          `#${r.id}`, r.name, r.document || '—',
          r.email || '—', r.phone || '—', (r.roles ?? []).join(', ') || '—',
        ])
      )
  }
}

const PRINT_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #333; padding: 24px; max-width: 960px; margin: 0 auto; }

  .print-header { border-bottom: 3px solid #042C53; padding-bottom: 14px; margin-bottom: 16px; }
  .print-header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .print-logo { height: 44px; width: auto; display: block; object-fit: contain; }
  .print-title { font-size: 14px; font-weight: 700; color: #042C53; margin-top: 4px; }
  .print-title small { font-size: 11px; font-weight: 300; color: #888; }
  .print-emitted { text-align: right; font-size: 10px; color: #555; line-height: 1.9; }
  .print-emitted strong { color: #042C53; }

  .print-meta { display: flex; flex-wrap: wrap; gap: 6px 20px; margin-top: 12px; background: #f8fafc; border-radius: 6px; padding: 10px 14px; border: 1px solid #d0dbe8; }
  .meta-item label { display: block; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #888; margin-bottom: 2px; }
  .meta-item span { font-size: 11px; font-weight: 600; color: #042C53; }

  table { width: 100%; border-collapse: collapse; }
  thead th { background: #042C53; color: #fff; padding: 6px 10px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; }
  thead th.r { text-align: right; }
  tbody tr { border-bottom: 1px solid #eef2f7; page-break-inside: avoid; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr:last-child { border-bottom: none; }
  tbody td { padding: 5px 10px; font-size: 11px; white-space: nowrap; }
  tbody td.r { text-align: right; font-variant-numeric: tabular-nums; }
  .empty-row { text-align: center; color: #aaa; padding: 20px 10px !important; }

  .total-row { display: flex; justify-content: space-between; padding: 8px 10px; background: #e8f3fb; color: #042C53; font-size: 11px; border-top: 2px solid #378ADD; }

  .print-footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #d0dbe8; display: flex; justify-content: space-between; font-size: 9px; color: #aaa; }

  @page { margin: 15mm 12mm; }
  @media print { body { padding: 0; } }
`

export function buildPrintHtml(options: PrintOptions, data: PrintData): string {
  const now = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const allFilters = [
    ...options.filters,
    {
      label: 'Registros',
      value: options.previewSize < options.totalRecords
        ? `${options.previewSize} de ${options.totalRecords}`
        : String(options.totalRecords),
    },
  ]

  const filtersHtml = allFilters
    .map(f => `<div class="meta-item"><label>${f.label}</label><span>${f.value}</span></div>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório – ${options.reportTitle} — TecnoSinapse</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="print-header">
    <div class="print-header-top">
      <div>
        <img src="${window.location.origin}/Logo_impresso.png" alt="TecnoSinapse" class="print-logo" />
        <div class="print-title">${options.reportTitle}<small> — ${options.reportDesc}</small></div>
      </div>
      <div class="print-emitted">
        <div><strong>Emitido em:</strong> ${now}</div>
        <div><strong>Emitido por:</strong> ${options.userName}</div>
        <div><strong>Perfil:</strong> ${options.userRole}</div>
      </div>
    </div>
    <div class="print-meta">${filtersHtml}</div>
  </div>

  ${buildTablesHtml(data)}

  <div class="print-footer">
    <span>TecnoSinapse — Sistema de Gestão</span>
    <span>Gerado em ${now} por ${options.userName}</span>
  </div>

  <script>
    window.addEventListener('load', function () {
      window.print()
      window.addEventListener('afterprint', function () { window.close() })
    })
  </script>
</body>
</html>`
}

export function openPrintWindow(html: string): void {
  const win = window.open('', '_blank', 'width=980,height=740')
  if (!win) {
    alert('Permita pop-ups nesta página para imprimir o relatório.')
    return
  }
  win.document.write(html)
  win.document.close()
}
