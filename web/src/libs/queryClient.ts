import { QueryClient } from '@tanstack/react-query'

interface HttpError extends Error {
  response?: {
    status: number
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: (failureCount, error: unknown) => {
        const status = (error as HttpError)?.response?.status
        
        if (status === 401 || status === 403 || status === 404) return false
        
        return failureCount < 3
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
})