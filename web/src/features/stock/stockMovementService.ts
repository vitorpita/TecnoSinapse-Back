import { api } from '@/libs/axios'

export type MovementType = 'ENTRADA' | 'SAIDA'

export interface StockMovementRecord {
  id:            number
  productId:     number
  productName:   string
  type:          MovementType
  quantity:      number
  reason:        string
  referenceId?:  number
  referenceType?: string
  createdBy?:    string
  createdAt?:    string
}

export interface CreateStockMovementRequest {
  productId: number
  type:      MovementType
  quantity:  number
  reason:    string
}

export interface PageResponse<T> {
  content:       T[]
  totalElements: number
  totalPages:    number
  number:        number
  size:          number
}

export interface ProductOption {
  id:            number
  name:          string
  sku?:          string
  stockQuantity: number
}

export const stockMovementService = {
  list: async (page = 0, size = 20): Promise<PageResponse<StockMovementRecord>> => {
    const { data } = await api.get('/stock-movements', {
      params: { page, size, sort: 'createdAt,desc' },
    })
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
    }
    return data
  },

  listByProduct: async (productId: number, page = 0, size = 20): Promise<PageResponse<StockMovementRecord>> => {
    const { data } = await api.get(`/stock-movements/product/${productId}`, {
      params: { page, size, sort: 'createdAt,desc' },
    })
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
    }
    return data
  },

  create: async (payload: CreateStockMovementRequest): Promise<StockMovementRecord> => {
    const { data } = await api.post('/stock-movements', payload)
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