// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { dataStore } from '../src/data/store.js';
import { prisma } from '../src/prisma.js';

const MERCHANT = 'demo-bistro';

function createClient() {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const requestJson = async (method, path, payload, headers = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : undefined;
    return { res, json };
  };

  return { server, requestJson, baseUrl };
}

test('POS API flows', async t => {
  const { server, requestJson, baseUrl } = createClient();
  t.after(() => server.close());
  t.after(() => prisma.$disconnect?.());

  await t.test('authenticates staff and returns merchant metadata', async () => {
    dataStore.reset();
    const { res, json } = await requestJson('POST', '/api/auth/login', {
      merchantSlug: MERCHANT,
      code: 'WAIT001',
      pin: '0000'
    });
    assert.equal(res.status, 200);
    assert.equal(json.merchant.slug, MERCHANT);
    assert.equal(json.user.role, 'waiter');
    assert.ok(json.tokens.accessToken);
    assert.ok(json.tokens.refreshToken);
  });

  await t.test('returns menu items for the merchant', async () => {
    dataStore.reset();
    const res = await fetch(`${baseUrl}/api/merchants/${MERCHANT}/menu`);
    const items = await res.json();
    assert.ok(Array.isArray(items));
    assert.ok(items.length > 0);
    const first = items[0];
    assert.ok(first.id);
    assert.ok(first.name);
  });

  await t.test('creates waiter order with idempotency and updates inventory', async () => {
    dataStore.reset();
    const login = await requestJson('POST', '/api/auth/login', {
      merchantSlug: MERCHANT,
      code: 'WAIT001',
      pin: '0000'
    });
    assert.equal(login.res.status, 200);
    const token = login.json.tokens.accessToken;
    const clientUuid = 'test-client-123';
    const idempotencyKey = 'order-key-1';
    const payload = {
      items: [
        { menuItemId: 'item-burger', qty: 2 },
        { menuItemId: 'item-cola', qty: 1 }
      ]
    };

    const first = await requestJson('POST', `/api/merchants/${MERCHANT}/orders`, payload, {
      Authorization: `Bearer ${token}`,
      'X-Client-UUID': clientUuid,
      'Idempotency-Key': idempotencyKey
    });
    assert.equal(first.res.status, 200);
    assert.equal(first.json.items.length, 2);

    const duplicate = await requestJson('POST', `/api/merchants/${MERCHANT}/orders`, payload, {
      Authorization: `Bearer ${token}`,
      'X-Client-UUID': clientUuid,
      'Idempotency-Key': idempotencyKey
    });
    assert.equal(duplicate.res.status, 200);
    assert.equal(duplicate.json.id, first.json.id);

    const inventory = await prisma.inventoryItem.findMany({ where: { restaurantId: login.json.merchant.id } });
    const burgerBun = inventory.find(item => item.id === 'inv-bun');
    assert.ok(burgerBun);
    assert.ok((burgerBun?.currentStock ?? 0) < 120);
  });

  await t.test('adjusts stock and surfaces low stock alerts', async () => {
    dataStore.reset();
    const login = await requestJson('POST', '/api/auth/login', {
      merchantSlug: MERCHANT,
      code: 'ADM001',
      pin: '1234'
    });
    assert.equal(login.res.status, 200);
    const token = login.json.tokens.accessToken;

    const adj = await requestJson(
      'POST',
      `/api/merchants/${MERCHANT}/inventory/stock-adjustments`,
      { itemId: 'inv-fries', delta: -190, reason: 'Daily usage' },
      {
        Authorization: `Bearer ${token}`,
        'X-Client-UUID': 'admin-client',
        'Idempotency-Key': 'stock-adj-1'
      }
    );
    assert.equal(adj.res.status, 200);

    const alertsRes = await fetch(`${baseUrl}/api/merchants/${MERCHANT}/inventory/alerts/low-stock`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(alertsRes.status, 200);
    const alerts = await alertsRes.json();
    const potatoes = alerts.find((item: any) => item.id === 'inv-fries');
    assert.ok(potatoes);
  });

  await t.test('records stock counts with variance adjustments', async () => {
    dataStore.reset();
    const login = await requestJson('POST', '/api/auth/login', {
      merchantSlug: MERCHANT,
      code: 'ADM001',
      pin: '1234'
    });
    assert.equal(login.res.status, 200);
    const token = login.json.tokens.accessToken;

    const count = await requestJson(
      'POST',
      `/api/merchants/${MERCHANT}/inventory/stock-counts`,
      {
        entries: [
          { itemId: 'inv-cola', counted: 40 },
          { itemId: 'inv-bun', counted: 100 }
        ]
      },
      {
        Authorization: `Bearer ${token}`,
        'X-Client-UUID': 'admin-client',
        'Idempotency-Key': 'stock-count-1'
      }
    );
    assert.equal(count.res.status, 200);
    assert.equal(count.json.entries.length, 2);
    assert.ok('variance' in count.json.entries[0]);
  });
});
