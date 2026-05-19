import { api } from '@/libs/axios'

export type AuditModule =
  | 'AUTH' | 'USERS' | 'CARGOS' | 'PRODUCTS' | 'CATEGORIES'
  | 'PERSONS' | 'ORDERS' | 'STOCK' | 'PAYMENTS'
  | 'CASH_REGISTER' | 'PURCHASE_ORDERS' | 'REPORTS'

export type AuditAction = 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'DEACTIVATE'

export const MODULE_LABELS: Record<AuditModule, string> = {
  AUTH:            'Autenticação',
  USERS:           'Usuários',
  CARGOS:          'Cargos',
  PRODUCTS:        'Produtos',
  CATEGORIES:      'Categorias',
  PERSONS:         'Pessoas',
  ORDERS:          'Pedidos',
  STOCK:           'Estoque',
  PAYMENTS:        'Pagamentos',
  CASH_REGISTER:   'Caixa',
  PURCHASE_ORDERS: 'Compras',
  REPORTS:         'Relatórios',
}

export const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN:       'Login',
  LOGOUT:      'Logout',
  CREATE:      'Criação',
  UPDATE:      'Edição',
  DELETE:      'Exclusão',
  DEACTIVATE:  'Inativação',
}

export const ACTION_COLORS: Record<AuditAction, string> = {
  LOGIN:      'green',
  LOGOUT:     'default',
  CREATE:     'blue',
  UPDATE:     'orange',
  DELETE:     'red',
  DEACTIVATE: 'volcano',
}

export interface AuditLogRecord {
  id:          number
  timestamp:   string
  userId?:     number
  userName?:   string
  module:      AuditModule
  action:      AuditAction
  entityId?:   number
  entityName?: string
  details?:    string
}

export interface PageResponse<T> {
  content:       T[]
  totalElements: number
  totalPages:    number
  number:        number
  size:          number
}

export const auditLogService = {
  findAll: async (page = 0, size = 50): Promise<PageResponse<AuditLogRecord>> => {
    const { data } = await api.get('/audit-logs', { params: { page, size, sort: 'timestamp,desc' } })
    return data
  },

  findByModule: async (module: AuditModule, page = 0, size = 50): Promise<PageResponse<AuditLogRecord>> => {
    const { data } = await api.get(`/audit-logs/module/${module}`, { params: { page, size } })
    return data
  },
}
