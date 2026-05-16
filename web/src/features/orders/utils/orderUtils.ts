import type { OrderStatus } from '../types/order.types'

export const statusConfig: Record<OrderStatus, { label: string; antColor: string }> = {
  DIGITACAO:            { label: 'Digitação',     antColor: 'default'  },
  AGUARDANDO_APROVACAO: { label: 'Ag. Aprovação', antColor: 'orange'   },
  APROVADO:             { label: 'Aprovado',       antColor: 'blue'     },
  FATURADO:             { label: 'Faturado',       antColor: 'geekblue' },
  ENVIADO:              { label: 'Enviado',        antColor: 'lime'     },
  ENTREGUE:             { label: 'Entregue',       antColor: 'green'    },
  CANCELADO:            { label: 'Cancelado',      antColor: 'red'      },
}

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export const formatDate = (date: string | undefined): string => {
  if (!date) return '—'
  
  try {
    const dateObj = new Date(date)
    return dateObj.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return '—'
  }
}

export const formatDateTime = (date: string | undefined): string => {
  if (!date) return '—'
  
  try {
    const dateObj = new Date(date)
    return dateObj.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '—'
  }
}

export const formatQuantity = (value: number | string): string => {
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}