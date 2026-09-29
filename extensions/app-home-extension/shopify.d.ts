import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/AppHome.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/pages/HomePage.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/pages/FAQPage.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/pages/SettingsPage.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/pages/NotFoundPage.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/components/AboutTemplate.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/models/faqs.js' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/settings/ApiKeysSettings.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/settings/SystemMessageSettings.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/settings/PowerMerchantSettings.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/api/settingsApi.js' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}
