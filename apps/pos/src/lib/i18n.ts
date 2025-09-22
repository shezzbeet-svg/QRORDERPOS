export type Locale = 'en' | 'ur';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    menu: 'Menu',
    order: 'Order',
    logout: 'Logout'
  },
  ur: {
    menu: '\u0645\u06cc\u0646\u0648',
    order: '\u0622\u0631\u0688\u0631',
    logout: '\u0644\u0627\u06af \u0622\u0648\u0679'
  }
};

export function t(locale: Locale, key: string) {
  return translations[locale][key] || key;
}
