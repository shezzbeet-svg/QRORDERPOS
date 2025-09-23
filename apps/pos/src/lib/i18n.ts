export type Locale = 'en' | 'ur';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    menu: 'Menu',
    order: 'Order',
 codex/build-modular-frontend-for-restaurant-pos-yluvnu
    waiterConsole: 'Waiter Console',
    dashboard: 'Dashboard',
    inventory: 'Inventory',
    devices: 'Devices',
    logout: 'Logout',
    addToCart: 'Add to order',
    submitOrder: 'Send order',
    total: 'Total',
    items: 'Items',
    quantity: 'Quantity',
    stock: 'Stock',
    adjust: 'Adjust',
    reason: 'Reason',
    apply: 'Apply',
    cancel: 'Cancel',
    register: 'Register',
    testPrint: 'Test print',
    syncQueued: 'Queued offline',
    payments: 'Payments',
    lowStock: 'Low stock',
    serviceFee: 'Service fee',
    tip: 'Tip',
    totalsToday: 'Totals today',
    openOrders: 'Open tickets'

    logout: 'Logout'
 main
  },
  ur: {
    menu: '\u0645\u06cc\u0646\u0648',
    order: '\u0622\u0631\u0688\u0631',
 codex/build-modular-frontend-for-restaurant-pos-yluvnu
    waiterConsole: '\u0648\u06cc\u0679\u0631 \u06a9\u0648\u0646\u0633\u0648\u0644',
    dashboard: '\u0688\u06cc\u0634 \u0628\u0648\u0631\u0688',
    inventory: '\u0627\u0646\u0648\u06cc\u0646\u0679\u0631\u06cc',
    devices: '\u0688\u06cc\u0648\u0627\u0626\u0633',
    logout: '\u0644\u0627\u06af \u0622\u0648\u0679',
    addToCart: '\u0634\u0627\u0645\u0644 \u06a9\u0631\u06cc\u06ba',
    submitOrder: '\u0622\u0631\u0688\u0631 \u0628\u06be\u062c\u06cc\u06ba',
    total: '\u0645\u062c\u0645\u0648\u0639',
    items: '\u0627\u0634\u06cc\u0627\u0621',
    quantity: '\u0645\u0642\u062f\u0627\u0631',
    stock: '\u0627\u06cc\u0646\u0648\u0646\u0679\u0631\u06cc',
    adjust: '\u062a\u063a\u06cc\u0631\u06cc',
    reason: '\u0648\u062c\u06c1',
    apply: '\u0644\u0627\u06af\u0648 \u06a9\u0631\u06cc\u06ba',
    cancel: '\u0645\u0646\u0633\u0648\u062e',
    register: '\u0631\u062c\u0633\u0679\u0631',
    testPrint: '\u0679\u06cc\u0633\u0679 \u067e\u0631\u0646\u0679',
    syncQueued: '\u0622\u0641 \u0644\u0627\u0626\u0646 \u0645\u06cc\u06ba \u0645\u0648\u0645\u062a\u0644',
    payments: '\u0627\u062f\u0627\u0626\u06cc\u06af\u06cc\u0627\u06ba',
    lowStock: '\u06a9\u0645 \u0633\u0679\u0627\u06a9',
    serviceFee: '\u0633\u0631\u0648\u0633 \u0641\u06cc',
    tip: '\u0679\u067e',
    totalsToday: '\u0627\u062c \u06a9\u06d2 \u0627\u0639\u062f\u0627\u062f',
    openOrders: '\u0627\u0633\u0679\u06d2 \u0622\u0631\u0688\u0631\u0632'

    logout: '\u0644\u0627\u06af \u0622\u0648\u0679'
 main
  }
};

export function t(locale: Locale, key: string) {
  return translations[locale][key] || key;
}
