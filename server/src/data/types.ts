export type UserRole = 'admin' | 'cashier' | 'waiter' | 'manager' | 'chef';
export type TableStatus = 'vacant' | 'seated' | 'dirty' | 'held';
export type OrderSource = 'customer' | 'waiter' | 'kiosk';
export type OrderStatus = 'open' | 'sent' | 'in_progress' | 'ready' | 'served' | 'void';
export type TicketStation = 'kitchen' | 'bar';
export type TicketStatus = 'new' | 'in_progress' | 'ready' | 'bumped';
export type BillStatus = 'open' | 'partially_paid' | 'paid' | 'void';
export type PaymentMethod = 'cash' | 'card' | 'easypaisa' | 'jazzcash';
export type PaymentStatus = 'authorized' | 'captured' | 'failed' | 'void';
export type NotificationType = 'call_waiter' | 'order_status' | 'payment';
export type DeviceType = 'kds' | 'printer' | 'display' | 'tablet';
export type StockAdjustmentSource = 'manual' | 'recipe' | 'count';
export type StockCountStatus = 'open' | 'completed';

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  currency: string;
  timezone: string;
  locale: string;
  serviceFee: number;
  tipOptions: number[];
}

export interface User {
  id: string;
  restaurantId: string;
  code: string;
  name: string;
  email?: string | null;
  role: UserRole;
  status: string;
  pinHash: string;
}

export interface Table {
  id: string;
  restaurantId: string;
  number: string;
  capacity: number;
  status: TableStatus;
  currentSessionId?: string | null;
}

export interface QRCode {
  id: string;
  restaurantId: string;
  tableId: string;
  slug: string;
  secret: string;
  active: boolean;
  lastRotatedAt?: string | null;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  visible: boolean;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  photoUrl?: string | null;
  tags: string[];
  allergens: string[];
  active: boolean;
}

export interface RecipeComponent {
  id: string;
  menuItemId: string;
  inventoryItemId: string;
  quantity: number;
  unit: string;
}

export interface InventoryItem {
  id: string;
  restaurantId: string;
  name: string;
  sku?: string | null;
  trackInventory: boolean;
  unit: string;
  parLevel?: number | null;
  currentStock: number;
  isActive: boolean;
}

export interface StockAdjustment {
  id: string;
  restaurantId: string;
  inventoryItemId: string;
  userId?: string | null;
  delta: number;
  reason: string;
  source: StockAdjustmentSource;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface StockCount {
  id: string;
  restaurantId: string;
  userId?: string | null;
  status: StockCountStatus;
  startedAt: string;
  completedAt?: string | null;
}

export interface StockCountEntry {
  id: string;
  stockCountId: string;
  inventoryItemId: string;
  expected: number;
  counted: number;
  variance: number;
  createdAt: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  sessionId?: string | null;
  takenByUserId?: string | null;
  source: OrderSource;
  status: OrderStatus;
  sentAt?: string | null;
  clientUuid: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  qty: number;
  notes?: string | null;
  seatNo?: number | null;
  priceEach: number;
  modifiersJson?: string | null;
}

export interface Payment {
  id: string;
  restaurantId: string;
  billId?: string | null;
  orderId?: string | null;
  method: PaymentMethod;
  providerRef?: string | null;
  amount: number;
  tipAmount: number;
  status: PaymentStatus;
  createdByUserId?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  restaurantId: string;
  type: DeviceType;
  name: string;
  location?: string | null;
  pairingCode: string;
  createdAt?: string | null;
  lastSeenAt?: string | null;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string | null;
  deviceId?: string | null;
}

export interface IdempotencyRecord {
  id: string;
  restaurantId: string;
  clientUuid: string;
  idempotencyKey: string;
  path: string;
  method: string;
  response: unknown;
  statusCode: number;
  createdAt: string;
}

export interface Database {
  restaurants: Restaurant[];
  users: User[];
  tables: Table[];
  qrCodes: QRCode[];
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  recipeComponents: RecipeComponent[];
  inventoryItems: InventoryItem[];
  stockAdjustments: StockAdjustment[];
  stockCounts: StockCount[];
  stockCountEntries: StockCountEntry[];
  orders: Order[];
  orderItems: OrderItem[];
  payments: Payment[];
  devices: Device[];
  refreshTokens: RefreshToken[];
  idempotencyRecords: IdempotencyRecord[];
}
