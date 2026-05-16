import { api } from '@/libs/axios' 

export interface CreatePersonRequest {
  name:        string
  document?:   string
  email?:      string
  phone?:      string
  roles:       string[]
  cep?:        string
  logradouro?: string
  numero?:     string
  bairro?:     string
  cidade?:     string
  estado?:     string
}

export interface PersonRecord {
  id:         number
  name:       string
  document?:  string
  email?:     string
  phone?:     string
  roles?:     string[]
  cep?:       string
  logradouro?: string
  numero?:    string
  bairro?:    string
  cidade?:    string
  estado?:    string
  active?:    boolean
}

export interface PageResponse<T> {
  content:       T[]
  totalElements: number
  totalPages:    number
  number:        number
  size:          number
}

export const personService = {
  create: async (payload: CreatePersonRequest): Promise<PersonRecord> => {
    const { data } = await api.post('/persons', payload)
    return data
  },

  list: async (page = 0, size = 20, search?: string): Promise<PageResponse<PersonRecord>> => {
    const response = await api.get('/persons', {
      params: {
        page,
        size,
        ...(search ? { search } : {}),
      },
    })
    return response.data
  },

  update: async (id: number, payload: CreatePersonRequest): Promise<PersonRecord> => {
    const { data } = await api.put(`/persons/${id}`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/persons/${id}`)
  },
}