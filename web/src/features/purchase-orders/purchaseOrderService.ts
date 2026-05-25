import { api } from '@/libs/axios'

export type PurchaseOrderStatus =
  | 'ABERTO'
  | 'APROVADO'
  | 'AGUARDANDO_RECEBIMENTO'
  | 'RECEBIDO_PARCIAL'
  | 'RECEBIDO_TOTAL'
  | 'CANCELADO'
  | 'FINALIZADO'

export type FreightType = 'CIF' | 'FOB' | 'OUTRO'

export interface PurchaseOrderItem {
  id?:              number
  productId:        number
  productName?:     string
  quantity:         number
  unitCost:         number
  subTotal?:        number
  receivedQuantity?: number
  damagedQuantity?:  number
  pendingQuantity?:  number
  damageReason?:    string
}

export interface PurchaseOrderRecord {
  id:                    number
  supplierId:            number
  supplierName:          string
  status:                PurchaseOrderStatus
  totalAmount:           number
  observation?:          string
  expectedDeliveryDate?: string
  paymentCondition?:     string
  freightType?:          FreightType
  invoiceNumber?:        string
  receivedAt?:           string
  createdAt?:            string
  items:                 PurchaseOrderItem[]
}

export interface CreatePurchaseOrderRequest {
  supplierId:            number
  expectedDeliveryDate?: string
  paymentCondition:      string
  freightType?:          FreightType
  observation?:          string
  items: {
    productId: number
    quantity:  number
    unitCost:  number
  }[]
}

export interface ReceiveItemRequest {
  itemId:            number
  receivedQuantity:  number
  damagedQuantity?:  number
  damageReason?:     string
}

export interface ReceiveRequest {
  invoiceNumber?: string
  observations?:  string
  items:          ReceiveItemRequest[]
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

  approve: async (id: number): Promise<PurchaseOrderRecord> => {
    const { data } = await api.patch(`/purchase-orders/${id}/approve`)
    return data
  },

  sendToReceiving: async (id: number): Promise<PurchaseOrderRecord> => {
    const { data } = await api.patch(`/purchase-orders/${id}/send-to-receiving`)
    return data
  },

  receive: async (id: number, payload: ReceiveRequest): Promise<PurchaseOrderRecord> => {
    const { data } = await api.post(`/purchase-orders/${id}/receive`, payload)
    return data
  },

  finalize: async (id: number): Promise<PurchaseOrderRecord> => {
    const { data } = await api.patch(`/purchase-orders/${id}/finalize`)
    return data
  },

  cancel: async (id: number): Promise<PurchaseOrderRecord> => {
    const { data } = await api.patch(`/purchase-orders/${id}/cancel`)
    return data
  },

  getSuppliers: async (): Promise<PageResponse<SupplierOption>> => {
    const { data } = await api.get('/persons', { params: { size: 500, role: 'FORNECEDOR' } })
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
