import { api } from '@/libs/axios'

export const ALL_PERMISSIONS = [
  { value: 'product:read',    label: 'Visualizar',       group: 'Produtos'     },
  { value: 'product:write',   label: 'Criar/Editar',     group: 'Produtos'     },
  { value: 'product:delete',  label: 'Excluir',          group: 'Produtos'     },
  { value: 'category:read',   label: 'Visualizar',     group: 'Categorias'   },
  { value: 'category:write',  label: 'Criar/Editar',   group: 'Categorias'   },
  { value: 'category:delete', label: 'Excluir',        group: 'Categorias'   },
  { value: 'person:read',     label: 'Visualizar',        group: 'Pessoas'      },
  { value: 'person:write',    label: 'Criar/Editar',      group: 'Pessoas'      },
  { value: 'person:delete',   label: 'Excluir',           group: 'Pessoas'      },
  { value: 'order:read',      label: 'Visualizar',        group: 'Pedidos'      },
  { value: 'order:write',     label: 'Criar/Editar',      group: 'Pedidos'      },
  { value: 'order:delete',    label: 'Cancelar',          group: 'Pedidos'      },
  { value: 'purchase:read',   label: 'Visualizar',        group: 'Compras'      },
  { value: 'purchase:write',  label: 'Criar/Editar',      group: 'Compras'      },
  { value: 'purchase:delete', label: 'Excluir',           group: 'Compras'      },
  { value: 'cash:read',       label: 'Visualizar',          group: 'Financeiro'   },
  { value: 'cash:write',      label: 'Abrir/Fechar/Lançar', group: 'Financeiro'   },
  { value: 'report:read',     label: 'Visualizar',     group: 'Relatórios'   },
  { value: 'user:read',       label: 'Visualizar',       group: 'Administração' },
  { value: 'user:write',      label: 'Criar/Editar',     group: 'Administração' },
  { value: 'user:delete',     label: 'Excluir',          group: 'Administração' },
]

export interface CargoRecord {
  id:           number
  name:         string
  description?: string
  permissions:  string[]
  active:       boolean
}

export interface CreateCargoRequest {
  name:         string
  description?: string
  permissions:  string[]
}

export interface PageResponse<T> {
  content:       T[]
  totalElements: number
  totalPages:    number
  number:        number
  size:          number
}

export const cargoService = {
  list: async (): Promise<CargoRecord[]> => {
    const { data } = await api.get('/cargos/list')
    return data
  },

  listPaged: async (page = 0, size = 50): Promise<PageResponse<CargoRecord>> => {
    const { data } = await api.get('/cargos', { params: { page, size } })
    return data
  },

  findById: async (id: number): Promise<CargoRecord> => {
    const { data } = await api.get(`/cargos/${id}`)
    return data
  },

  create: async (payload: CreateCargoRequest): Promise<CargoRecord> => {
    const { data } = await api.post('/cargos', payload)
    return data
  },

  update: async (id: number, payload: CreateCargoRequest): Promise<CargoRecord> => {
    const { data } = await api.put(`/cargos/${id}`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/cargos/${id}`)
  },
}
