import { api } from '@/libs/axios'

function isoRange(from: string, to: string) {
  return {
    from: `${from}T00:00:00`,
    to:   `${to}T23:59:59`,
  }
}

function paged<T>(data: unknown, fallback: T[]): { content: T[]; total: number } {
  const content = (Array.isArray(data) ? data : (data as { content?: T[] }).content ?? fallback) as T[]
  const total   = Array.isArray(data)
    ? content.length
    : ((data as { totalElements?: number }).totalElements ?? content.length)
  return { content, total }
}

export const reportService = {
  topProducts: async (from: string, to: string) => {
    const { data } = await api.get('/reports/top-products', { params: isoRange(from, to) })
    return data as TopProductItem[]
  },

  salesRank: async (from: string, to: string) => {
    const { data } = await api.get('/reports/sales-rank', { params: isoRange(from, to) })
    return data as SalesRankItem[]
  },

  stockInventory: async () => {
    const { data } = await api.get('/reports/stock-inventory')
    return data as StockInventoryItem[]
  },

  stockMovements: async (from: string, to: string) => {
    const { data } = await api.get('/reports/stock-movements', { params: isoRange(from, to) })
    return data as StockMovementItem[]
  },

  transactions: async (from: string, to: string) => {
    const { data } = await api.get('/reports/transactions', { params: isoRange(from, to) })
    return data as TransactionItem[]
  },

  payments: async (limit: number) => {
    const { data } = await api.get('/payments', { params: { size: limit, sort: 'createdAt,desc' } })
    return paged<PaymentItem>(data, [])
  },

  purchaseOrders: async (limit: number) => {
    const { data } = await api.get('/purchase-orders', { params: { size: limit, sort: 'id,desc' } })
    return paged<PurchaseOrderItem>(data, [])
  },

  persons: async (limit: number) => {
    const { data } = await api.get('/persons', { params: { size: limit } })
    return paged<PersonItem>(data, [])
  },

  exportPayments: async () => {
    const { data } = await api.get('/payments', { params: { size: 9999, sort: 'createdAt,desc' } })
    return paged<PaymentItem>(data, []).content
  },

  exportPurchaseOrders: async () => {
    const { data } = await api.get('/purchase-orders', { params: { size: 9999, sort: 'id,desc' } })
    return paged<PurchaseOrderItem>(data, []).content
  },

  exportPersons: async () => {
    const { data } = await api.get('/persons', { params: { size: 9999 } })
    return paged<PersonItem>(data, []).content
  },
}

export interface TopProductItem {
  productId:         number
  productName:       string
  sku?:              string
  totalQuantitySold: number
  totalRevenue:      number
  orderCount:        number
}

export interface SalesRankItem {
  sellerId:          number
  sellerName:        string
  totalOrders:       number
  totalRevenue:      number
  averageOrderValue: number
}

export interface StockInventoryItem {
  productId:      number
  productName:    string
  sku?:           string
  categoryName?:  string
  stockQuantity:  number
  unitPrice:      number
  purchasePrice?: number
  totalValueSale: number
  totalValueCost: number
}

export interface StockMovementItem {
  id:          number
  productId:   number
  productName: string
  type:        string
  quantity:    number
  reason?:     string
  createdAt:   string
}

export interface TransactionItem {
  id:             number
  type:           string
  amount:         number
  description?:   string
  relatedEntity?: string
  relatedId?:     number
  createdAt:      string
}

export interface PaymentItem {
  id:            number
  orderId:       number
  clientName?:   string
  paymentMethod: string
  amount:        number
  paymentStatus: string
  paidAt?:       string
  createdAt?:    string
}

export interface PurchaseOrderLineItem {
  id:               number
  productId:        number
  productName:      string
  quantity:         number
  unitCost:         number
  subTotal:         number
  receivedQuantity: number
}

export interface PurchaseOrderItem {
  id:                    number
  supplierName?:         string
  totalAmount?:          number
  status?:               string
  expectedDeliveryDate?: string
  createdAt?:            string
  items?:                PurchaseOrderLineItem[]
}

export interface PersonItem {
  id:        number
  name:      string
  document?: string
  email?:    string
  phone?:    string
  roles?:    string[]
}
