import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute        from './ProtectedRoute'
import PermissionRoute       from './PermissionRoute'
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
import CashRegisterPage      from '@/features/cash-register/pages/CashRegisterPage'
import PaymentPage           from '@/features/payment/pages/PaymentsPage'
import NewPaymentPage        from '@/features/payment/pages/NewPaymentPage'
import ReportsPage           from '@/features/reports/pages/ReportsPage'
import CargoPage             from '@/features/cargos/pages/CargoPage'
import AuditLogPage          from '@/features/audit-logs/pages/AuditLogPage'
import ProfilePage           from '@/features/users/pages/ProfilePage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>

            <Route path="/" element={<PermissionRoute permission={null} />}>
              <Route index element={<DashboardPage />} />
            </Route>

            <Route path="/profile" element={<PermissionRoute permission={null} />}>
              <Route index element={<ProfilePage />} />
            </Route>

            <Route path="/orders" element={<PermissionRoute permission="order:read" />}>
              <Route index element={<OrdersPage />} />
            </Route>

            <Route path="/products" element={<PermissionRoute permission="product:read" />}>
              <Route index element={<ProductsPage />} />
            </Route>

            <Route path="/products/new" element={<PermissionRoute permission="product:write" />}>
              <Route index element={<ProductFormPage />} />
            </Route>

            <Route path="/products/:id" element={<PermissionRoute permission="product:write" />}>
              <Route index element={<ProductFormPage />} />
            </Route>

            <Route path="/stock" element={<PermissionRoute permission="product:read" />}>
              <Route index element={<StockMovementsPage />} />
            </Route>

            <Route path="/purchase-orders" element={<PermissionRoute permission="purchase:read" />}>
              <Route index element={<PurchaseOrdersPage />} />
            </Route>

            <Route path="/cash-register" element={<PermissionRoute permission="cash:read" />}>
              <Route index element={<CashRegisterPage />} />
            </Route>

            <Route path="/payments" element={<PermissionRoute permission="cash:read" />}>
              <Route index element={<PaymentPage />} />
            </Route>

            <Route path="/payments/new" element={<PermissionRoute permission="cash:write" />}>
              <Route index element={<NewPaymentPage />} />
            </Route>

            <Route path="/persons" element={<PermissionRoute permission="person:read" />}>
              <Route index element={<PersonPage />} />
            </Route>

            <Route path="/categories" element={<PermissionRoute permission="category:read" />}>
              <Route index element={<CategoryPage />} />
            </Route>

            <Route path="/users" element={<PermissionRoute permission="user:read" />}>
              <Route index element={<UsersPage />} />
            </Route>

            <Route path="/cargos" element={<PermissionRoute permission="admin" />}>
              <Route index element={<CargoPage />} />
            </Route>

            <Route path="/audit-logs" element={<PermissionRoute permission="admin" />}>
              <Route index element={<AuditLogPage />} />
            </Route>

            <Route path="/reports" element={<PermissionRoute permission="report:read" />}>
              <Route index element={<ReportsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
