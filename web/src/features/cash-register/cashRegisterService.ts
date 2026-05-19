import { api } from '@/libs/axios'

export type CashMovementType = 'ENTRADA' | 'SAIDA' | 'RECEBIMENTO' | 'SANGRIA' | 'SUPRIMENTO' | 'ABERTURA' | 'FECHAMENTO' | 'ESTORNO' | 'TRANSFERENCIA'

export interface CashMovement {
  id:          number
  type:        CashMovementType
  amount:      number
  description: string
  orderId?:    number
  paymentId?:  number
  createdAt?:  string
}

export interface CashRegisterRecord {
  id:                number
  openedById:        number
  openedByName:      string
  closedById?:       number
  closedByName?:     string
  openingBalance:    number
  closingBalance?:   number
  openedAt:          string
  closedAt?:         string
  observation?:      string
  closed:            boolean
  totalIn?:          number
  totalOut?:         number
  totalSangrias?:    number
  totalSuprimentos?: number
  expectedBalance?:  number
  balanceDifference?:number
  movements:         CashMovement[]
}

export interface CreateCashMovementRequest {
  type:         CashMovementType
  amount:       number
  description:  string
  orderId?:     number
}

export interface CloseCashRegisterRequest {
  closingBalance: number
  observation?:   string
}

export interface PageResponse<T> {
  content:       T[]
  totalElements: number
  totalPages:    number
  number:        number
  size:          number
}

export const cashRegisterService = {
  getCurrentCash: async (): Promise<CashRegisterRecord | null> => {
    try {
      const { data } = await api.get('/cash-registers/open')
      return data || null
    } catch {
      return null
    }
  },

  list: async (page = 0, size = 20): Promise<PageResponse<CashRegisterRecord>> => {
    const { data } = await api.get('/cash-registers', {
      params: { page, size, sort: 'openedAt,desc' },
    })
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
    }
    return data
  },

  openCash: async (openingBalance: number): Promise<CashRegisterRecord> => {
    const { data } = await api.post('/cash-registers/open', { openingBalance })
    return data
  },

  addMovement: async (cashId: number, payload: CreateCashMovementRequest): Promise<CashRegisterRecord> => {
    const { data } = await api.post(`/cash-registers/${cashId}/movements`, payload)
    return data
  },

  closeCash: async (cashId: number, payload: CloseCashRegisterRequest): Promise<CashRegisterRecord> => {
    const { data } = await api.patch(`/cash-registers/${cashId}/close`, payload)
    return data
  },
}
