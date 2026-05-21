import { api } from '@/libs/axios'

export type PurchaseOrderStatus = 'PENDENTE' | 'CONFIRMADO' | 'RECEBIDO' | 'CANCELADO'

export interface PurchaseOrderItem {
  id?:         number
  productId:   number
  productName?: string
  quantity:    number
  unitCost:    number
  subTotal?:   number
}

export interface PurchaseOrderRecord {
  id:              number
  supplierId:      number
  supplierName:    string
  status:          PurchaseOrderStatus
  totalAmount:     number
  freightCost?:    number
  discount?:       number
  notes?:          string
  expectedAt?:     string
  receivedAt?:     string
  invoiceNumber?:  string
  items:           PurchaseOrderItem[]
  createdAt?:      string
}

export interface CreatePurchaseOrderRequest {
  supplierId:     number
  status:         PurchaseOrderStatus
  freightCost?:   number
  discount?:      number
  notes?:         string
  expectedAt?:    string
  invoiceNumber?: string
  items: {
    productId: number
    quantity:  number
    unitCost:  number
  }[]
}

export interface SupplierOption {
  id:           number
  name:         string
  document?:    string
  tradeName?:   string
  fantasyName?: string
}

export interface ProductOption {
  id:        number
  name:      string
  sku?:      string
  unitCost?: number
}

export interface PageResponse<T> {
  content:       T[]
  totalElements: number
  totalPages:    number
  number:        number
  size:          number
}

export const purchaseOrderService = {
  list: async (page = 0, size = 20, search?: string): Promise<PageResponse<PurchaseOrderRecord>> => {
    const { data } = await api.get('/purchase-orders', {
      params: { page, size, sort: 'createdAt,desc', ...(search ? { search } : {}) },
    })
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
    }
    return data
  },

  findById: async (id: number): Promise<PurchaseOrderRecord> => {
    const { data } = await api.get(`/purchase-orders/${id}`)
    return data
  },

  create: async (payload: CreatePurchaseOrderRequest): Promise<PurchaseOrderRecord> => {
    const { data } = await api.post('/purchase-orders', payload)
    return data
  },

  update: async (id: number, payload: CreatePurchaseOrderRequest): Promise<PurchaseOrderRecord> => {
    const { data } = await api.put(`/purchase-orders/${id}`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase-orders/${id}`)
  },

  getSuppliers: async (): Promise<PageResponse<SupplierOption>> => {
    const { data } = await api.get('/persons', { params: { size: 500 } })
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
    }
    return data
  },

  getProducts: async (): Promise<PageResponse<ProductOption>> => {
    const { data } = await api.get('/products', { params: { size: 500 } })
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
    }
    return data
  },
}