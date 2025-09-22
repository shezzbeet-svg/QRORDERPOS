// @ts-nocheck
import { dataStore } from './data/store.js';
import type {
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
  User,
  UserRole
} from './data/types.js';

function evaluateCondition(current: any, condition: any): boolean {
  if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
    if ('equals' in condition) {
      return evaluateCondition(current, condition.equals);
    }
    if ('in' in condition && Array.isArray(condition.in)) {
      return condition.in.includes(current);
    }
    if ('notIn' in condition && Array.isArray(condition.notIn)) {
      return !condition.notIn.includes(current);
    }
    if ('not' in condition) {
      return !evaluateCondition(current, condition.not);
    }
    if ('contains' in condition && typeof current === 'string') {
      return current.includes(condition.contains);
    }
    if ('gte' in condition || 'lte' in condition) {
      const currentTime = new Date(current ?? 0).getTime();
      if ('gte' in condition && currentTime < new Date(condition.gte).getTime()) return false;
      if ('lte' in condition && currentTime > new Date(condition.lte).getTime()) return false;
      return true;
    }
  }
  if (Array.isArray(condition)) {
    return condition.includes(current);
  }
  return current === condition;
}

function matches<T>(item: T, where?: Record<string, any>): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, value]) => evaluateCondition((item as any)[key], value));
}

function normalizeDate(input: string | Date | null | undefined): number {
  if (!input) return 0;
  const value = typeof input === 'string' ? new Date(input) : input;
  return value.getTime();
}

function clone<T>(value: T): T {
  return value === null || typeof value !== 'object' ? value : JSON.parse(JSON.stringify(value)) as T;
}

class RestaurantDelegate {
  findUnique(args: { where: { slug?: string; id?: string } }): Restaurant | null {
    const { slug, id } = args.where;
    if (slug) {
      return dataStore.getRestaurantBySlug(slug) ?? null;
    }
    if (id) {
      return dataStore.getRestaurantById(id) ?? null;
    }
    return null;
  }
}

class UserDelegate {
  findFirst(args: { where: { restaurantId?: string; code?: string } }): User | null {
    const { restaurantId, code } = args.where;
    if (restaurantId && code) {
      return dataStore.getUserByCode(restaurantId, code) ?? null;
    }
    return null;
  }

  findUnique(args: { where: { id: string } }): User | null {
    return dataStore.getUserById(args.where.id) ?? null;
  }
}

class RefreshTokenDelegate {
  create(args: { data: Omit<RefreshToken, 'id' | 'createdAt'> }): RefreshToken {
    const payload = {
      ...args.data,
      expiresAt: args.data.expiresAt instanceof Date ? args.data.expiresAt.toISOString() : args.data.expiresAt,
      revokedAt: args.data.revokedAt instanceof Date ? args.data.revokedAt.toISOString() : args.data.revokedAt
    };
    return dataStore.createRefreshToken(payload);
  }

  findUnique(args: { where: { token: string } }): RefreshToken | null {
    return dataStore.getRefreshTokenByToken(args.where.token) ?? null;
  }

  update(args: { where: { id: string }; data: Partial<RefreshToken> }): RefreshToken {
    const update: Partial<RefreshToken> = { ...args.data };
    if (update.expiresAt instanceof Date) {
      update.expiresAt = update.expiresAt.toISOString();
    }
    if (update.revokedAt instanceof Date) {
      update.revokedAt = update.revokedAt.toISOString();
    }
    const token = dataStore.updateRefreshToken(args.where.id, update);
    if (!token) throw new Error('Refresh token not found');
    return token;
  }

  updateMany(args: { where: { token: string }; data: Partial<RefreshToken> }) {
    const update: Partial<RefreshToken> = { ...args.data };
    if (update.expiresAt instanceof Date) {
      update.expiresAt = update.expiresAt.toISOString();
    }
    if (update.revokedAt instanceof Date) {
      update.revokedAt = update.revokedAt.toISOString();
    }
    const count = dataStore.updateRefreshTokensByToken(args.where.token, update);
    return { count };
  }
}

class MenuItemDelegate {
  findMany(args: {
    where?: Record<string, any>;
    include?: { category?: boolean; recipeComponents?: boolean };
    orderBy?: Array<Record<string, any>> | Record<string, any>;
  }): Array<MenuItem & { category?: MenuCategory | null; recipeComponents?: RecipeComponent[] }> {
    const where = args.where ?? {};
    const restaurantId = where.restaurantId as string | undefined;
    const baseItems = restaurantId ? dataStore.listMenuItems(restaurantId) : dataStore.listAllMenuItems();
    let items = baseItems.filter(item => matches(item, where));

    const categoryOrderCache = new Map<string, number>();
    const getCategorySortOrder = (item: MenuItem) => {
      if (!categoryOrderCache.has(item.categoryId)) {
        const cat = dataStore.getMenuCategoryById(item.categoryId);
        categoryOrderCache.set(item.categoryId, cat?.sortOrder ?? 0);
      }
      return categoryOrderCache.get(item.categoryId)!;
    };

    const comparators: Array<(a: MenuItem, b: MenuItem) => number> = [];
    const applyOrder = (entry: Record<string, any>) => {
      if ('category' in entry && entry.category?.sortOrder) {
        const direction = entry.category.sortOrder === 'desc' ? -1 : 1;
        comparators.push((a, b) => direction * (getCategorySortOrder(a) - getCategorySortOrder(b)));
      }
      if ('name' in entry) {
        const direction = entry.name === 'desc' ? -1 : 1;
        comparators.push((a, b) => direction * a.name.localeCompare(b.name));
      }
    };
    if (Array.isArray(args.orderBy)) {
      args.orderBy.forEach(applyOrder);
    } else if (args.orderBy) {
      applyOrder(args.orderBy);
    }
    if (comparators.length) {
      items = [...items].sort((a, b) => {
        for (const compare of comparators) {
          const result = compare(a, b);
          if (result !== 0) return result;
        }
        return 0;
      });
    }

    return items.map(item => {
      const result: any = { ...item };
      if (args.include?.category) {
        result.category = dataStore.getMenuCategoryById(item.categoryId) ?? null;
      }
      if (args.include?.recipeComponents) {
        result.recipeComponents = dataStore.listRecipeComponents(item.id).map(clone);
      }
      return result;
    });
  }
}

class MenuCategoryDelegate {
  findMany(args: {
    where?: Record<string, any>;
    include?: { items?: { where?: Record<string, any> } };
    orderBy?: { sortOrder?: 'asc' | 'desc' };
  }): Array<MenuCategory & { items?: MenuItem[] }> {
    const where = args.where ?? {};
    const restaurantId = where.restaurantId as string | undefined;
    let categories = (restaurantId ? dataStore.listMenuCategories(restaurantId) : dataStore.listAllMenuCategories()).filter(cat =>
      matches(cat, where)
    );
    if (args.orderBy?.sortOrder) {
      const direction = args.orderBy.sortOrder === 'desc' ? -1 : 1;
      categories = [...categories].sort((a, b) => direction * (a.sortOrder - b.sortOrder));
    }
    if (!args.include?.items) {
      return categories.map(clone);
    }
    const itemWhere = args.include.items.where ?? {};
    const items = restaurantId ? dataStore.listMenuItems(restaurantId) : dataStore.listAllMenuItems();
    return categories.map(category => ({
      ...category,
      items: items.filter(item => item.categoryId === category.id && matches(item, itemWhere)).map(clone)
    }));
  }
}

class InventoryItemDelegate {
  findMany(args: {
    where: Record<string, any>;
    orderBy?: { name?: 'asc' | 'desc' };
  }): InventoryItem[] {
    const where = args.where ?? {};
    const restaurantId = where.restaurantId as string | undefined;
    let items = (restaurantId ? dataStore.listInventoryItems(restaurantId) : dataStore.listAllInventoryItems()).filter(item =>
      matches(item, where)
    );
    if (args.orderBy?.name) {
      const direction = args.orderBy.name === 'desc' ? -1 : 1;
      items = [...items].sort((a, b) => direction * a.name.localeCompare(b.name));
    }
    return items.map(clone);
  }

  findFirst(args: { where: Record<string, any> }): InventoryItem | null {
    const items = this.findMany({ where: args.where });
    return items[0] ?? null;
  }

  findUnique(args: { where: { id: string } }): InventoryItem | null {
    return clone(dataStore.getInventoryItemById(args.where.id) ?? null);
  }

  update(args: { where: { id: string }; data: any }): InventoryItem {
    const update: any = { ...args.data };
    if (update.currentStock && typeof update.currentStock === 'object' && 'increment' in update.currentStock) {
      const increment = Number(update.currentStock.increment) || 0;
      delete update.currentStock;
      const adjusted = dataStore.adjustInventoryItemStock(args.where.id, increment);
      if (!adjusted) throw new Error('Inventory item not found');
      if (Object.keys(update).length) {
        const final = dataStore.updateInventoryItem(args.where.id, update);
        return clone(final ?? adjusted);
      }
      return clone(adjusted);
    }
    const item = dataStore.updateInventoryItem(args.where.id, update);
    if (!item) throw new Error('Inventory item not found');
    return clone(item);
  }
}

class StockAdjustmentDelegate {
  createMany(args: { data: Omit<StockAdjustment, 'id' | 'createdAt'>[] }) {
    dataStore.logStockAdjustments(args.data);
    return { count: args.data.length };
  }

  create(args: { data: Omit<StockAdjustment, 'id' | 'createdAt'> }): StockAdjustment {
    return dataStore.logStockAdjustment(args.data);
  }

  deleteMany(args: { where?: Record<string, any> | ((record: StockAdjustment) => boolean) }) {
    const predicate =
      typeof args.where === 'function' ? args.where : (record: StockAdjustment) => matches(record, args.where ?? {});
    const count = dataStore.deleteStockAdjustments(predicate);
    return { count };
  }
}

class StockCountDelegate {
  create(args: { data: Omit<StockCount, 'id' | 'startedAt' | 'completedAt'> & { status: StockCountStatus } }): StockCount {
    const { restaurantId, userId, status } = args.data;
    const timestamps = {
      startedAt: (args.data as any).startedAt,
      completedAt: (args.data as any).completedAt
    };
    return dataStore.createStockCount(restaurantId, userId, status, timestamps);
  }

  deleteMany(args: { where?: Record<string, any> | ((count: StockCount) => boolean) }) {
    const predicate =
      typeof args.where === 'function' ? args.where : (count: StockCount) => matches(count, args.where ?? {});
    const count = dataStore.deleteStockCounts(predicate);
    return { count };
  }
}

class StockCountEntryDelegate {
  create(args: { data: Omit<StockCountEntry, 'id' | 'createdAt'> }): StockCountEntry {
    return dataStore.createStockCountEntry(args.data);
  }

  findMany(args: {
    where: { stockCountId: string };
    include?: { inventoryItem?: boolean };
  }): Array<StockCountEntry & { inventoryItem?: InventoryItem | null }> {
    const entries = dataStore.listStockCountEntries(args.where.stockCountId);
    return entries.map(entry => ({
      ...entry,
      inventoryItem: args.include?.inventoryItem ? clone(dataStore.getInventoryItemById(entry.inventoryItemId) ?? null) : undefined
    }));
  }

  deleteMany(args: { where?: Record<string, any> | ((entry: StockCountEntry) => boolean) }) {
    const predicate =
      typeof args.where === 'function' ? args.where : (entry: StockCountEntry) => matches(entry, args.where ?? {});
    const count = dataStore.deleteStockCountEntries(predicate);
    return { count };
  }
}

class OrderDelegate {
  create(args: {
    data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> & { items: { createMany: { data: Array<Record<string, any>> } } };
    include?: { items?: boolean };
  }): Order & { items?: OrderItem[] } {
    const { items, ...orderData } = args.data;
    const result = dataStore.createOrder(orderData, items.createMany.data);
    if (args.include?.items) {
      return { ...result.order, items: result.items.map(clone) };
    }
    return result.order;
  }

  count(args: { where: { restaurantId: string; status?: { in?: OrderStatus[] } } }): number {
    const { restaurantId, status } = args.where;
    return dataStore.countOrders(restaurantId, order => {
      if (status?.in) {
        return status.in.includes(order.status);
      }
      return true;
    });
  }

  findMany(args: {
    where?: Record<string, any>;
    orderBy?: { createdAt?: 'asc' | 'desc' };
    take?: number;
    include?: { items?: { include?: { menuItem?: boolean } }; takenBy?: boolean };
  }): Array<Order & { items?: Array<OrderItem & { menuItem?: MenuItem | null }>; takenBy?: User | null }> {
    const where = args.where ?? {};
    const restaurantId = where.restaurantId as string | undefined;
    let orders = (restaurantId ? dataStore.listOrders(restaurantId) : dataStore.listAllOrders()).filter(order =>
      matches(order, where)
    );
    if (args.orderBy?.createdAt) {
      const direction = args.orderBy.createdAt === 'asc' ? 1 : -1;
      orders = [...orders].sort((a, b) => direction * (normalizeDate(a.createdAt) - normalizeDate(b.createdAt)));
    }
    if (args.take !== undefined) {
      orders = orders.slice(0, args.take);
    }

    return orders.map(order => {
      const result: any = { ...order };
      if (args.include?.items) {
        const orderItems = dataStore.listOrderItems(order.id).map(item => {
          const extended: any = { ...item };
          if (args.include?.items?.include?.menuItem) {
            extended.menuItem = clone(dataStore.getMenuItemById(item.menuItemId) ?? null);
          }
          return extended;
        });
        result.items = orderItems;
      }
      if (args.include?.takenBy) {
        result.takenBy = clone(order.takenByUserId ? dataStore.getUserById(order.takenByUserId) ?? null : null);
      }
      return result;
    });
  }

  deleteMany(args: { where?: Record<string, any> | ((order: Order) => boolean) }) {
    const predicate =
      typeof args.where === 'function' ? args.where : (order: Order) => matches(order, args.where ?? {});
    const count = dataStore.deleteOrders(predicate);
    return { count };
  }
}

class OrderItemDelegate {
  findMany(args: {
    where: { orderId: string };
    include?: { menuItem?: boolean };
  }): Array<OrderItem & { menuItem?: MenuItem | null }> {
    const items = dataStore.listOrderItems(args.where.orderId);
    return items.map(item => ({
      ...item,
      menuItem: args.include?.menuItem ? clone(dataStore.getMenuItemById(item.menuItemId) ?? null) : undefined
    }));
  }

  deleteMany(args: { where?: Record<string, any> | ((item: OrderItem) => boolean) }) {
    const predicate =
      typeof args.where === 'function' ? args.where : (item: OrderItem) => matches(item, args.where ?? {});
    const count = dataStore.deleteOrderItems(predicate);
    return { count };
  }
}

class PaymentDelegate {
  aggregate(args: {
    where: { restaurantId: string; status?: PaymentStatus; paidAt?: { gte?: Date; lte?: Date } };
    _sum: { amount: true; tipAmount: true };
    _count: true;
  }): { _sum: { amount: number; tipAmount: number }; _count: number } {
    const payments = dataStore.listPayments(args.where.restaurantId).filter(payment => {
      if (args.where.status && payment.status !== args.where.status) return false;
      if (args.where.paidAt?.gte && (!payment.paidAt || new Date(payment.paidAt) < args.where.paidAt.gte)) return false;
      if (args.where.paidAt?.lte && (!payment.paidAt || new Date(payment.paidAt) > args.where.paidAt.lte)) return false;
      return true;
    });
    return {
      _sum: {
        amount: payments.reduce((sum, payment) => sum + payment.amount, 0),
        tipAmount: payments.reduce((sum, payment) => sum + (payment.tipAmount ?? 0), 0)
      },
      _count: payments.length
    };
  }
}

class DeviceDelegate {
  findMany(args: { where: { restaurantId: string }; orderBy?: { createdAt?: 'asc' | 'desc' } }): Device[] {
    let devices = dataStore.listDevices(args.where.restaurantId);
    if (args.orderBy?.createdAt) {
      const direction = args.orderBy.createdAt === 'asc' ? 1 : -1;
      devices = [...devices].sort((a, b) => direction * (normalizeDate(a.createdAt ?? null) - normalizeDate(b.createdAt ?? null)));
    }
    return devices.map(clone);
  }

  create(args: { data: Omit<Device, 'id' | 'lastSeenAt'> }): Device {
    return dataStore.createDevice(args.data);
  }
}

class IdempotencyDelegate {
  findUnique(args: {
    where: {
      restaurantId_clientUuid_idempotencyKey_path_method: {
        restaurantId: string;
        clientUuid: string;
        idempotencyKey: string;
        path: string;
        method: string;
      };
    };
  }): IdempotencyRecord | null {
    const { restaurantId, clientUuid, idempotencyKey, path, method } =
      args.where.restaurantId_clientUuid_idempotencyKey_path_method;
    return dataStore.getIdempotencyRecord(restaurantId, clientUuid, idempotencyKey, path, method) ?? null;
  }

  create(args: { data: Omit<IdempotencyRecord, 'id' | 'createdAt'> }): IdempotencyRecord {
    return dataStore.createIdempotencyRecord(args.data);
  }
}

class MockPrismaClient {
  restaurant = new RestaurantDelegate();
  user = new UserDelegate();
  refreshToken = new RefreshTokenDelegate();
  menuItem = new MenuItemDelegate();
  menuCategory = new MenuCategoryDelegate();
  inventoryItem = new InventoryItemDelegate();
  stockAdjustment = new StockAdjustmentDelegate();
  stockCount = new StockCountDelegate();
  stockCountEntry = new StockCountEntryDelegate();
  order = new OrderDelegate();
  orderItem = new OrderItemDelegate();
  payment = new PaymentDelegate();
  device = new DeviceDelegate();
  idempotencyRecord = new IdempotencyDelegate();

  async $transaction<T>(cb: (client: MockPrismaClient) => Promise<T> | T): Promise<T> {
    return await cb(this);
  }

  async $disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

export const prisma = new MockPrismaClient();
export type {
  UserRole,
  OrderSource,
  OrderStatus,
  DeviceType,
  PaymentStatus,
  PaymentMethod,
  StockAdjustmentSource,
  StockCountStatus
};
