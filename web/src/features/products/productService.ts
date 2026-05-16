import { api } from '@/libs/axios'

export interface ProductRecord {
  id:            number
  name:          string
  sku?:          string
  color?:        string
  composition?:  string
  weightGsm?:    number
  width?:        number
  stockQuantity: number
  unitPrice:     number
  purchasePrice: number
  categoryId?:   number
  categoryName?: string
  providerId?:   number
  providerName?: string
  imgUrl?:       string
  active?:       boolean
  createdAt?:    string
  updatedAt?:    string
}

export interface CreateProductRequest {
  name:          string
  sku?:          string
  color?:        string
  composition?:  string
  weightGsm?:    number
  width?:        number
  stockQuantity: number
  unitPrice:     number
  purchasePrice: number
  categoryId?:   number
  providerId?:   number
  imgUrl?:       string
}

export interface PageResponse<T> {
  content:       T[]
  totalElements: number
  totalPages:    number
  number:        number
  size:          number
}

export interface CategoryOption {
  id:   number
  name: string
}

export interface ProviderOption {
  id:   number
  name: string
}

export const productService = {
  list: async (page = 0, size = 20, search?: string): Promise<PageResponse<ProductRecord>> => {
    const { data } = await api.get('/products', {
      params: { page, size, ...(search ? { search } : {}) },
    })
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
    }
    return data
  },

  findById: async (id: number): Promise<ProductRecord> => {
    const { data } = await api.get(`/products/${id}`)
    return data
  },

  create: async (payload: CreateProductRequest): Promise<ProductRecord> => {
    const { data } = await api.post('/products', payload)
    return data
  },

  update: async (id: number, payload: CreateProductRequest): Promise<ProductRecord> => {
    const { data } = await api.put(`/products/${id}`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`)
  },

  getCategories: async (): Promise<PageResponse<CategoryOption>> => {
    const { data } = await api.get('/categories', { params: { size: 200 } })
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
    }
    return data
  },

  getProviders: async (): Promise<PageResponse<ProviderOption>> => {
    const { data } = await api.get('/persons', { params: { size: 200 } })
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
    }
    return data
  },

    uploadImage: async (file: File, cloudName: string, uploadPreset: string): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', 'tecnosinapse/produtos')

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
        method: 'POST',
        body: formData,
        }
    )

    if (!response.ok) {
        const err = await response.json()
        throw new Error(err?.error?.message ?? 'Falha no upload')
    }

    const result = await response.json()
    return result.secure_url as string
  },
}