import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type {
  Database,
  Device,
  DeviceType,
  IdempotencyRecord,
  InventoryItem,
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  OrderSource,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  RecipeComponent,
  RefreshToken,
  Restaurant,
  StockAdjustment,
  StockAdjustmentSource,
  StockCount,
  StockCountEntry,
  StockCountStatus,
  Table,
  User
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const SEED_PATH = path.join(DATA_DIR, 'seed.json');

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
}

function nowIso() {
  return new Date().toISOString();
}

export class DataStore {
  private data: Database;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_PATH)) {
      this.data = readJson(DB_PATH) as Database;
    } else {
      this.data = readJson(SEED_PATH) as Database;
      this.persist();
    }
  }

  private persist() {
    fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
  }

  reset() {
    this.data = readJson(SEED_PATH) as Database;
    this.persist();
  }

  // Restaurants & Users
  getRestaurantBySlug(slug: string): Restaurant | undefined {
    return this.data.restaurants.find(r => r.slug === slug);
  }

  getRestaurantById(id: string): Restaurant | undefined {
    return this.data.restaurants.find(r => r.id === id);
  }

  getUserByCode(restaurantId: string, code: string): User | undefined {
    return this.data.users.find(u => u.restaurantId === restaurantId && u.code.toUpperCase() === code.toUpperCase());
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  // Refresh tokens
  createRefreshToken(token: Omit<RefreshToken, 'id' | 'createdAt'>): RefreshToken {
    const record: RefreshToken = { ...token, id: randomUUID(), createdAt: nowIso() };
    this.data.refreshTokens.push(record);
    this.persist();
    return record;
  }

  getRefreshTokenByToken(token: string): RefreshToken | undefined {
    return this.data.refreshTokens.find(rt => rt.token === token);
  }

  updateRefreshToken(id: string, update: Partial<RefreshToken>): RefreshToken | undefined {
    const token = this.data.refreshTokens.find(rt => rt.id === id);
    if (!token) return undefined;
    Object.assign(token, update);
    this.persist();
    return token;
  }

  revokeRefreshTokensByToken(token: string) {
    return this.updateRefreshTokensByToken(token, { revokedAt: nowIso() });
  }

  updateRefreshTokensByToken(token: string, update: Partial<RefreshToken>) {
    let changed = 0;
    for (const record of this.data.refreshTokens) {
      if (record.token === token) {
        Object.assign(record, update);
        changed += 1;
      }
    }
    if (changed) this.persist();
    return changed;
  }

  // Menu
  listMenuItems(restaurantId: string): MenuItem[] {
    return this.data.menuItems.filter(item => item.restaurantId === restaurantId);
  }

  listAllMenuItems(): MenuItem[] {
    return [...this.data.menuItems];
  }

  listMenuCategories(restaurantId: string): MenuCategory[] {
    return this.data.menuCategories.filter(cat => cat.restaurantId === restaurantId);
  }

  listAllMenuCategories(): MenuCategory[] {
    return [...this.data.menuCategories];
  }

  getMenuCategoryById(id: string): MenuCategory | undefined {
    return this.data.menuCategories.find(cat => cat.id === id);
  }

  listRecipeComponents(menuItemId: string): RecipeComponent[] {
    return this.data.recipeComponents.filter(rc => rc.menuItemId === menuItemId);
  }

  // Inventory
  listInventoryItems(restaurantId: string): InventoryItem[] {
    return this.data.inventoryItems.filter(item => item.restaurantId === restaurantId);
  }

  listAllInventoryItems(): InventoryItem[] {
    return [...this.data.inventoryItems];
  }

  getInventoryItemById(id: string): InventoryItem | undefined {
    return this.data.inventoryItems.find(item => item.id === id);
  }

  updateInventoryItem(id: string, update: Partial<InventoryItem>): InventoryItem | undefined {
    const item = this.getInventoryItemById(id);
    if (!item) return undefined;
    Object.assign(item, update);
    this.persist();
    return item;
  }

  adjustInventoryItemStock(id: string, delta: number): InventoryItem | undefined {
    const item = this.getInventoryItemById(id);
    if (!item) return undefined;
    item.currentStock += delta;
    this.persist();
    return item;
  }

  logStockAdjustment(adjustment: Omit<StockAdjustment, 'id' | 'createdAt'>): StockAdjustment {
    const record: StockAdjustment = { ...adjustment, id: randomUUID(), createdAt: nowIso() };
    this.data.stockAdjustments.push(record);
    this.persist();
    return record;
  }

  logStockAdjustments(adjustments: Omit<StockAdjustment, 'id' | 'createdAt'>[]): StockAdjustment[] {
    const records = adjustments.map(adj => ({ ...adj, id: randomUUID(), createdAt: nowIso() }));
    this.data.stockAdjustments.push(...records);
    this.persist();
    return records;
  }

  deleteStockAdjustments(predicate: (record: StockAdjustment) => boolean): number {
    const before = this.data.stockAdjustments.length;
    this.data.stockAdjustments = this.data.stockAdjustments.filter(r => !predicate(r));
    const removed = before - this.data.stockAdjustments.length;
    if (removed > 0) {
      this.persist();
    }
    return removed;
  }

  createStockCount(
    restaurantId: string,
    userId: string | undefined,
    status: StockCountStatus,
    timestamps?: { startedAt?: string | Date | null; completedAt?: string | Date | null }
  ): StockCount {
    const startedAt = timestamps?.startedAt ? new Date(timestamps.startedAt).toISOString() : nowIso();
    const completedAt = timestamps?.completedAt
      ? new Date(timestamps.completedAt).toISOString()
      : timestamps?.completedAt === null
        ? null
        : status === 'completed'
          ? nowIso()
          : null;
    const record: StockCount = {
      id: randomUUID(),
      restaurantId,
      userId,
      status,
      startedAt,
      completedAt
    };
    this.data.stockCounts.push(record);
    this.persist();
    return record;
  }

  createStockCountEntry(entry: Omit<StockCountEntry, 'id' | 'createdAt'>): StockCountEntry {
    const record: StockCountEntry = { ...entry, id: randomUUID(), createdAt: nowIso() };
    this.data.stockCountEntries.push(record);
    this.persist();
    return record;
  }

  listStockCountEntries(stockCountId: string): StockCountEntry[] {
    return this.data.stockCountEntries.filter(entry => entry.stockCountId === stockCountId);
  }

  deleteStockCounts(predicate: (count: StockCount) => boolean): number {
    const before = this.data.stockCounts.length;
    this.data.stockCounts = this.data.stockCounts.filter(c => !predicate(c));
    const removed = before - this.data.stockCounts.length;
    if (removed > 0) {
      this.persist();
    }
    return removed;
  }

  deleteStockCountEntries(predicate: (entry: StockCountEntry) => boolean): number {
    const before = this.data.stockCountEntries.length;
    this.data.stockCountEntries = this.data.stockCountEntries.filter(e => !predicate(e));
    const removed = before - this.data.stockCountEntries.length;
    if (removed > 0) {
      this.persist();
    }
    return removed;
  }

  // Orders
  createOrder(
    order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>,
    items: Array<Omit<OrderItem, 'id' | 'orderId'> & { orderId?: string }>
  ): { order: Order; items: OrderItem[] } {
    const orderRecord: Order = {
      ...order,
      id: randomUUID(),
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    const itemRecords = items.map(item => ({ ...item, id: randomUUID(), orderId: item.orderId ?? orderRecord.id }));
    this.data.orders.push(orderRecord);
    this.data.orderItems.push(...itemRecords);
    this.persist();
    return { order: orderRecord, items: itemRecords };
  }

  listOrderItems(orderId: string): OrderItem[] {
    return this.data.orderItems.filter(item => item.orderId === orderId);
  }

  listOrders(restaurantId: string): Order[] {
    return this.data.orders.filter(order => order.restaurantId === restaurantId);
  }

  listAllOrders(): Order[] {
    return [...this.data.orders];
  }

  updateOrder(id: string, update: Partial<Order>): Order | undefined {
    const order = this.data.orders.find(o => o.id === id);
    if (!order) return undefined;
    Object.assign(order, update, { updatedAt: nowIso() });
    this.persist();
    return order;
  }

  deleteOrders(predicate: (order: Order) => boolean): number {
    const before = this.data.orders.length;
    const toDelete = new Set(this.data.orders.filter(predicate).map(o => o.id));
    if (!toDelete.size) return 0;
    this.data.orders = this.data.orders.filter(o => !toDelete.has(o.id));
    this.data.orderItems = this.data.orderItems.filter(item => !toDelete.has(item.orderId));
    this.persist();
    return toDelete.size;
  }

  countOrders(restaurantId: string, filter: (order: Order) => boolean): number {
    return this.data.orders.filter(order => order.restaurantId === restaurantId && filter(order)).length;
  }

  deleteOrderItems(predicate: (item: OrderItem) => boolean): number {
    const before = this.data.orderItems.length;
    this.data.orderItems = this.data.orderItems.filter(item => !predicate(item));
    const removed = before - this.data.orderItems.length;
    if (removed > 0) {
      this.persist();
    }
    return removed;
  }

  getMenuItemById(id: string): MenuItem | undefined {
    return this.data.menuItems.find(item => item.id === id);
  }

  // Payments
  listPayments(restaurantId: string): Payment[] {
    return this.data.payments.filter(payment => payment.restaurantId === restaurantId);
  }

  // Devices
  listDevices(restaurantId: string): Device[] {
    return this.data.devices
      .filter(device => device.restaurantId === restaurantId)
      .map(device => ({ ...device, createdAt: device.createdAt ?? '1970-01-01T00:00:00.000Z' }));
  }

  createDevice(device: Omit<Device, 'id' | 'lastSeenAt'>): Device {
    const record: Device = { ...device, id: randomUUID(), createdAt: nowIso(), lastSeenAt: null };
    this.data.devices.push(record);
    this.persist();
    return record;
  }

  // Idempotency
  getIdempotencyRecord(restaurantId: string, clientUuid: string, idempotencyKey: string, path: string, method: string): IdempotencyRecord | undefined {
    return this.data.idempotencyRecords.find(
      record =>
        record.restaurantId === restaurantId &&
        record.clientUuid === clientUuid &&
        record.idempotencyKey === idempotencyKey &&
        record.path === path &&
        record.method === method
    );
  }

  createIdempotencyRecord(record: Omit<IdempotencyRecord, 'id' | 'createdAt'>): IdempotencyRecord {
    const entry: IdempotencyRecord = { ...record, id: randomUUID(), createdAt: nowIso() };
    this.data.idempotencyRecords.push(entry);
    this.persist();
    return entry;
  }
}

export const dataStore = new DataStore();
