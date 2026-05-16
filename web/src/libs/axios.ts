import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('ts-auth')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      const token = parsed?.state?.token || parsed?.token
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (_) {}
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('ts-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)