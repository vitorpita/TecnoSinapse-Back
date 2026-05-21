import { api } from '@/libs/axios'

export type UserRole = 'ADMIN' | 'GERENTE' | 'VENDEDOR'

export interface UserRecord {
  id:         number
  name:       string
  login:      string
  role:       UserRole
  cargoId?:   number
  cargoName?: string
  active?:    boolean
}

export interface CreateUserRequest {
  name:     string
  login:    string
  password: string
  role:     UserRole
  cargoId?: number
}

export interface UpdateUserRequest {
  name:      string
  login:     string
  role:      UserRole
  password?: string
  cargoId?:  number | null
}

export interface PageResponse<T> {
  content:       T[]
  totalElements: number
  totalPages:    number
  number:        number
  size:          number
}

export const userService = {
  list: async (page = 0, size = 20, search?: string, inactive = false): Promise<PageResponse<UserRecord>> => {
    const { data } = await api.get('/users', {
      params: { page, size, ...(search ? { search } : {}), inactive, sort: 'name,asc' },
    })
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
    }
    return data
  },

  create: async (payload: CreateUserRequest): Promise<UserRecord> => {
    const { data } = await api.post('/auth/admin/create-user', payload)
    return data
  },

  update: async (id: number, payload: UpdateUserRequest): Promise<UserRecord> => {
    const { data } = await api.put(`/users/${id}`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`)
  },

  reactivate: async (id: number): Promise<UserRecord> => {
    const { data } = await api.patch(`/users/${id}/reactivate`)
    return data
  },

  getMe: async (): Promise<UserRecord> => {
    const { data } = await api.get('/users/me')
    return data
  },

  updateMe: async (payload: { name: string; password?: string }): Promise<UserRecord> => {
    const { data } = await api.put('/users/me', payload)
    return data
  },
}