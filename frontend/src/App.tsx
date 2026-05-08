import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';

import LoginPage from '@/modules/auth/LoginPage';
import DashboardPage from '@/modules/dashboard/DashboardPage';
import KassaPage from '@/modules/kassa/KassaPage';
import RoosterPage from '@/modules/rooster/RoosterPage';
import FinancePage from '@/modules/financieel/FinancePage';
import WastePage from '@/modules/waste/WastePage';
import ReviewsPage from '@/modules/reviews/ReviewsPage';
import BestelPage from '@/modules/bestel/BestelPage';
import CheckoutPage from '@/modules/bestel/CheckoutPage';
import OrderStatusPage from '@/modules/bestel/OrderStatusPage';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/bestel" element={<BestelPage />} />
          <Route path="/bestel/afrekenen" element={<CheckoutPage />} />
          <Route path="/bestel/status/:orderId" element={<OrderStatusPage />} />

          {/* Protected inside AppLayout */}
          <Route element={<AppLayout />}>
            <Route element={<ProtectedRoute roles={['owner', 'partner']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['cashier', 'manager']} />}>
              <Route path="/kassa" element={<KassaPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['manager', 'staff']} />}>
              <Route path="/rooster" element={<RoosterPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['owner', 'boekhouder']} />}>
              <Route path="/financieel" element={<FinancePage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['staff', 'manager', 'owner']} />}>
              <Route path="/waste" element={<WastePage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['owner', 'partner', 'manager']} />}>
              <Route path="/reviews" element={<ReviewsPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center min-h-screen gap-3">
              <p className="text-6xl font-bold text-primary">404</p>
              <p className="text-gray-500">Pagina niet gevonden</p>
              <a href="/login" className="text-primary hover:underline text-sm">Terug naar inloggen</a>
            </div>
          } />
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}
