import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute        from './ProtectedRoute'
import AppLayout             from '@/components/layout/AppLayout'
import LoginPage             from '@/features/auth/pages/LoginPage'
import DashboardPage         from '@/features/dashboard/pages/DashboardPage'
import OrdersPage            from '@/features/orders/pages/OrdersPage'
import PersonPage            from '@/features/persons/pages/PersonPage'
import CategoryPage          from '@/features/categories/pages/CategoryPage'
import UsersPage             from '@/features/users/pages/UsersPage'
import PurchaseOrdersPage    from '@/features/purchase-orders/pages/PurchaseOrdersPage'
import ProductsPage          from '@/features/products/pages/ProductsPage'
import ProductFormPage       from '@/features/products/pages/ProductFormPage'
import StockMovementsPage    from '@/features/stock/pages/StockMovementsPage'
import CashRegisterPage    from '@/features/cash-register/pages/CashRegisterPage'
import PaymentPage      from '@/features/payment/pages/PaymentsPage'
import NewPaymentPage  from '@/features/payment/pages/NewPaymentPage'
import ReportsPage      from '@/features/reports/pages/ReportsPage'
import CargoPage        from '@/features/cargos/pages/CargoPage'
import AuditLogPage     from '@/features/audit-logs/pages/AuditLogPage'
import ProfilePage      from '@/features/users/pages/ProfilePage'


export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/"                element={<DashboardPage />} />
            <Route path="/orders"          element={<OrdersPage />} />
            <Route path="/products"        element={<ProductsPage />} />
            <Route path="/products/new"    element={<ProductFormPage />} />
            <Route path="/products/:id"    element={<ProductFormPage />} />
            <Route path="/stock"           element={<StockMovementsPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/cash-register"   element={<CashRegisterPage />} />
            <Route path="/payments"        element={<PaymentPage />} />
            <Route path="/payments/new"    element={<NewPaymentPage />} />
            <Route path="/persons"         element={<PersonPage />} />
            <Route path="/categories"      element={<CategoryPage />} />
            <Route path="/users"           element={<UsersPage />} />
            <Route path="/profile"         element={<ProfilePage />} />
            <Route path="/cargos"          element={<CargoPage />} />
            <Route path="/audit-logs"      element={<AuditLogPage />} />
            <Route path="/reports"         element={<ReportsPage />} />
            <Route path="*"                element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}