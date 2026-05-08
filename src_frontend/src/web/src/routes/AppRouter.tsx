import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/features/auth/pages/LoginPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import OrdersPage from '@/features/orders/pages/OrdersPage'
import PersonPage from '@/features/registers/pages/PersonPage'
import CategoryPage from '@/features/category/pages/Categorypage'
import UsersPage from '@/features/user/pages/Userspage'
import PurchaseOrdersPage from '@/features/purchase/pages/Purchaseorderspage'
import ProductsPage    from '@/features/product/pages/ProductsPage'
import ProductFormPage from '@/features/product/pages/ProductFormPage'
import StockMovementsPage from '@/features/movement/pages/StockMovementsPage'



function ComingSoon({ name }: { name: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', flexDirection: 'column', gap: 8,
      fontFamily: "'Exo 2', sans-serif", color: '#042C53'
    }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>
      <p style={{ fontWeight: 300, color: '#888', fontSize: 12 }}>Módulo em desenvolvimento</p>
    </div>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/"                element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/products"      element={<ProductsPage />} />
            <Route path="/products/new"  element={<ProductFormPage />} />
            <Route path="/products/:id"  element={<ProductFormPage />} />
            <Route path="/stock" element={<StockMovementsPage />} />            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/cash-register"   element={<ComingSoon name="Controle de Caixa" />} />
            <Route path="/payments"        element={<ComingSoon name="Pagamentos" />} />
            <Route path="/persons" element={<PersonPage />} />
            <Route path="/categories" element={<CategoryPage />} />
            <Route path="/users"           element={<UsersPage />} />
            <Route path="/reports"         element={<ComingSoon name="Relatórios" />} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}