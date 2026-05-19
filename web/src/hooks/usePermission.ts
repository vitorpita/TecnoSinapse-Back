import { useAuthStore } from '@/store/authStore'

export function usePermission() {
  const user = useAuthStore((s) => s.user)

  const isAdmin = user?.role === 'ADMIN'

  const has = (permission: string): boolean => {
    if (!user) return false
    if (isAdmin) return true
    return user.permissions.includes(permission)
  }

  const hasAny = (...permissions: string[]): boolean =>
    permissions.some((p) => has(p))

  const hasAll = (...permissions: string[]): boolean =>
    permissions.every((p) => has(p))

  return { has, hasAny, hasAll, isAdmin }
}
