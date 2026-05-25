import { api } from '@/libs/axios'
import type { OrderResponse, OrderRequest, PageResponse, PersonOption, ProductOption } from './types/order.types'

const PERSONS_SIZE = 200
const PRODUCTS_SIZE = 500
const DEFAULT_PAGE_SIZE = 20

interface SellerOption {
  id: number
  name: string
  login: string
  role: string
}

export const orderService = {
  findAll: async (page = 0, size = DEFAULT_PAGE_SIZE, search?: string): Promise<PageResponse<OrderResponse>> => {
    const { data } = await api.get<PageResponse<OrderResponse>>('/orders', {
      params: { page, size, sort: 'id,desc', ...(search ? { search } : {}) },
    })
    return data
  },

  findById: async (id: number): Promise<OrderResponse> => {
    const { data } = await api.get<OrderResponse>(`/orders/${id}`)
    return data
  },

  create: async (payload: OrderRequest): Promise<OrderResponse> => {
    const { data } = await api.post<OrderResponse>('/orders', payload)
    return data
  },

  update: async (id: number, payload: OrderRequest): Promise<OrderResponse> => {
    const { data } = await api.put<OrderResponse>(`/orders/${id}`, payload)
    return data
  },

  awaitApproval: async (id: number): Promise<OrderResponse> => {
    const { data } = await api.patch<OrderResponse>(`/orders/${id}/await-approval`)
    return data
  },

  approve: async (id: number): Promise<OrderResponse> => {
    const { data } = await api.patch<OrderResponse>(`/orders/${id}/approve`)
    return data
  },

  faturar: async (id: number, payload?: { paymentMethod?: string; paymentCondition?: string }): Promise<OrderResponse> => {
    const { data } = await api.patch<OrderResponse>(`/orders/${id}/faturar`, payload ?? {})
    return data
  },

  ship: async (id: number): Promise<OrderResponse> => {
    const { data } = await api.patch<OrderResponse>(`/orders/${id}/ship`)
    return data
  },

  deliver: async (id: number): Promise<OrderResponse> => {
    const { data } = await api.patch<OrderResponse>(`/orders/${id}/deliver`)
    return data
  },

  cancel: async (id: number): Promise<OrderResponse> => {
    const { data } = await api.patch<OrderResponse>(`/orders/${id}/cancel`)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/orders/${id}`)
  },

  getClients: async (): Promise<PageResponse<PersonOption>> => {
    const { data } = await api.get<PageResponse<PersonOption> | PersonOption[]>('/persons', {
      params: { size: PERSONS_SIZE, role: 'CLIENTE' },
    })

    if (Array.isArray(data)) {
      return {
        content: data,
        totalElements: data.length,
        totalPages: 1,
        number: 0,
        size: data.length,
      }
    }

    return data
  },

  getSellers: async (): Promise<PageResponse<SellerOption>> => {
    const { data } = await api.get<PageResponse<SellerOption> | SellerOption[]>('/users', {
      params: { size: PERSONS_SIZE, role: 'VENDEDOR' },
    })

    if (Array.isArray(data)) {
      return {
        content: data,
        totalElements: data.length,
        totalPages: 1,
        number: 0,
        size: data.length,
      }
    }

    return data
  },

  getProducts: async (): Promise<PageResponse<ProductOption>> => {
    const { data } = await api.get<PageResponse<ProductOption>>('/products', {
      params: { size: PRODUCTS_SIZE },
    })
    return data
  },
}