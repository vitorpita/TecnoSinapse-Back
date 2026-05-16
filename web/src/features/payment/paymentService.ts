import { api } from '@/libs/axios'

export type PaymentStatus = 'PENDENTE' | 'PAGO' | 'PARCIAL' | 'CANCELADO' | 'ATRASADO'
export type PaymentMethod  = 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'TRANSFERENCIA' | 'CHEQUE' | 'BOLETO' | 'PIX'

export interface PaymentRecord {
  id:               number
  paymentMethod:    PaymentMethod
  amount:           number
  paidAt?:          string
  transactionCode?: string
  observation?:     string
  createdAt?:       string
  orderId:          number
  orderStatus?:     string
  clientId?:        number
  clientName?:      string
  clientDocument?:  string
  clientEmail?:     string
  clientPhone?:     string
  totalOrderAmount: number
  totalPaid:        number
  pending:          number
  paymentStatus:    PaymentStatus
}

export interface CreatePaymentRequest {
  orderId:              number
  paymentMethod:        PaymentMethod
  amount?:              number
  installments?:        number
  paidAt?:              string
  dueDate?:             string
  installmentDueDates?: string[]
  observation?:         string
}

export interface RegisterPaymentRequest {
  orderId:       number
  amount:        number
  paymentMethod: PaymentMethod
  paidAt:        string
  observation?:  string
}

export interface PaymentInstallment {
  id:                number
  paymentId:         number
  installmentNumber: number
  totalInstallments: number
  dueDate:           string
  amount:            number
  paidAmount:        number
  status:            PaymentStatus
  paidDate?:         string
}

export interface PageResponse<T> {
  content:       T[]
  totalElements: number
  totalPages:    number
  number:        number
  size:          number
}

export const paymentService = {
  list: async (page = 0, size = 20, status?: string): Promise<PageResponse<PaymentRecord>> => {
    const { data } = await api.get('/payments', {
      params: { page, size, ...(status ? { status } : {}), sort: 'createdAt,desc' },
    })
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
    }
    return data
  },

  getById: async (id: number): Promise<PaymentRecord> => {
    const { data } = await api.get(`/payments/${id}`)
    return data
  },

  create: async (payload: CreatePaymentRequest): Promise<PaymentRecord> => {
    const { data } = await api.post('/payments', payload)
    return data
  },

  registerPayment: async (payload: RegisterPaymentRequest): Promise<PaymentRecord> => {
    const { data } = await api.post('/payments', payload)
    return data
  },

  getInstallments: async (paymentId: number): Promise<PageResponse<PaymentInstallment>> => {
    const { data } = await api.get(`/payments/${paymentId}/installments`)
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
    }
    return data
  },

  getOrderPayments: async (orderId: number): Promise<PaymentRecord[]> => {
    const { data } = await api.get(`/orders/${orderId}/payments`)
    return Array.isArray(data) ? data : [data]
  },
}
