import { z } from 'zod';

export const Id = z.string().uuid();

export const restaurantSchema = z.object({
  id: Id,
  name: z.string(),
  currency: z.string().default('PKR'),
  timezone: z.string(),
  locale: z.string(),
  serviceFee: z.number().default(0),
  tipOptions: z.array(z.number()).default([])
});
export type Restaurant = z.infer<typeof restaurantSchema>;

export const tableSchema = z.object({
  id: Id,
  number: z.string(),
  capacity: z.number().int(),
  status: z.enum(['vacant', 'seated', 'dirty', 'held']),
  currentSessionId: Id.optional()
});
export type Table = z.infer<typeof tableSchema>;

export const sessionSchema = z.object({
  id: Id,
  tableId: Id,
  openedByUserId: Id,
  openedAt: z.date(),
  closedAt: z.date().nullable(),
  pax: z.number().int(),
  notes: z.string().optional()
});
export type Session = z.infer<typeof sessionSchema>;

export const userSchema = z.object({
  id: Id,
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  role: z.enum(['admin', 'manager', 'cashier', 'waiter', 'chef', 'customer']),
  pinHash: z.string(),
  status: z.string()
});
export type User = z.infer<typeof userSchema>;

export const menuCategorySchema = z.object({
  id: Id,
  name: z.string(),
  sortOrder: z.number().int(),
  visible: z.boolean()
});
export type MenuCategory = z.infer<typeof menuCategorySchema>;

export const menuItemSchema = z.object({
  id: Id,
  categoryId: Id,
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  photoUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  active: z.boolean().default(true)
});
export type MenuItem = z.infer<typeof menuItemSchema>;

export const modifierGroupSchema = z.object({
  id: Id,
  name: z.string(),
  required: z.boolean().default(false),
  min: z.number().int().optional(),
  max: z.number().int().optional(),
  sortOrder: z.number().int().default(0)
});
export type ModifierGroup = z.infer<typeof modifierGroupSchema>;

export const modifierSchema = z.object({
  id: Id,
  groupId: Id,
  name: z.string(),
  priceDelta: z.number().default(0),
  sortOrder: z.number().int().default(0)
});
export type Modifier = z.infer<typeof modifierSchema>;

export const orderSchema = z.object({
  id: Id,
  sessionId: Id,
  source: z.enum(['customer', 'waiter', 'kiosk']),
  status: z.enum(['open', 'sent', 'in_progress', 'ready', 'served', 'void']),
  sentAt: z.date().nullable()
});
export type Order = z.infer<typeof orderSchema>;

export const orderItemSchema = z.object({
  id: Id,
  orderId: Id,
  menuItemId: Id,
  qty: z.number().int().min(1),
  notes: z.string().optional(),
  seatNo: z.number().int().optional(),
  priceEach: z.number(),
  modifiersJson: z.string().optional()
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const ticketSchema = z.object({
  id: Id,
  orderId: Id,
  station: z.enum(['kitchen', 'bar']),
  status: z.enum(['new', 'in_progress', 'ready', 'bumped']),
  printedAt: z.date().nullable()
});
export type Ticket = z.infer<typeof ticketSchema>;

export const billSchema = z.object({
  id: Id,
  sessionId: Id,
  status: z.enum(['open', 'partially_paid', 'paid', 'void']),
  subtotal: z.number(),
  tax: z.number(),
  serviceFee: z.number(),
  tip: z.number(),
  discounts: z.number(),
  total: z.number()
});
export type Bill = z.infer<typeof billSchema>;

export const billSplitSchema = z.object({
  id: Id,
  billId: Id,
  label: z.string(),
  seatNos: z.array(z.number().int()).default([]),
  amount: z.number(),
  status: z.string()
});
export type BillSplit = z.infer<typeof billSplitSchema>;

export const paymentSchema = z.object({
  id: Id,
  billId: Id,
  method: z.enum(['cash', 'card', 'easypaisa', 'jazzcash']),
  providerRef: z.string().nullable(),
  amount: z.number(),
  tipAmount: z.number().default(0),
  status: z.enum(['authorized', 'captured', 'failed', 'void']),
  createdByUserId: Id.optional(),
  paidAt: z.date().nullable()
});
export type Payment = z.infer<typeof paymentSchema>;

export const notificationSchema = z.object({
  id: Id,
  type: z.enum(['call_waiter', 'order_status', 'payment']),
  tableId: Id.optional(),
  sessionId: Id.optional(),
  payloadJson: z.string().optional(),
  ackByUserId: Id.optional(),
  ackAt: z.date().nullable()
});
export type Notification = z.infer<typeof notificationSchema>;

export const deviceSchema = z.object({
  id: Id,
  type: z.enum(['kds', 'printer', 'display', 'tablet']),
  name: z.string(),
  location: z.string().optional(),
  pairingCode: z.string(),
  lastSeenAt: z.date().nullable()
});
export type Device = z.infer<typeof deviceSchema>;

export const qrCodeSchema = z.object({
  id: Id,
  tableId: Id,
  slug: z.string(),
  secret: z.string(),
  active: z.boolean().default(true),
  lastRotatedAt: z.date().nullable()
});
export type QRCode = z.infer<typeof qrCodeSchema>;

export const schemas = {
  restaurantSchema,
  tableSchema,
  sessionSchema,
  userSchema,
  menuCategorySchema,
  menuItemSchema,
  modifierGroupSchema,
  modifierSchema,
  orderSchema,
  orderItemSchema,
  ticketSchema,
  billSchema,
  billSplitSchema,
  paymentSchema,
  notificationSchema,
  deviceSchema,
  qrCodeSchema
};

export type {
  Restaurant,
  Table,
  Session,
  User,
  MenuCategory,
  MenuItem,
  ModifierGroup,
  Modifier,
  Order,
  OrderItem,
  Ticket,
  Bill,
  BillSplit,
  Payment,
  Notification,
  Device,
  QRCode
};
