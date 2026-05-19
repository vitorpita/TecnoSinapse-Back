import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'ADMIN' | 'GERENTE' | 'VENDEDOR'

export interface AuthUser {
  name: string
  login: string
  role: UserRole
  cargoId?: number
  cargoName?: string
  permissions: string[]
}

export interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
}

export function parseJwt(token: string): (AuthUser & { exp?: number }) | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')

    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )

    const payload = JSON.parse(jsonPayload)

    return {
      name: payload.name ?? payload.sub,
      login: payload.sub,
      role: payload.role as UserRole,
      cargoId: payload.cargoId,
      cargoName: payload.cargoName,
      permissions: payload.permissions ?? [],
      exp: payload.exp,
    }
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),

      clearAuth: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'ts-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          const payload = parseJwt(state.token)
          const isExpired = payload?.exp ? payload.exp * 1000 < Date.now() : false

          if (!payload || isExpired) {
            state.clearAuth()
          }
        }
      },
    }
  )
)