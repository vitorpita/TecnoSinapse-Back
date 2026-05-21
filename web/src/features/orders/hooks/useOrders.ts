import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderService } from '../orderService'
import { message } from 'antd'
import type { OrderResponse, OrderRequest, PageResponse } from '../types/order.types'

const ORDERS_QUERY_KEY = ['orders']
const CLIENTS_QUERY_KEY = ['clients']
const SELLERS_QUERY_KEY = ['sellers']
const PRODUCTS_QUERY_KEY = ['products']

export function useOrders(page = 0, search = '') {
  const query = useQuery({
    queryKey: [ORDERS_QUERY_KEY, page, search],
    queryFn: () => orderService.findAll(page, 20, search || undefined),
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useOrderClients() {
  return useQuery({
    queryKey: CLIENTS_QUERY_KEY,
    queryFn: () => orderService.getClients(),
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  })
}

export function useOrderSellers() {
  return useQuery({
    queryKey: SELLERS_QUERY_KEY,
    queryFn: () => orderService.getSellers(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  })
}

export function useOrderProducts() {
  return useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: () => orderService.getProducts(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: OrderRequest) => orderService.create(data),
    onSuccess: () => {
      message.success('Pedido criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      queryClient.refetchQueries({ queryKey: ORDERS_QUERY_KEY })
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || 'Erro ao criar pedido'
      message.error(errorMsg)
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OrderRequest }) =>
      orderService.update(id, payload),
    onSuccess: () => {
      message.success('Pedido atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      queryClient.refetchQueries({ queryKey: ORDERS_QUERY_KEY })
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || 'Erro ao atualizar pedido'
      message.error(errorMsg)
    },
  })
}

export function useAwaitApprovalOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => orderService.awaitApproval(id),
    onSuccess: () => {
      message.success('Pedido enviado para aprovação!')
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      queryClient.refetchQueries({ queryKey: ORDERS_QUERY_KEY })
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || 'Erro ao enviar pedido para aprovação'
      message.error(errorMsg)
    },
  })
}

export function useApproveOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => orderService.approve(id),
    onSuccess: () => {
      message.success('Pedido aprovado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      queryClient.refetchQueries({ queryKey: ORDERS_QUERY_KEY })
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || 'Erro ao aprovar pedido'
      message.error(errorMsg)
    },
  })
}

export function useFaturarOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, paymentMethod, paymentCondition }: { id: number; paymentMethod?: string; paymentCondition?: string }) =>
      orderService.faturar(id, { paymentMethod, paymentCondition }),
    onSuccess: () => {
      message.success('Pedido faturado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      queryClient.refetchQueries({ queryKey: ORDERS_QUERY_KEY })
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || 'Erro ao faturar pedido'
      message.error(errorMsg)
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => orderService.cancel(id),
    onSuccess: () => {
      message.success('Pedido cancelado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      queryClient.refetchQueries({ queryKey: ORDERS_QUERY_KEY })
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || 'Erro ao cancelar pedido'
      message.error(errorMsg)
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => orderService.delete(id),
    onSuccess: () => {
      message.success('Pedido deletado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      queryClient.refetchQueries({ queryKey: ORDERS_QUERY_KEY })
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || 'Erro ao deletar pedido'
      message.error(errorMsg)
    },
  })
}