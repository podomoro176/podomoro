export type Role = 'owner' | 'partner' | 'boekhouder' | 'manager' | 'cashier' | 'staff';

export interface User {
  id: string;
  email: string;
  role: Role;
  branchId: string | null;
}

export type AllergenName =
  | 'gluten' | 'schaaldieren' | 'eieren' | 'vis' | 'pinda' | 'soja'
  | 'melk' | 'noten' | 'selderij' | 'mosterd' | 'sesam' | 'sulfieten'
  | 'lupine' | 'weekdieren';

export interface MenuItem {
  id: string;
  branchId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  allergens: AllergenName[];
  isAvailable: boolean;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  menuItem: MenuItem;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'pin' | 'credit_card' | 'online';
export type PaymentStatus = 'unpaid' | 'paid';

export interface Order {
  id: string;
  branchId: string;
  orderNumber: number;
  source: 'pos' | 'online';
  tableNumber?: number;
  isTakeaway: boolean;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  discountAmount: number;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  branch?: { name: string };
}

export interface Transaction {
  id: string;
  orderId: string;
  branchId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  cashierId?: string;
  createdAt: string;
  cashier?: { id: string; email: string };
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  isActive: boolean;
}

export interface Employee {
  id: string;
  branchId: string;
  userId: string;
  name: string;
  role: string;
  contractType: 'fulltime' | 'parttime' | 'oproep';
  hourlyRate: number;
  startDate: string;
}

export interface Shift {
  id: string;
  branchId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  roleOnShift: string;
  employee: Employee;
  branch?: Branch;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  branchId: string;
  type: 'vakantie' | 'ziek' | 'bijzonder_verlof';
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  employee?: Employee;
}

export interface WasteEntry {
  id: string;
  branchId: string;
  date: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: 'expired' | 'dropped' | 'overproduced' | 'quality_fail' | 'other';
  costPrice?: number;
  loggedBy: string;
  createdAt: string;
  logger?: { id: string; email: string };
}

export interface ReviewScore {
  id: string;
  branchId: string;
  score: number;
  reviewCount: number;
  source: 'manual' | 'google_api';
  createdAt: string;
}

export interface ReviewBranch {
  branch: Branch;
  currentScore: number | null;
  currentReviewCount: number | null;
  color: 'green' | 'amber' | 'red' | null;
  history: ReviewScore[];
}

export interface KpiData {
  revenueToday: number;
  revenueYesterday: number;
  staffOnShift: number;
  openOrders: number;
}

export interface RevenueDataPoint {
  branchId: string;
  date: string;
  revenue: number;
}

export interface AlertsData {
  pendingLeaveRequests: number;
  lowStockItems: number;
  wasteAnomalies: number;
  wastePercent: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
