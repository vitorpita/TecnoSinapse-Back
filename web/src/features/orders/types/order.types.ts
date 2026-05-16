export type OrderStatus = 'DIGITACAO' | 'AGUARDANDO_APROVACAO' | 'APROVADO' | 'FATURADO' | 'ENVIADO' | 'ENTREGUE' | 'CANCELADO'

export type PaymentMethod = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'BOLETO' | 'TRANSFERENCIA' | 'CHEQUE'

export interface OrderResponse {
  id: number
  clientId: number
  clientName: string
  sellerId: number
  sellerName: string
  status: OrderStatus
  totalAmount: number | string
  paymentMethod?: string
  paymentCondition?: string
  observation?: string
  items: OrderItemResponse[]
  createdAt?: string
  updatedAt?: string
}

export interface OrderItemResponse {
  id: number
  productId: number
  productName: string
  quantity: number | string
  unitPrice: number | string
  subTotal: number | string
}

export interface OrderRequest {
  clientId: number
  sellerId: number
  paymentMethod?: string
  paymentCondition?: string
  observation?: string
  items: OrderItemRequest[]
}

export interface OrderItemRequest {
  productId: number
  quantity: number
  unitPrice: number
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface PersonOption {
  id: number
  name: string
  document?: string
  email?: string
  phone?: string
  roles?: string[]
}

export interface ProductOption {
  id: number
  name: string
  sku?: string
  unitPrice: number
  stockQuantity: number
  categoryId?: number
  categoryName?: string
}