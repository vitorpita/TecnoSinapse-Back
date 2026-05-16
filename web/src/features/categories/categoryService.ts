import { api } from '@/libs/axios'

export interface CategoryRecord {
  id:          number
  name:        string
  description?: string
  active?:     boolean
}

export interface CreateCategoryRequest {
  name:        string
  description?: string
}

export interface PageResponse<T> {
  content:       T[]
  totalElements: number
  totalPages:    number
  number:        number
  size:          number
}

export const categoryService = {
  list: async (page = 0, size = 20, search?: string): Promise<PageResponse<CategoryRecord>> => {
  const { data } = await api.get('/categories', {
    params: { page, size, ...(search ? { search } : {}) },
  })

  if (Array.isArray(data)) {
    return {
      content:       data,
      totalElements: data.length,
      totalPages:    1,
      number:        0,
      size:          data.length,
    }
  }

  return data
},

  create: async (payload: CreateCategoryRequest): Promise<CategoryRecord> => {
    const { data } = await api.post('/categories', payload)
    return data
  },

  update: async (id: number, payload: CreateCategoryRequest): Promise<CategoryRecord> => {
    const { data } = await api.put(`/categories/${id}`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`)
  },
}