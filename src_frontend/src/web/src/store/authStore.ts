import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'ADMIN' | 'GERENTE' | 'VENDEDOR'

export interface AuthUser {
  name: string
  login: string
  role: UserRole
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
}

function parseJwt(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      name: payload.name ?? payload.sub,
      login: payload.sub,
      role: payload.role as UserRole,
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
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          const user = parseJwt(state.token)
          if (user) state.user = user
        }
      },
    }
  )
)

export { parseJwt }