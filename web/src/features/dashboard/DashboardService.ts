import { api } from '@/libs/axios'

export interface DashboardStats {
  totalSalesMonth:      number
  totalSalesDay:        number
  ordersDay:            number
  averageTicket:        number
  activeClients:        number
  totalProducts:        number
  totalStock:           number
  pendingOrders:        number
  salesByDay:           SalesByDay[]
}

export interface SalesByDay {
  date:   string 
  value:  number
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get('/dashboard/stats')
    return data
  },

  getSalesTrend: async (): Promise<SalesByDay[]> => {
    const { data } = await api.get('/dashboard/sales-trend')
    return data
  },
}