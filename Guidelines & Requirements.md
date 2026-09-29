App Store requirements

Install AI Toolkit

Ask about this page

Copy MD
To qualify for the Shopify App Store, your app must meet the requirements listed below. Each requirement in this list helps your app meet our app quality standards. Some requirements are general and apply to all apps, and others apply to specific categories of apps.

These requirements are subject to change, as we're continuously making improvements to the Shopify App Store and developer platform. The App Excellence Team conducts quality checks regularly. Your app is expected to meet any new requirements that are added here. The Shopify App Review team can reject an app at their discretion if it doesn't meet the set standards.

1. Policy
All Shopify App Store apps must comply with the Partner Program 
Agreement
. Partners should act in good faith and in the best interests of merchants and buyers. Partners should not intentionally circumvent critical platform functionality.

1.1 Build and operate within Shopify's platform
Shopify requires apps to be secure, truthful, and privacy-safe, operating within—not around—Shopify’s core systems. Apps that circumvent core workflows or provide unapproved services (such as unauthorized payments, marketplaces, agency brokering, content copying, refunds, or lending) aren’t allowed.

1.1.1Use session tokens for authentication. Your embedded app must function properly without relying on third-party cookies or local storage, including when accessed in incognito mode on Chrome.
1.1.2Use Shopify checkout. Shopify can't guarantee the safety or security of an order that's been placed through an offsite or third party checkout. Apps that bypass checkout or payment processing, or register any transactions through the Shopify API in connection with such activity, are prohibited.
1.1.3Direct merchants to the Shopify Theme Store. Your app must not allow merchants to download themes. Themes can only be installed via the Shopify Theme Store.
1.1.4Use only factual information. Your app and app listing should only include factual information. Apps that falsify data to deceive merchants or buyers, such as fake reviews or false purchase notifications, violate our Partner Program 
Agreement
 and our Acceptable Use 
Policy
.
1.1.5Create unique apps. App must not be identical to other apps you've published to the Shopify App Store. Learn more about duplicate apps in our Partner Program 
Agreement
.
1.1.6Build single-merchant storefronts. Marketplaces should be sales channels. Apps that allow merchants to turn their stores into classifieds-style marketplaces cannot be distributed through the Shopify App Store. If you are a marketplace platform aiming to connect to Shopify in order to list products on your marketplace, consider submitting as a sales channel.
1.1.7Always build Payment Gateway apps using the Payments API and after obtaining authorization. Payment Gateway apps must be authorized through an application process. They must be built using the Payments API.
1.1.8Build apps for Shopify POS only, not third-party systems. Shopify is not currently accepting apps that connect to a POS system outside of Shopify. This applies to all apps that connect to a POS system outside of Shopify.
1.1.9Obtain explicit buyer consent before adding charges. Apps can't automatically add or pre-select optional charges to a buyer's cart that increase the total checkout price. Apps can only add optional charges to carts or at checkout after displaying the additional cost in a manner that is clear to the buyer, and upon obtaining explicit buyer consent.
1.1.10Maintain the cheapest shipping option as default. Apps can’t alter or re-order shipping options in a manner that increases the default shipping price. The cheapest shipping option must always be selected by default. This restriction doesn’t apply to non-shipping delivery methods, such as in-store pickup, local delivery, and pickup points.
1.1.11Offer browser extensions as optional features only. Browser extensions are only permitted as an optional feature.
1.1.12Build web-based apps. Your app must not require a desktop app to function.
1.1.13Duplicate only authorized product information. Your app should only duplicate product information that the merchant has the proper permission to use: their own products, officially licensed or dropshipped products. Marketing claims like "import from any store in the world" or "copy the product information from any website", whether using your app or a Chrome extension, are not acceptable.
1.1.14Don't connect merchants to external agencies and developers. Apps that connect merchants to agencies and freelancers cannot be distributed through the Shopify App Store.
1.1.15Process refunds only through the original payment processor. Your app must not offer methods for processing refunds outside of the original payment processor. If your app issues store credits during a refund, it must use either refundCreate or returnProcess to do so.
1.1.16Don't provide capital lending. Apps that provide capital funding (including but not limited to loans, cash advances, and purchase of receivables) cannot be distributed through the Shopify App Store. These types of services are difficult to monitor on an ongoing basis, and in a manner that makes sure merchants are protected from unsound lending practices.
1.2 Bill through the Shopify Billing API or Shopify App Pricing
Apps that use off-platform billing cannot be distributed through the Shopify App store, unless you've been notified otherwise by Shopify. Your app must use Shopify App Pricing or the Shopify Billing API for all app charges and be free of billing related errors.

1.2.1Use Shopify App Pricing or the Shopify Billing API. Apps that use off-platform billing cannot be distributed through the Shopify App store. Your app must use Shopify App Pricing or the Shopify Billing API for any app charges.
1.2.2Implement Shopify App Pricing or the Shopify Billing API correctly. If your app has any charges, it must correctly implement Shopify App Pricing or the Shopify Billing API to ensure that it can accept, decline and request approval for charges again on reinstall.
1.2.3Allow pricing plan changes. Your app must allow merchants to upgrade and downgrade their pricing plan without having to contact your support team or having to reinstall the app. This includes ensuring that the charges are successfully processed in the application charge history page in the merchant admin.
1.3 Always use honest and transparent review practices
Developers are expected to maintain honesty and integrity in their interactions with merchants, buyers, and the Shopify ecosystem. Reviews that are fake and/or incentivized are strictly prohibited. Developers violating these policies may face consequences such as the removal of reviews, demotion or delisting of your app, or termination of your Partner account.

1.3.1Do not offer incentives for reviews. Asking for reviews must be done so in neutral language. It is forbidden to offer incentives or withhold features in exchange for reviews, regardless of whether this occurs through the app or external channels.
2. Functionality
Apps must deliver on the features described in their app store listing. The core functionality must work properly and comply with the Shopify Partner Program 
Agreement
 and Acceptable Use 
Policy
.

2.1 Create reliable and user-friendly apps
Merchants should have a positive experience when using your app. Your app should be easy to use and free from errors that prevent your core functionality from working.

2.1.1Build apps without critical errors to ensure review completion. Your app must be free from user interface bugs, display issues, or error pages that fully prevent completion of the review. Web errors such as 404's, 500's, 300's, and etc are not acceptable.
2.1.2Build apps without even minor errors to ensure review completion. Your app must be free from user interface bugs, display issues, or error pages that partially prevent completion of the review.
2.1.3Have a user interface (UI) that merchants can interact with. All apps in the Shopify App Store must be operational through a UI regardless of how the app is launched. Operational errors (errors within an apps' functionality) are acceptable, web errors (404's, 500's, 300's) are not acceptable.
2.1.4Synchronize data accurately. If your app synchronizes data with Shopify, then it must ensure accurate and correct transfer of data between both platforms. This means ensuring that all synchronized data is consistent across the Shopify admin, your app, and any additional platforms your app depends on.
2.2 Use Shopify's APIs and platform tools
Your app must use Shopify's APIs and integrate with platform tools like Shopify App Bridge to provide an embedded admin experience. Admin extensions must provide novel, feature-complete functionality without promotions or inappropriate modal launches.

2.2.1Use Shopify APIs. Your app must be configured to use Shopify's API to ensure it best serves merchants. Apps that don't use or need any Shopify APIs are not permitted.
2.2.2Provide a consistent embedded experience. Your app must provide a consistent embedded experience by ensuring that any off-platform features are integrated directly within the Shopify Admin.
2.2.3Use the latest version of Shopify App Bridge. As of March 13th, 2024, all apps must use the latest Shopify App Bridge by adding the app-bridge.js script tag before any other script tags. We recommend adding it to the of each document of your app or as the first script element.
2.2.4Use the GraphQL Admin API. As of April 1, 2025 all new public apps must be built exclusively with the GraphQL Admin API. As of October 1, 2024 the REST Admin API is considered a legacy API and should no longer be used. For details and migration steps, visit the migration guide.
2.2.5Admin extensions must be feature-complete. Admin UI blocks, admin actions, and admin links must be feature-complete, and provide novel functionality or content.
2.2.6Don't display promotions or advertisements in admin extensions. Don't use admin UI blocks, admin actions, or admin links to promote your app, promote related apps, or request reviews.
2.2.7Only launch Max modal with merchant interaction. Max modal (formerly known as full screen mode) must not launch without a merchant interaction. Max modal can't be launched from the app navigation menu.
2.2.8Sidekick app extensions must align with stated app functionality. Sidekick app extensions must operate within the scope of your app’s core functionality. To ensure platform integrity and merchant transparency, your extension configuration, public App Store listing, and actual runtime execution must be materially consistent. Tools, intents, and actions exposed to Sidekick must be a logical representation of what your app does for the merchant on its own surface.
2.2.9Don't display promotions, advertisements, or cross-sell other services in Sidekick app extensions. Don't use Sidekick app extensions to promote your app, promote related apps, or request reviews.
2.3 Provide seamless and secure installation
Apps can only be installed and initiated on Shopify services. Merchants expect a seamless experience when installing and uninstalling your application.

2.3.1Initiate installation from a Shopify-owned surface. Apps must be installed and initiated only on Shopify services. Your app must not request the manual entry of a myshopify.com URL or a shop's domain during the installation or configuration flow.
2.3.2Authenticate immediately after install. Your app must immediately authenticate using OAuth before any other steps occur. Merchants should not be able to interact with the user interface (UI) before OAuth.
2.3.3Redirect to the app UI after installation. Your app must redirect merchants to the user interface (UI) after they accept permissions access on the OAuth handshake page.
2.3.4Require OAuth authentication immediately after reinstall. Help merchants easily return to workflows in your app if they choose to reinstall it. Your app must immediately authenticate using OAuth before any other steps occur, even if the merchant has previously installed and then uninstalled your app.
3. Security
App security is critical for protecting merchants' businesses and their data. Before submitting your app, ensure it's secure and follows best practices to minimize risk.

3.1 Secure data with valid TLS/SSL certificates
Information must be exchanged securely to ensure merchant and/or buyer data is protected when in transit.

3.1.1Use a valid TLS/SSL certificate. All data exchanged between a client (such as a merchant's web browser) and your app server should be encrypted using Transport Layer Security (TLS) to ensure that any data transmitted can only be read by your application server. Websites secured by a TLS certificate will display HTTPS and the small padlock icon in the browser address bar. Your app must have a valid TLS/SSL certificate without any errors.
3.2 Request only necessary access scopes
Your app must request only the access scopes that are necessary for your app to function properly. You may be requested to provide proof that the access scopes you've requested are required for your app to function properly. For scopes that are not required for all merchants, we strongly recommend using optional scopes.

3.2.1Request read_all_orders access scope only if it provides necessary app functionality. If your app is accessing the read_all_orders scope, it must demonstrate the need for this scope.
3.2.2Request write_payment_mandate scope only if it provides necessary app functionality. If your app is accessing the write_payment_mandate scope, it must demonstrate the need for this scope.
3.2.3Request write_checkout_extensions_apis scope only if it provides necessary app functionality. If your app is accessing the write_checkout_extensions_apis scope, it must demonstrate the need for this scope.
3.2.4Request read_advanced_dom_pixel_events scope only if it provides necessary app functionality. If your app is accessing the read_advanced_dom_pixel_events scope, it must demonstrate the need for this scope. You must use this scope to either implement a heatmap or session recording functionality on checkout pages.
3.2.5Request read_checkout_extensions_chat scope only when required. If your app is accessing the read_checkout_extensions_chat scope, it must demonstrate the need for this scope.
4. App Store Listing
Your app store listing is a merchant's first impression of your app. Create clear, accurate listings that help merchants understand your app's features, pricing, and value.

4.1 Brand your app name uniquely and consistently
Your app must have a unique name that distinguishes it from other apps and is used consistently across all Shopify and developer-controlled surfaces.

4.1.1App name fields must be similar. Your app name needs to match, or be similar, between your Developer Dashboard (edited through TOML file or when releasing a new version) and your App Submission form (which controls the App Store listing). "Similar" means that any variations of the name contain common words.
4.1.2Use a unique name for your app. Every app must have its own unique, recognizable name that leads with your distinctive brand identifier. Your app's name must not be identical or confusingly similar to another app, developer, brand, or Shopify product.
4.2 Keep pricing accurate and in designated areas
Merchants scan specific places in app listings to quickly understand costs and value. Do not include pricing information in undesignated areas like your app logo, to prevent merchant confusion. Keep this information in Pricing details.

4.2.1Provide accurate and complete pricing information. Ensure your pricing information includes all pricing options such as, free trial time and charge details.
4.2.2Don't include pricing information in images. Do not include pricing information in the images of your app listing (including within your app icon). Pricing information should only appear in the Pricing details section of your app listing.
4.2.3Don't include pricing information elsewhere in the listing. Merchants scan specific places in app listings to quickly understand costs and value. Do not include pricing information in undesignated areas like your app logo, to prevent merchant confusion. Keep this information in Pricing details.
4.3 Provide accurate and truthful listing information
Your app store listing should be truthful and accurate. Merchants should know based on your listing if your app will work for them.

4.3.1Indicate if the Online Store sales channel is required. Help merchants understand if they need to be using the Online Store channel (rather than a custom storefront) to get the most value from your app. If your app embeds features in a merchant's Online Store, then select "Merchant must have online store" under the Sales channel requirements section of your app listing form.
4.3.2Only claim to be published in languages that you fully supported. The Languages section of your app listing must only list languages in which merchants can use your app's UI. If your app offers multiple languages for customer-facing features, you may describe these in the App Details or media gallery sections of your app listing (optional).
4.3.3Don't use stats, data, or unsubstantiated claims such as guarantees in the listing. Do not use any statistics or data in your app's listing content, overview of the app, and/or app introduction. This includes verifiable and unverifiable information. Focus on your app's benefits when rewriting your listing and avoid using terms like "the first", "the best", or "the only".
4.3.4Don't use stats, data, or unsubstantiated claims such as guarantees in images. Do not use any statistics or data in your app's listing content, overview of the app, and/or app introduction. This includes verifiable and unverifiable information. Focus on your app's benefits when rewriting your listing and avoid using terms like "the first", "the best", or "the only".
4.3.5Use accurate tags. Your tags should accurately reflect the primary function(s) of your app. Make sure to review the definitions of our categories and tags to help merchants find your app.
4.3.6Don't include reviews or testimonials in images. Do not use reviews and testimonials in your app's listing and other undesignated app listing areas. Reviews will be added to your listing page based on merchant feedback.
4.3.7Don't include reviews or testimonials in the listing. Do not use reviews and testimonials in your app's listing and other undesignated app listing areas. Reviews will be added to your listing page based on merchant feedback.
4.3.8Indicate geographic requirements. Specify geographic requirements or specific API permissions in your app's listing if they are needed for your app to function. Only merchants in the correct geographic location or on a plan with the required API permissions will then be able to install your app.
4.4 Provide clear assets and descriptions
Your app store listing content should describe your app's features at a high level. When creating your app store listing content, don't reference your other apps and services in your app store listing content.

4.4.1Write effective app card subtitles. The app card subtitle helps merchants to quickly understand what your app does, and what sets it apart from others. Summarize your app in a concise phrase, and explain the value of your app. Don't add keywords to your subtitle with the intent of improving search performance. Don't use personal merchant information without consent from the merchant. Don't include any data or statistics. Share this information on your website and landing pages instead.
4.4.2Follow the guidelines for app details. Your app details must include a clear explanation of your app's functionality with enough information about features for merchants to confidently install. Avoid excessive use of marketing keywords or only having a structured feature list.
4.4.3Don't misuse Shopify brand in graphics. Do not use our trademarks in your app icon, banner, or screenshots. Our trademarks can only be used to communicate your app's compatibility with Shopify in accordance with our brand 
guidelines
.
4.4.4Provide clear, focused images. Images should primarily show your app's actual user interface and features. Screenshots should not include desktop backgrounds or browser windows. Feature images and screenshots that solely contain your app logo are not permitted.
4.4.5Provide unique images. Each image in your app listing must be unique. Screenshots should showcase different features, views, or states of your app. Don't submit duplicate or near-identical images.
4.5 Ensure your submission is complete and accurate
Ensure your app is properly classified and submit with complete, up-to-date documentation and credentials for review.

4.5.1Submit Sales Channels apps in their respective category. If your app meets Shopify's definition of a Sales Channel, turn your app into a Sales Channel and comply with all requirements before submitting your app for review.
4.5.2Submit as a regular app if not a Sales Channel. If your app doesn't meet Shopify's definition of a Sales Channel, remove the Sales Channel configuration and then deploy the change to configure your app into a regular app.
4.5.3Include a demo screencast. Include a screencast to demonstrate your app’s onboarding and features as described in its listing. We require more information in your demo screencast to be able to set up and test the app successfully. Ensure the video offers clear step-by-step instructions showing how to set up your apps core features. The screencast should be in English or have English subtitles.
4.5.4Include test credentials. Include account credentials in your testing 
instructions
 so we can review your app. Make sure to keep these account credentials up to date.
4.5.5Include functional test credentials. If your app requires login credentials, then the credentials you provide for review must be valid, and grant full access to the app's complete feature set. Double-check all credentials before submission to avoid issues during review.
4.5.6Provide an emergency developer contact. Add an emergency developer contact to your Partner Dashboard. This contact will receive critical technical information for maintaining your Shopify app. Add an emergency developer contact on the Partner account settings page, or learn about setting up developer contacts.
5. Category-specific
Certain app types have unique impacts on merchant operations and require different APIs, extensions, and implementations.

These category-specific requirements ensure these apps properly serve their use cases. Note that some apps may fall into multiple categories.

5.1 Online store
Extend themes properly with app extensions. Modify themes only through theme app extensions, not through direct code changes.

5.1.1Use theme app extensions. If your app modifies the merchant's theme, you need to use theme app extensions. You or merchants should not make any code changes to the theme.
5.1.2Properly show theme app extension in the storefront. Your app widget must be displayed properly and without any errors in the Theme Editor and Online Store.
5.1.3Include detailed onboarding instructions for theme app extensions. Your app must have detailed setup instructions on how to install your app embeds and app blocks. We strongly recommend providing a deep link to help merchants install and preview your app in their theme.
5.1.4Follow the criteria for App Name Branding. App Name Branding in storefront visual components is only permitted when customers directly interact with branded elements as a key aspect of their buying experience or removal would cause confusion or harm to customers. All other cases must use the standard attribution pattern only.
5.1.5Send collected data back to the merchant. Return customer data collected through a Shopify hosted service to the merchant's Shopify admin. Specifically, this applies to data collected through the Online Store and Point of Sale sales channels. All data collected must be accessible to merchants and comply with the Shopify API License and Terms of 
Use
 under section 2.3.17.
5.2 Payment
A payments app integrates with the Shopify admin to provide payment processing services.

Build compliant integrations. Payment apps require strict API usage, comprehensive testing documentation, functional payment flows, and checkout compliance. Revenue share agreement required.

5.2.1Include detailed testing instructions for Payment apps. Prevent additional delays in your app store review by providing detailed testing instructions for your payment app. These include (1) a test store with the payments app installed; (2) the required credentials to enable installing the payments app for testing (for example, activation codes and login credentials); (3) Instructions on how to process a test payment and refund; and, if applicable, (4) a description of specific testing scenarios including installments/deferred payments and 3D Secure authentication.
5.2.2Submit screencasts of the app's payment flow for all supported browsers. All Partners must submit screencasts of the app's payment flow for all supported 
browsers
.
5.2.3Provide a functional buyer flow on desktop and mobile devices. Your app’s buyer flow on desktop and mobile devices must redirect from Shopify’s checkout to your app’s payment flow, then back to Shopify’s order confirmation page. Refer to our help document for more details.
5.2.4Use correct payment API scopes. Payments apps aren't permitted to use any Shopify APIs other than the Payments Apps API and mandatory webhooks.
5.2.5Build payment apps as standalone, not embedded. Payment apps are not allowed to be embedded into the Shopify Admin. Manage your embedded app configuration via TOML files. Once this is done, please ensure that it is possible to still setup the payments app and be redirected to the correct section in the Shopify Admin after the setup has been completed.
5.2.6Allow buyers to cancel/abandon payment with the payment gateway. Modify your app to allow buyers to cancel or abandon the payment and be redirected back to Shopify’s checkout.
5.2.7Redirect merchants back to the Shopify admin using the proper URL. Payment gateways must redirect merchants after they have completed all onboarding actions back to the Shopify admin using the following URL: 
https://{shop}.myshopify.com/services/payments_partners/gateways/${api_key}/settings
5.2.8Sign a revenue share agreement. Your app must obtain prior written consent from Shopify.
5.2.9Match offsite payment information to checkout information. Your app’s offsite payment must present identical payment information to what was shown to the buyer on the checkout, particularly the currency and amount and buyer name.
5.2.10Display only Shopify-approved payment methods. Update your app to display only Shopify approved payment methods to the buyer. Your payment app must not process payment methods that include, but aren't limited to, Apple Pay, Google Pay, Shop Pay, PayPal, and Alipay. Shopify has a direct connection with providers that improves performance and checkout conversion for merchants.
5.2.11Offer a test mode. Your payment app must have a test mode available so that merchants can charge, refund, and process test transactions.
5.2.12Don't upsell any product or features in the payment flow. Do not include any product or feature upsells in your payment flow. All redirects must be limited to content intended for payment processing only.
5.2.13Appropriately name payment apps. Ensure your app name reflects your payment gateway’s legal business name. Exclude marketing text or special characters and spacing. These distractions do not give your app any advantages. If a name appears to have been created with the purpose of gaining a higher listing on an alphabetized list, your app will be rejected.
5.2.14Use a single Checkout UI extension with permitted targets. Your checkout UI extension can only use these targets: Purchase.checkout.payment-option-item.hosted-fields.render-after, Checkout::PaymentMethod::Render, Purchase.checkout.payment-option-item.details.render.
5.2.15Don't use banners, logos, or graphics in the checkout interface. Any checkout interface customization needs to support payment completion. Banners, logos, or graphics can’t be used for error states or as decorative elements.
5.3 Payment facilitator
A payment facilitator app works in tandem with a payment app. They enable merchants to display the related payment branding throughout their storefront.

Offer free integrations. These apps must be gateway-owned, non-transactional, and free for merchants.

5.3.1Must be submitted by the partner who owns the payment gateway. Update your app to ensure that it doesn't modify an existing gateway. You must own the payment gateway that your app is seeking to integrate with.
5.3.2Must be separate from any financial transactions. Apps that process financial transactions for payment gateways are prohibited from the Shopify App Store. Your app must add value to a merchant store, and not be used for the sole purpose of collecting data.
5.3.3Must be free for merchants. Apps that integrate with an existing payment gateway must be provided to merchants at no extra cost.
5.4 Purchase option
A purchase option app offers subscription-based products and services to merchants' customers.

Build compliant purchase option integrations. These apps require strict API compliance, comprehensive testing across browsers, functional customer portals with full subscription management, and clear pricing transparency.

5.4.1Submit screencasts of purchase option app functionality for all supported browsers. Include a screencast of your app functioning from a Merchant's customers point of view on the following listed browser and 
device
 types, in your testing instructions. We recommend using 
browserstack
 to address this.
5.4.2Use correct subscription API scopes. Only API scopes that are required for your app to function are permitted. If your app requests the write_customer_payment_methods or the write_own_subscription_contracts scopes you may need to provide evidence that they're truly necessary for your app to function.
5.4.3Don't use incorrect API scopes for purchase option apps. Ensure that your app is using the correct API scopes to reflect functionality. Apps that do not use the Selling Plan and subscription contract APIs properly, are not permitted on the App Store. For additional context, refer to Purchase option access scopes.
5.4.4Support all browser versions on desktop and mobile. Include a screencast of your app functioning from a Merchant's customers point of view on the following listed browser and 
device
 types, in your testing instructions. We recommend using 
browserstack
 to address this.
5.4.5Allow buyers to modify subscription payment methods. You must provide buyers with the option to modify their payment method associated with their subscription(s).
5.4.6Enable merchants to create and manage selling plans from the product page and choose products for subscriptions. Implement the product extension to allow merchants to create and manage selling plans from the Shopify's admin product page. Merchants need to be able to choose which products they want as subscriptions.
5.4.7Include access to your subscription portal through Shopify's customer portal. Include access to your app's subscription portal through the Shopify Customer portal. A single login must be used by buyers to access subscriptions and their order history.
5.4.8Enable buyers to cancel their purchase option, or clearly communicate cancellation conditions. The purchase option app must include an in-product mechanism to allow a buyer to cancel or discontinue their purchase option, for example, a pre-order management portal or a cancel link in an email.
5.4.9Navigate buyers to the customer portal. Apps that offer subscriptions must include navigation to a customer portal, both on the order status 
page
 and through a post-purchase email to a merchant's customers so that they're able to manage their subscription.
5.4.10Display purchase options and charge timing clearly. Purchase option apps must clearly show buyers the price of the purchase option and when they will be charged. We recommend that this is done through a standalone app extension, as described in the subscription UX guidelines and deferred purchase option UX guidelines.
5.4.11Don't use selling plan and subscription contract APIs for prohibited actions. Ensure that your app abides by our selling plan and subscription contract API terms. Actions like overbilling, and misuse of vaulting are prohibited. Any failure to avoid these prohibited actions constitutes a breach of the Shopify API License and Terms of 
Use
.
5.4.12Link subscriptions directly to the linked Customers in Shopify Admin. Apps that offer subscriptions must include a direct link to orders and customers in the Shopify admin from the purchase option.
5.4.13Show buyers all of their purchased subscriptions in the Customer portal clearly. Display all of the buyers' purchased subscriptions through the customer portal. Details must include the associated products, delivery frequency, price, and order schedule. See this document for additional details.
5.4.14Update multi-currency pricing and discount codes correctly on the product page. Update your app to support multi-currency functionality properly, so that pricing and discounts correctly show on the product page. Product pricing shouldn't be hard-coded as part of plan names or descriptions.
5.4.15Link subscriptions directly to the linked Orders in Shopify Admin. Apps that offer subscriptions must include a direct link to orders and customers in the Shopify admin from the purchase option.
5.4.16Display selling plan name in the Cart page. Update your app to display the selling plan name in the cart page. This name is used to identify the product's purchase option and its details.
5.4.17Communicate pre-order delays with pre-stated shipment times to buyers. Ensure your app emails a merchant's customers when the merchant updates the shipment date to a later date.
5.4.18Clearly indicate details for prepaid items, including unit price, length of subscription, and price per delivery. Correct your app's widget feature to clearly show the unit cost for prepaid items and allow merchants to indicate additional shipping costs.
5.4.19Enable variant-level product selection for buyers. Your app must have the ability to select products at the variant level within the Shopify Admin product section.
5.5 Product sourcing
A product sourcing app allows merchants to source products from external suppliers and fulfill orders through their own fulfillment process.

Build compliant product sourcing integrations. These apps require compliant fulfillment workflows, secure payment processing, product restrictions adherence, and proper order payment verification.

5.5.1Enable merchants to request fulfillment. Use the fulfillmentOrderSubmitFulfillmentRequest mutation to allow merchants to request fulfillment from the dropshipping app when an order is created. Refer to this document for additional details.
5.5.2Include details of cost of goods sold. Add the cost of products to the Cost field of the merchant's product page to comply with our product sourcing requirements.
5.5.3Use a PCI compliant payment gateway. When charging merchants the cost of goods sold, you must use a PCI compliant payment gateway. All other charges associated with your app must go through Shopify's Billing API.
5.5.4Don't sell high risk products. Products that violate Shopify's Acceptable Use 
Policy
 and the Terms of Service for Payment Providers are prohibited. Products like cannabis, alcohol, pharmaceutical drugs, weapons and items listed as prohibited 
businesses
 are included in this restriction.
5.5.5Verify payment before marking orders as fulfilled. Stop your app from automatically marking orders in a pending payment state as fulfilled to comply with our product sourcing requirements. This protects you from financial risk in case you receive a sudden influx of fraudulent orders.
5.6 Checkout customization
A checkout customization app allows merchants to customize the checkout process to add custom UI or content.

Extend checkout compliantly and transparently. Checkout extensions require strict compliance including proper display, merchant-controlled content, customer consent for charges, accurate product data, and prohibited element restrictions.

5.6.1Display checkout extensions properly in the storefront. Checkout extensions must be feature-complete, and provide novel functionality or content.
5.6.2Give merchants full control over promotional content. Don't use checkout extensions to promote your app, promote related apps, or request reviews.
5.6.3Don't display self-promotion or advertisements in checkout extensions. Don't use checkout extensions to promote your app, promote related apps, or request reviews.
5.6.4Display the same product name, image, and cost as the product in the merchant’s store. Checkout UI extensions must display the same product name, image, and cost as the product in the merchant’s store.
5.6.5Get explicit customer consent prior to making any changes that affect the order total in any way. Apps can’t automatically add or pre-select optional charges to a buyer’s cart that increase the total checkout price. Apps can only add optional charges to carts or at checkout after displaying the additional cost in a manner that is clear to the buyer, and upon obtaining explicit buyer consent.
5.6.6Don't add countdown timers to the checkout. Checkout UI Extension apps must not add countdown timers to the checkout.
5.6.7Use Chat UI components for customer service. Apps that implement Chat UI components on checkout pages must use them to provide customer service via real-time chat as their core feature.
5.6.8Don't collect information that is already captured by the standard checkout form field. Extensions must not collect information, including personally identifiable information, that's already captured by a standard Shopify checkout form field.
5.6.9Don't request payment information in checkout UI extension. The extension must not request that customers input payment information using a checkout UI extension
5.7 Sales channel
A sales channel app lets merchants publish their products from their Shopify admin to your platform, whether they're selling online, on mobile apps, or through social media.

Build compliant sales channel integrations. Sales channel apps require strict UI and API compliance, proper account management workflows, Shopify checkout integration, and transparent merchant communication.

5.7.1Add the `read_only_own_orders` scope. You need the read_only_own_orders scope to comply with our requirements. This scope ensures the sales channel can only read orders that it created and is added to the sales channel during review. Let us know if you're ready to have this flag added to your sales channel.
5.7.2Build with Polaris components and style guide. Use the required Polaris 
components
 and style guide to build your sales channel. Review how to build a sales channel.
5.7.3Use the ResourceFeedback API to communicate issues. Communicate product issues using feedback messages and the ResourceFeedback API.
5.7.4Provide details in the publishing section. Show the current number of published products in the publishing section, and provide links to the Shopify bulk editor to view and manage those products.
5.7.5Provide the marketplace link in the channel interface. Once products are uploaded to the marketplace, make sure merchants know how to navigate to the marketplace where their products are hosted. This can be in the form of a button or information in the instructions.
5.7.6Communicate commission. Accurately communicate commissions to merchants to comply with our requirements.
5.7.7Open terms and conditions in a new window. Include a terms and conditions section with links that open to a new window in your sales channel to comply with our requirements.
5.7.8Use banners for approval or rejection of products. Communicate approval or rejection for use of your sales channel to merchants using the banner 
component
.
5.7.9Use Polaris cards in the publishing section. Create a publishing section using a card and the annotated layout shown.
5.7.10Redirect to the account section after install. After install, redirect merchants to the account section using the account connection component.
5.7.11Provide error feedback in the publishing section. Report publishing errors for products in the publishing section to comply with our requirements.
5.7.12Must allow merchants to disconnect their account. Allow merchants to disconnect your sales 
channel
 from their store without contacting support to comply with our sales channel configuration requirements.
5.7.13Display account information properly. Ensure that an account section, using the account connection 
component
, is always visible and labelled with your channel name to comply with our sales channel configuration requirements.
5.7.14Take customers to Shopify's Checkout. Must take customers from your Sales Channel to the Shopify checkout with items pre-loaded in the cart.
5.7.15Must communicate account approval process. The approval process for your sales channel must be communicated to merchants using the banner 
component
. Clearly communicate the account status the merchant is in. While merchants are awaiting approval, your sales channel must remain in a pending state.
5.7.16Use Sales Attribution. You must use a storefront access token to attribute an order to your sales channel. Merchants rely on Shopify to attribute sales accurately.
5.7.17Communicate eligibility issues. If the Sales Channel has any qualifying steps, including eligibility requirements or onboarding processes, this must be communicated in the account connection form.
5.7.18Include a Navigation Icon. The Sales Channel must include a 16px by 16px navigation icon in SVG format, uploaded through the Partner 
Dashboard
.
5.8 Post purchase
A post purchase app allows merchants to upsell products to their customers after they've made a purchase.

Create compliant upsell experiences. Post-purchase apps require transparent and accurate upsells, limited consecutive requests, proper UI components, and restrictions on third-party content.

5.8.1Add the `write_checkout_extensions_apis` scope. The write_checkout_extensions_apis scope has been granted for your app. Familiarize yourself with the Shopify API License and Terms of 
Use
 to ensure your app remains compliant.
5.8.2Ensure the upsell is transparent to the buyer and include accept and decline buttons. To comply with our guidelines, update your upsell app to be transparent about all costs associated in a buyer's purchase. The buyer must be provided preset accept and decline options on the upsell. You may have set examples to choose from (ie. "Take the deal" / "No thanks", "Buy" / "Decline offer", etc.), however these cannot be modified by a merchant.
5.8.3Show the same product information on post purchase upsell. Ensure your app displays the same product title, product price, and product image in your upsell as the merchant’s store.
5.8.4Limit consecutive requests displayed to customers. Limit consecutive post purchase requests to a maximum of 2 that appear to buyers.
5.8.5Correctly assign the purchase option category for each selling plan created. App must correctly assign the purchase option category in the API for subscriptions, pre-orders, and try before you buy.
5.8.6Redirect to the order confirmation page when done. Post purchase apps must redirect buyers back to the order confirmation page upon completion.
5.8.7Use the calloutbanner component to display callout banners. Use the checkout CalloutBanner to display one upsell Callout Banner at the top of the page. Include introductory text, the product name, and discount.
5.8.8Update price breakdown to reflect price changes. Display the correct total cost of the upsell offer to the buyer. Your app must dynamically update and reflect price changes if the buyer adjusts the product's quantity or variants.
5.8.9Don't display third party ads or promotions. Your post purchase application must not include ads or promotions to other services outside of the merchant’s shop.
5.8.10Exclude order tracking/status from your post purchase page. Post purchase apps must not have any order tracking or status functionality in their post-purchase page.
5.9 Mobile app builders
A mobile app builder lets merchants create a mobile app based on their online store.

Configure mobile apps as sales channels. These apps must operate as sales channels for checkout functionality and inform merchants about app store submission processes and requirements.

5.9.1Convert mobile app builders into sales channel. Convert your mobile app builder into a sales channel to allow checkout creation by the apps it builds. Make this change to comply with our mobile app builder requirements.
5.9.2Include submission info for the Apple App Store and Google Play. Include information about either the Apple App Store or the Google Play store app submission process. Inform the merchant about their wait times and app requirements to comply with our mobile app builder requirements.
5.9.3Provide app theme customization or presets. Include either a customizable theme builder or preset theme options in your app to comply with our mobile app builder requirements.
5.10 Donation
A donation app allows merchants to collect donations from their customers.

Build compliant integrations and be charity-verified. Donation apps require charity verification, compliant payment processing through Shopify Checkout, transparent cost and proof documentation, and proper donation widget setup.

5.10.1Give instruction on how to hide add-to-cart on donation products. App must include instructions on how to hide the add-to-cart 
button
 for any donation product that is created.
5.10.2Provide merchants with proof of donation. Donation distribution apps must provide merchants with verifiable proof of donations made within the app interface. This cannot be a tax receipt.
5.10.3Indicate operating cost in UI and listing. If a portion of the donations are being used to offset the cost of the app, provide a percentage value indicating how much in the user interface as well as the pricing section of the listing.
5.10.4Verify charitable status or partnership. You must provide proof of your charitable status in your app.
5.10.5Use a theme app block to add donation products. Add a widget to buy the donation product to the product page, cart page or checkout page. This can be implemented using Theme App Extensions or Checkout UI Extensions.
5.10.6Collect donation funds using PCI-compliant third party gateways or the Billing API. Ensure your app collects funds using the Billing API or with a 
PCI-compliant
 third party gateway.
5.10.7Process customer’s donations through Shopify Checkout. All customer donations must be routed through Shopify Checkout. Apps that redirect buyers to an external checkout are prohibited.
5.11 Blockchain
A blockchain app allows merchants to sell, transfer, or modify non-fungible tokens (NFTs).

Build compliant integrations and get payment partner approval. Blockchain apps require payment partner approval, primary sales support only, comprehensive fulfillment tracking, data privacy protections, and strict compliance with securities regulations.

5.11.1Don't sell, transfer, or modify fungible tokens unless they are a payment partner. You must not sell, transfer, or modify fungible tokens unless you are a payment partner that has been approved by the Shopify Payments Team. For more information on becoming a payment partner, read the Extensions for payments documentation.
5.11.2Provide an interface to review the state of each NFT order. A user interface is required to provide the merchant with the status of each NFT fulfillment status and subsequent fulfillment interactions with a customer.
5.11.3Write blockchain transaction ID by order fulfillment tracking_numbers. For each fulfilled NFT, blockchain apps must write the blockchain transaction ID to the order's Fulfillment tracking_number field, and a valid block scanner URL for the NFT fulfillment transaction to the order's Fulfillment tracking_url field. If needed, the name of the blockchain, fork, or network can also be written to the order's Fulfillment tracking_company field.
5.11.4Prevent merchants from listing NFTs until they are approved. The app must block merchants from listing NFTs as products while Shopify Payments is active in the shop, until the merchant is approved to sell NFTs.
5.11.5Provide an NFT claim message. With respect to the minting method configured for a given NFT, a merchant’s NFT fulfillment actions in the Shopify admin must result in a timely NFT claim message being sent to the customer.
5.11.6Allow creating and reviewing requests from embedded app. A merchant needs to be able to maintain the context (requests and creations) of all of the NFTs they offer from a single interface, the embedded app home.
5.11.7Include only creator royalties, not secondary royalties. Do not write any secondary royalties (for example, non-creator royalties) into your NFTs.
5.11.8NFTs must not qualify as a security or regulated financial instrument. Apps should in no event facilitate the sale or marketing of NFTs that represent or qualify as securities or other regulated financial instruments, or activities related to securities or other regulated financial instruments.
5.11.9Support primary sales only. Apps are presently only able to support the primary sales of NFTs on Shopify. A gallery display of NFTs on a Shopify store that are not represented by products or hosted in the admin is not supported.
5.11.10Allow buyers to create a wallet after buying NFT. The Buyer must be provided with the facility to onboard onto the blockchain ecosystem, by providing a wallet creation mechanism.
5.11.11Ensure no personal data is written or stored on-chain. You must make sure that no personal data is written or stored on-chain.
5.11.12Don't allow parties to edit destination email. Ensure that the destination contact information for the NFT claim entered at checkout cannot be redirected to a new recipient without the express review and confirmation of the customer, merchant, NFT application developer, and the Shopify Blockchain team.
5.11.13Enable Shopify to complete end-to-end test upon submission. The App Review Team must be able to perform end-to-end testing of an NFT distribution application, including the creation, minting, and delivery of NFTs where necessary, in order to validate all app functionality. Include all relevant testing instructions (for example, test store, wallet, and screencasts) in Part G of the app submission form.

---
title: Best practices for apps in the Shopify App Store
description: >-
  Follow these best practices to make sure your app provides a high-quality
  experience to merchants.
source_url:
  html: 'https://shopify.dev/docs/apps/launch/shopify-app-store/best-practices'
  md: 'https://shopify.dev/docs/apps/launch/shopify-app-store/best-practices.md'
---

# Best practices for apps in the Shopify App Store

These best practices are intended to provide the best experience across the entire app lifecycle, from branding, to installation, to onboarding, functionality, and quality. For a list of all the requirements that need to be met to be eligible for the Shopify App Store, refer to the [App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements).

***

## General best practices for all apps

The best practices in this section apply to [all apps distributed through the Shopify App Store](https://shopify.dev/docs/apps/launch/distribution). Additional [category-specific best practices](#category-specific-best-practices) are presented in the section below.

***

## 1.​Prohibited and restricted app configurations

Some types of apps aren't permitted on the Shopify App Store and others must have their visibility set to limited visibility. See [App Store requirement 1.1](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#build-and-operate-within-shopifys-platform) for more information.

***

## 2.​Installation and setup

Merchants should be able to quickly set up and start using your app. This section describes the correct flows for authentication, app install charges, and any sign-up steps (if required). These best practices make sure that you provide merchants with the guidance they need when they start learning to use your app.

### A.​Authentication

Your app should immediately authorize using [OAuth](https://shopify.dev/docs/apps/build/authentication-authorization) before any other steps occur, even if the merchant has previously installed and then uninstalled your app. See [App Store requirement 2.3](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#provide-seamless-and-secure-installation) for more information.

### B.​Permissions

[Permissions](https://shopify.dev/docs/api/usage/access-scopes) are the levels of access that your app has to a merchant's store through the API. The permissions that you request are shown to the merchant on the OAuth grant page, where the merchant can either grant or decline them. See [App Store requirement 3.2](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#request-only-necessary-access-scopes) for more information.

### C.​Setup and merchant workflows

For merchant security, your app shouldn't use pop-up windows for essential app functionality, like running OAuth or approving app charges. Avoiding the use of pop-up windows also protects your app from being compromised by pop-up blockers.

If your app adds secondary payments to orders because of post-purchase upsells or other order edits, then you consider telling merchants that orders might have multiple payments associated with them. We recommend including a note in your Shopify App Store listing and the app setup instructions to tell merchants that if they're capturing payments manually, then they might need to capture more than one payment for a single order.

See [App Store requirement 2.3](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#provide-seamless-and-secure-installation) for more information.

***

## 3.​Functionality and quality

For your app to be successful, it should offer a consistent and positive experience for the merchants who use it. The following functionality and quality best practices apply to the core features of your app, such as its user interface, performance, and billing.

### A.​User interface

By offering a great user interface, you can make it easier for merchants to use your app to grow their businesses. See the [App Design Guidelines](https://shopify.dev/docs/apps/design) to learn more about how to design and build your app's user interface. Additionally, see the [Functionality](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#functionality) section of the App Store requirements to understand what specific conditions must be met for your app to be eligible for the Shopify App Store.

### B.​Billing

Use [Shopify App Pricing](https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing) to charge for your app. It bills merchants through the same system that's used for their Shopify subscription, and makes it easier for them to keep track of their payments.

Your app should allow merchants to upgrade and downgrade their pricing plan without having to contact your support team or having to reinstall the app. This includes ensuring that the charges are successfully processed in the application charge history page in the merchant admin.

Enterprise-level pricing plans should be referenced in the **Description of additional charges** section of the pricing section of the app's listing.

See [App Store requirement 1.2](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#bill-through-the-shopify-billing-api-or-managed-pricing) for more information.

### C.​State of the app

**Caution:**

Make sure your app is compliant with the latest [Google Chrome cookie behavior](https://www.chromium.org/updates/same-site) and [compatible with the SameSite cookie attribute](https://shopify.dev/docs/apps/build/authentication-authorization/id-tokens).

Merchants are busy, and every minute matters when running their businesses. By making sure that your app performs well, you can help merchants achieve their goals faster and spend more time on the problems that need their attention the most.

Apps that no longer reflect the original core functionality submitted to the App Store will be re-evaluated and will need to be resubmitted for a full App review.

See [App Store requirement 2.1](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#create-reliable-and-user-friendly-apps) for more information.

***

## 4.​App performance

For merchants to be successful, their online stores should have best-in-class speed and user experience. Apps can easily slow down performance, and we require apps to keep performance top-of-mind while helping merchants, to follow our performance requirements and best practices, and to test that their products continue to meet our minimum requirements for speed.

**Tip:**

For best practices and recommendations on app performance, refer to our [app performance recommendations](https://shopify.dev/docs/apps/build/performance).

### A.​Performance score

Your app shouldn't reduce Lighthouse performance scores by more than 10 points. Test your app's impact on Lighthouse performance scores using the steps outlined in [Testing storefront performance](https://shopify.dev/docs/apps/best-practices/performance/storefront#testing-storefront-performance).

### B.​Testing methodology

For apps that affect storefronts directly, Shopify tests the app's effect on store performance by measuring the Lighthouse score before and after the app is installed. We calculate a weighted average of score from the following pages:

| Page | Weight |
| - | - |
| Home | 17% |
| Product details | 40% |
| Collection | 43% |

The difference in the score before and after the app is installed and configured on the above pages indicates whether the app improves or worsens store performance. Your app should consistently demonstrate low or no negative impact on the performance of real merchant stores over time.

**Note:**

Note: Lighthouse scores can vary between runs. Consider running these tests frequently during your development, and averaging your scores across a few consecutive Lighthouse tests before submission.

***

## 5.​App listing

Your app listing is often your biggest marketing tool—an effective listing helps merchants understand how it can help them run their business. Make sure your listing is clear, includes pricing, and showcases your app's benefits.

To create a listing, select [Shopify App Store as the distribution method](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method). All approved public apps have a listing on the Shopify App Store, regardless of whether you choose to make it [full or limited visibility](https://shopify.dev/docs/apps/launch/distribution/visibility)

See [App Store requirements section 4](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#app-store-listing) for more information.

### Example app listing

The following image shows an example app listing, and shows where some of the fields in the app submission form are used in the app listing.

![An example app store listing.](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/example-app-store-listing-Bc1MkRXj.png)

| 1. | [Feature media](#1-feature-media) |
| - | - |
| 2. | [Demo store URL](#2-demo-store-url) |
| 3. | [Screenshots](#3-screenshots) |
| 4. | [App introduction](#4-app-introduction) |
| 5. | [App details](#5-app-details) |
| 6. | [Feature list](#6-feature-list) |
| 7. | [Integrations](#7-integrations) |

### A.​Branding your app

#### 1.​App name

Choose a name that clearly identifies your brand and helps merchants distinguish your app from others on the Shopify App Store.

* Lead with your brand: Start with a distinctive name that belongs to you. Don't lead with a generic descriptor, or with the name of a platform or business that you integrate with.

  * Do: `QTeck Announcement Bar`
  * Don't: `Announcement Bar QTeck`

* Make it distinctive: Your app name must not be identical to another app's name, or similar enough that merchants could mistake it for another app. Add a distinctive term to set your app apart.

* Keep it short: Use 30 characters or fewer, which is the maximum length that an app name can be.

* Keep it recognizable: Use the same distinctive name in your TOML configuration and your Shopify App Store listing so that merchants can recognize your app wherever it appears.

  * Do: `QTeck Announcement Bar` in the Shopify App Store listing, and `QTeck Bar` in the TOML configuration
  * Don't: `QTeck Announcement Bar` in the Shopify App Store listing, and `Easy Announcements` in the TOML configuration

* Show compatibility without implying affiliation: You can reference a platform or business that your app integrates with, but your brand name must come first.

  * Do: `{your brand} Integration with {platform}`
  * Don't: Start your app name with the name of the platform or business that it integrates with

URL slugs for your Shopify App Store listing are set automatically through your app name and follow the same rules.

Before you submit, make sure that your name is unique, brand-led, and clearly communicates compatibility without implying affiliation.

##### Resolving naming issues

If you're unable to submit your app name in the listing form, then [contact Shopify Support](https://shopify.dev/support) to have the issue reviewed.

If you believe an app in Shopify's App Store infringes on your trademark, then review Shopify's [trademark and trade dress policy](https://help.shopify.com/en/manual/compliance/intellectual-property/trademark-trade-dress-policy).

#### 2.​App icon

Your app icon should be simple, recognizable, and easy to distinguish.

Use the following app icon guidelines:

* Bold colors and simple patterns
* A square image with padding—corners are rounded automatically
* JPEG or PNG format
* Dimensions of 1200px by 1200px

Avoid the following elements in your app icon:

* Text
* Screenshots
* Shopify trademarks
* Copying or impersonating other brands or logos

[Download image templates](https://shopify.dev/zip/SubmissionTemplates.zip)

See [App Store requirement 4.1](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#brand-your-app-uniquely-and-present-it-consistently) for more information.

### B.​App store listing content

#### 1.​Feature media

A short video (2-3 minutes) is the best way to showcase your app's impact. Keep it promotional rather than instructional and limit screencasts to 25% of the video. If you don't have a video, use a static image that conveys your app's benefit or unique value.

When creating feature images (1600px by 900px, 16:9), keep them simple with one focal point, use solid backgrounds with good contrast (4.5:1 ratio recommended), and always include alt text. Don't use Shopify logos or repeat your app card subtitle in the image.

[Download image templates](https://shopify.dev/zip/SubmissionTemplates.zip)

Here are some examples of feature images:

#### Shopify Email

![The feature image for Shopify Email.](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/shopify-email-feature-image-FuuYDvWl.png)

#### Shopify Inbox

![The feature image for Shopify Inbox.](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/shopify-inbox-feature-image-8_JuypZk.png)

#### Shopify Local Delivery

![The feature image for Shopify Local Delivery.](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/local-delivery-feature-image-CNZWbTaz.png)

#### 2.​Demo store URL

Provide a link to a [development store](https://shopify.dev/docs/apps/build/stores/development-stores) that showcases your app. Link directly to the page that best demonstrates your app's functionality and add contextual instructions to guide merchants through the experience. A thoughtfully designed demo helps merchants visualize your app's value.

#### 3.​Screenshots

Screenshots should be 1600px by 900px (16:9). Include 3-6 desktop screenshots, including at least one of your app's UI. Ensure images are clear and focused on your app's functionality. Crop out browser chrome and sensitive information. Provide alt text, avoid PII, and don't include pricing, reviews, or outcome guarantees. If your app is mobile-responsive or works with POS, include screenshots showing those experiences.

#### 4.​App introduction

Your app introduction (100 characters) should clearly highlight the benefits merchants can expect. Tie your unique offering to measurable business outcomes. Avoid keyword stuffing, data claims, and incomplete sentences.

| Examples | Reason |
| - | - |
| * **Do**: We package and ship your orders. Fast, simple fulfillment can boost sales and delight customers.
* **Don't**: Get your products shipped fast. We'll take care of all the busy work for you. | Show specific benefits that drive value for merchants. Avoid generic marketing language. |
| - **Do**: Create print-on-demand custom puzzles. More customization options can help increase product sales.
- **Don't**: Custom puzzles. A creative solution to your print-on-demand needs. | Tie your unique app offering to a measurable business outcome. |
| * **Do**: Easily create personalized email campaigns. Buyer targeting can increase customer lifetime value.
* **Don't**: App Name is a best in class customer platform. Email marketing, text automation, Facebook custom audiences. | Show a clear merchant benefit and value proposition. Avoid unsubstantiated claims, keyword stuffing, and incomplete sentences. |

#### 5.​App details

In your app details (500 characters), describe functional elements and what makes your app unique. Avoid excessive marketing language, keyword stuffing, and outcome guarantees. Keep support info, links, and testimonials in their designated fields.

#### 6.​Feature list

Describe the functionality, not the technical mechanics. Keep features short and scannable (up to 80 characters per feature)—focus on what merchants care about, not how it's built.

| Examples | Reason |
| - | - |
| * **Do**: Reports that show you sales data in real time.
* **Don't**: Reports that use the latest push technology to offer you sales data with only 250ms of latency. | Describe functionality that is meaningful to merchants. Avoid focusing on the technical aspects of a feature. |
| - **Do**: Drag and drop page builder.
- **Don't**: Page builder built on the latest React Native technology to ensure the most efficient page building experience. | Be concise and informative. Avoid including feature mechanics that aren't relevant to merchants. |
| * **Do**: Customize details like shape and difficulty level in a full-screen experience.
* **Don't**: Print-on-demand, product customization, sales analytics, puzzles. | Describe a specific, unique feature. Avoid keyword stuffing and incomplete sentences. |

#### 7.​Integrations

List up to six integrations that merchants will be most interested in. Don't include Shopify itself, other shopping carts (unless you provide synchronization), or other Shopify apps (unless you directly integrate with them).

### C.​Pricing

Choose your primary billing method (Free to install, Recurring charge, or One-time payment) and provide clear pricing information in the designated section only. If you have paid plans, consider offering a free trial (we recommend 14 days). Plans display from lowest to highest price automatically.

For apps with free and paid plans, select **Recurring charge** and mark one plan as **Free**—this shows "Free plan available" in search results.

See [App Store requirement 4.2](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#keep-pricing-accurate-and-in-designated-areas) for more information.

Here's an example of how pricing details appear in your app listing:

#### Desktop view

![A desktop view of pricing details in an app listing](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/desktop-pricing-view-RhEBVlYC.png)

#### Mobile view

![A mobile view of pricing details in an app listing](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/mobile-pricing-view-ToVKZWNU.png)

| 1. | A link to a page that describes any charges that are billed outside of Shopify's app billing system. |
| - | - |
| 2. | The name of each pricing plan. |
| 3. | A free monthly plan. |
| 4. | The paid monthly plan price. |
| 5. | The discounted yearly price for a monthly plan. |
| 6. | A description of any additional charges for this plan. |
| 7. | A list of features for this plan. |
| 8. | A link to a page that describes the app's pricing in detail. |

### D.​Translate your app listing

Translated listings help your app reach a wider audience—they convert up to 4x better in non-English markets. List all languages your app's UI supports in your app store listing. To learn more about app translation, refer to [Internationalization](https://shopify.dev/docs/apps/build/localize-your-app).

English listings set as primary are automatically translated to:

* Brazilian Portuguese
* Danish
* Dutch
* French
* German
* Simplified Chinese
* Spanish
* Swedish

You can also add your own custom translations in the [Partner Dashboard](https://partners.shopify.com/organizations).

**Note:**

Automated translation covers: App card subtitle, App introduction, App details, Features, Pricing details, Search terms, and image alt text. Adding a custom translation overwrites the automated one for that language.

Adding your own translated listing for an automatically translated language overwrites and disables automatic translation for that language. Deleting your translated listing resumes automated translation for that language.

To add a translated listing, go to **Apps** > your app > **Distribution** > **Manage listing** > **Add translated listing**. To delete a custom translation (which re-enables automation), use **More actions** > **Delete listing**.

### E.​App discovery

Choose accurate [categories and tags](https://shopify.dev/docs/apps/launch/app-store-review/app-listing-categories) that reflect your app's core functionality—this impacts discoverability. You can select up to 25 structured features per category to help merchants compare relevant app features.

If your app capabilities change and you want to change how your app is categorized, then you can submit an appeal to change the app categorization by using the link in the app submission form. After the Shopify app review team completes their review, they'll send a response, whether it's approved or rejected.

Include a privacy policy (required) and consider adding other helpful links to your developer website such as FAQ page, changelog, support portal, tutorial, and additional documentation. These resources help merchants understand and get the most value from your app. Link to dedicated pages rather than promotional landing pages or cloud documents.

Your app card subtitle should highlight benefits to merchants rather than just describing functions. For search terms, enter up to five relevant terms using complete words (not partial) and limit to one idea per term—for example, "email marketing" works, but "email marketing for leads" doesn't.

| Examples | Reason |
| - | - |
| * **Do**: Avoid lost sales by making pages load faster and improving SEO
* **Don't**: Boost Pagespeed in 1 click. Increase conversions, SEO & Sales. | Highlight the benefit to merchants instead of the function. Avoid incomplete sentences. |
| - **Do**: Pick products to sell from vetted manufacturers and suppliers
- **Don't**: Dropship via Wholesale Distributors, Manufacturers & Suppliers | Highlight the benefit to merchants instead of the function. |
| * **Do**: Control which customers access different parts of your store
* **Don't**: Access control, for anything in your online store :) | Highlight the benefit to merchants instead of the name of the feature. |

Optimize your title tag and meta description for search engines. Follow [Google's title tag best practices](https://developers.google.com/search/docs/advanced/appearance/title-link) and [write effective meta descriptions](https://www.shopify.com/blog/how-to-write-meta-descriptions) to improve click-through rates from search results.

![A screen capture of Google search results, showing the title tag with the meta description below it.](https://shopify.dev/assets/assets/images/api/listing-in-the-app-store/search-engine-example-Cl8IC9BU.png)

### F.​Merchant install eligibility

Set install eligibility criteria in the app submission form to reduce uninstalls and negative reviews from ineligible merchants. Specify which sales channels your app needs (Online Store or POS) and geography criteria (country, shipping, currency) to target the right merchants. If a merchant changes their store settings after installation, use endpoints and webhooks to detect changes and notify them.

See [App Store requirement 4.3](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#provide-accurate-and-truthful-listing-information) for more information.

### G.​App review preparation

Provide clear instructions and a complete screencast showing your app's setup process and functionality. If your app integrates with third-party platforms, include valid test credentials that grant full access. Make screencasts in English or with English subtitles, and demonstrate the expected outcome for each test case.

See [App Store requirement 4.5](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#ensure-your-submission-is-complete-and-accurate) for more information.

***

## 6.​Security and merchant risk

Before you submit your app, make sure it's secure so the merchants who use it won't be at risk. See [App Store requirements section 3](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#security) for more information.

***

## 7.​Data and user privacy

Merchants trust you with their customers' sensitive data. Proper data handling protects merchants from privacy violations, legal liability, and loss of customer trust. Include a privacy policy in your listing to build transparency and confidence with merchants.

See [App Store requirements section 3](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#security) for more information.

**Tip:**

Your app should use supported APIs only—apps using APIs that will be deprecated within 90 days can't be submitted. Review [API versioning policies](https://shopify.dev/docs/api/usage/versioning) for details.

***

## 8.​Support

Strong support helps merchants succeed with your app and reduces negative reviews from frustrated users. Provide clear, Shopify-specific instructions in your help documentation and in-app context so merchants can quickly resolve issues themselves. Refer to Polaris [Help documentation](https://polaris.shopify.com/content/help-documentation) guidelines for writing effective support content. Keep your [emergency developer contact information](https://shopify.dev/docs/apps/build/dev-dashboard/technical-updates#update-your-developer-contact-details) up to date in your Partner Dashboard.

See [App Store requirement 4.5](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#ensure-your-submission-is-complete-and-accurate) for more information.

***

## Category-specific best practices

Certain app types have unique impacts on merchant operations and require different APIs, extensions, and implementations. These category-specific best practices ensure these apps properly serve their use cases. Note that some apps may fall into multiple categories. For example, an app could be both a product sourcing and online store app.

***

## 9.​Online store

Online store apps help merchants customize their storefront experience. Proper implementation ensures your app integrates seamlessly without breaking themes or requiring manual code changes.

Use [theme app extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions) to modify merchant themes, and avoid requiring manual code changes. Use [app proxies](https://shopify.dev/docs/apps/build/online-store/display-dynamic-data) to forward requests and display data.

Ensure your app works properly in both the Theme Editor and [theme editor environment](https://shopify.dev/docs/storefronts/themes/tools/online-editor), and provide [detailed setup instructions](https://shopify.dev/docs/apps/online-store/theme-app-extensions/ux-guidelines#onboarding-for-app-embed-blocks) with [deep links](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#deep-linking). Keep app branding minimal—use standard attribution (24x24 pixels) unless customers directly interact with branded elements as part of their experience (like payment methods or loyalty programs). Let merchants preview edits before publishing storefront changes.

#### App Name Branding

App Name Branding in storefront visual components is permitted only in the following cases:

* Your app may use App Name Branding in theme extensions only if one or both criteria are met:

  1. Customers directly interact with the custom branding elements as a key aspect of their buying experience, for example as part of a payment method or loyalty program.
  2. Removing the custom branding elements would cause confusion or harm to customers.

* If apps want to use App Name Branding but do not meet both criteria above, the app must use the standard app attribution pattern. Regardless, no app is permitted to do the following:

  * Requesting app reviews or ratings
  * Promoting other apps or services

App Name Branding includes:

* Company or app logos, icons, branded watermarks, visual identifiers, or other branded imagery.
* Company or app name displayed as text in any form, including plain text, branded fonts, or stylized lettering.
* Custom design elements that contain the name or logo of the company or app.

Standard app attribution: Limited to a 24x24 pixel width and height on any image or text.

See [App Store requirement 5.1](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#online-store) for more information.

***

## 10.​Apps rendered in the Shopify admin

Apps rendered in the Shopify admin provide a seamless experience by integrating directly into the admin and POS, helping merchants work efficiently without switching contexts.

Use [Shopify App Bridge](https://shopify.dev/docs/api/app-home) to ensure OAuth redirects to your app, and provide a consistent experience by integrating off-platform features into the Shopify admin. Use session tokens for authentication and avoid third-party cookies or local storage, as they may not work in all browsers. Ensure your app functions in Chrome's incognito mode.

If using max modal (full screen mode), launch it only from merchant interactions (not from the navigation menu) and use it for complex editors or workflows where it improves the user experience. For POS apps, ensure all POS actions are complete and your UI is accessible from the POS Apps Admin Dashboard.

See [App Store requirement 2.2](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#use-shopifys-apis-and-platform-tools) for more information.

***

## 11.​Product sourcing

Product sourcing apps help merchants discover and sell products from suppliers. Proper payment handling and fulfillment workflows protect both you and merchants from fraud and financial risk.

Use a PCI-compliant gateway for goods sold to merchants, but charge other app costs through [Shopify's app billing system](https://shopify.dev/docs/apps/launch/billing). Don't automatically fulfill orders in pending payment state—this protects you from fraud risk. Add cost of goods to the Cost field in the merchant's product page, and avoid selling high-risk products that violate Shopify's [Acceptable Use Policy](https://www.shopify.com/legal/aup). Use the [`fulfillmentOrderSubmitFulfillmentRequest`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentOrderSubmitFulfillmentRequest) mutation for fulfillment requests.

See [App Store requirement 5.5](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#product-sourcing) for more information.

***

## 12.​Mobile app builders

Mobile app builders empower merchants to create mobile apps for their stores. Security is critical—improper API handling exposes merchants to data breaches and compromised customer information.

Convert your mobile app builder into a Sales Channel to enable checkout creation. Provide either a customizable theme builder or preset themes, and include detailed instructions for creating developer accounts and submitting to the Apple App Store or Google Play. Apps built by your builder should not make direct requests to the authenticated GraphQL Admin API—store client secrets and access tokens on a secure web server, not on mobile devices.

See [App Store requirement 5.9](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#mobile-app-builders) for more information.

***

## 13.​Sales channels

Sales channels help merchants expand their reach by publishing products to additional platforms. A well-built sales channel provides clear account management, accurate product syncing, and reliable checkout flows.

Build your sales channel using [Polaris components](https://polaris.shopify.com/getting-started) and [cart permalinks](https://shopify.dev/docs/apps/build/checkout/create-cart-permalinks) that take customers directly to Shopify's checkout. After OAuth installation, redirect merchants to the [account connection](https://polaris.shopify.com/components/actions/account-connection) component and allow them to connect and disconnect their account. Use [banner](https://polaris.shopify.com/components/feedback-indicators/banner) components to communicate approval status.

In your publishing section, show the number of published products with links to the bulk editor, and use the [GraphQL Admin API products query](https://shopify.dev/docs/api/admin-graphql/latest/queries/products#argument-query-filter-published_status) to retrieve products. Communicate product issues using [ResourceFeedback](https://shopify.dev/docs/api/admin-graphql/latest/objects/ResourceFeedback) and banner components. Include a [help footer](https://polaris.shopify.com/components/navigation/footer-help) on every page linking to your support resources.

For sales attribution, use a storefront access token. Refer to [Building Shopify channels](https://shopify.dev/docs/apps/build/sales-channels) for the complete lifecycle diagram.

See [App Store requirement 5.7](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#sales-channel) for more information.

***

## 14.​Purchase option apps

Purchase option apps let merchants offer subscriptions, pre-orders, and other flexible buying options. Clear pricing transparency and functional customer portals help reduce cancellations and support requests.

**Storefront implementation:** Ensure your customer flow works properly on desktop and mobile across [all supported browsers](https://shopify.dev/docs/storefronts/themes/store/requirements). Automate theme modifications and support [multi-currency](https://shopify.dev/docs/api/admin-rest/latest/resources/transaction) with correct [currency and price rounding rules](https://shopify.dev/docs/storefronts/themes/pricing-payments/subscriptions/subscription-ux-guidelines#considerations-for-currency-switching-and-price-rounding). Assign the correct [purchase option category](https://shopify.dev/docs/apps/build/purchase-options#selling-plans-category) for each selling plan.

Display pricing clearly and show when customers will be charged. Use standalone widgets following the [subscription UX guidelines](https://shopify.dev/docs/storefronts/themes/pricing-payments/subscriptions/subscription-ux-guidelines#inline-pricing) and [deferred purchase option UX guidelines](https://shopify.dev/docs/storefronts/themes/pricing-payments/preorder-tbyb/preorder-tbyb-ux-guidelines#product-forms). In cart pages, display the [selling plan name](https://shopify.dev/docs/api/liquid/objects/selling_plan#selling_plan-name)—but check if the theme already includes it first.

**Tip:**

Shopify Theme Store [requires](https://shopify.dev/docs/storefronts/themes/store/requirements#4-features) themes to [display the selling plan name in the cart](https://shopify.dev/docs/storefronts/themes/pricing-payments/subscriptions/add-subscriptions-to-your-theme#the-selling-plan-display-in-the-cart). Check if `selling_plan.name` already exists in the theme's `cart.liquid` file before adding it.

**Customer portal:** Provide a [customer portal](https://shopify.dev/docs/apps/build/purchase-options/customer-portal) accessible from the order status page and post-purchase emails. The portal should display all subscriptions with details (products, delivery frequency, price, schedule) and let customers cancel subscriptions or modify [payment methods](https://shopify.dev/docs/api/admin-graphql/latest/objects/customerpaymentmethod).

**Shopify admin integration:** Use [app extensions](https://shopify.dev/docs/apps/build/purchase-options/purchase-options-extensions) on product pages in the Shopify admin, and ensure changes sync between the admin and your app. Include direct links to [orders](https://shopify.dev/docs/apps/build/purchase-options/subscriptions/contracts/build-a-subscription-contract#order-page-in-the-shopify-admin) and [customers](https://shopify.dev/docs/apps/build/purchase-options/subscriptions/contracts/build-a-subscription-contract#customers-page-in-the-shopify-admin) in the admin.

See [App Store requirement 5.4](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#purchase-option) for more information.

***

## 15.​Donation distribution apps

Donation apps help merchants support charitable causes. Transparency about charitable status and fund distribution builds trust with both merchants and their customers.

Use [Shopify's app billing system](https://shopify.dev/docs/apps/launch/billing/manual-pricing/support-one-time-purchases) or a PCI-compliant gateway for donations. Provide proof of charitable status in your UI and show merchants proof that funds reach registered charities (not tax receipts). Collect customer donations only through Shopify checkout using [Theme App Extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions) or [Checkout UI Extensions](https://shopify.dev/docs/api/checkout-ui-extensions), and include [instructions for hiding add-to-cart buttons](https://help.shopify.com/en/manual/online-store/themes/customizing-themes/hide-add-to-cart-buttons) on donation products. Clearly indicate operating costs in your UI and listing.

See [App Store requirement 5.10](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#donation) for more information.

***

## 16.​Payments apps

Payments apps process financial transactions for merchants. Proper implementation ensures secure payment handling, protects merchants from fraud, and maintains checkout performance.

**General practices:** Your payments app should meet the [minimum product requirements](https://shopify.dev/docs/apps/build/payments/requirements) and use only the [Payments Apps API](https://shopify.dev/docs/api/payments-apps). Submit screencasts for all [supported browsers](https://help.shopify.com/en/manual/shopify-admin/supported-browsers) showing your payment flow. Allow buyers to cancel payments and [redirect properly](https://shopify.dev/docs/apps/build/payments/offsite/use-the-cli) between checkout, your payment flow, and the order confirmation page. Present identical payment information to what's shown at checkout, and don't upsell products in the payment flow.

**Naming and UI:** Name your payments app using your legal business name without marketing text—merchants discover payment apps by the payment methods offered, not by name. If using [checkout UI extensions](https://shopify.dev/docs/apps/build/payments/credit-card/with-extensibility), avoid banners, logos, or graphics as decorative elements, and use only permitted targets.

**Testing:** Provide a test store, credentials, payment/refund instructions, and descriptions of specific scenarios (installments, 3D Secure). Refer to [Prohibited actions](https://shopify.dev/docs/apps/build/payments/requirements#prohibited-actions) for a complete list of restrictions.

**Cryptocurrency payments apps** must be accepted into the blockchain app program—contact [Partner Support](https://partners.shopify.com/current/support/) to apply. Implement KYC requirements, transaction monitoring, sanctions screenings, and wallet risk assessments. Use IP blocking for restricted jurisdictions and monitor regulatory guidance to avoid supporting tokens that constitute securities.

See [App Store requirement 5.2](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#payment) for more information.

***

## 17.​Post Purchase apps

Post-purchase apps help merchants increase order value through upsells after checkout. Transparent pricing and clear buyer consent protect merchants from chargebacks and customer complaints.

Redirect customers to the order confirmation page after they respond to post-purchase requests. Limit consecutive requests to 3 and ensure customers can accept or decline offers. Make upsell offers transparent with accurate pricing that dynamically updates when customers adjust quantity or variants. Display the same product price as in the merchant's store, and for limited-time offer details, clearly disclose them. Don't display order tracking, status functionality, or third-party promotions.

See [App Store requirement 5.8](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#post-purchase) for more information.

***

## 18.​Checkout apps

Checkout apps enable merchants to customize the checkout experience. Proper implementation maintains checkout performance and protects buyers from deceptive practices that could damage merchant reputation.

**Note:**

Checkout apps and extensions have [design requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist#design-requirements-for-checkout-apps) that apply to custom apps as well as public apps. Be sure that your app meets [all requirements](https://shopify.dev/docs/apps/launch/app-requirements-checklist) for its functionality and distribution type.

Use only [documented APIs](https://shopify.dev/docs/api/checkout-ui-extensions/latest/targets) for customizing checkout. Don't request payment information, add countdown timers, or collect information already captured by standard checkout fields. For network access, keep response times under one second and render [skeleton components](https://shopify.dev/docs/api/checkout-ui-extensions/latest/web-components) initially to avoid blocking checkout. Extensions should be feature-complete, provide novel functionality, and avoid self-promotion.

### Design guidelines

All apps that extend Shopify checkout—both public and custom—should follow these design guidelines. These guidelines ensure buyers receive the lowest checkout total by default, that all additional charges are clearly disclosed, and buyers give explicit consent to any optional charges.

Avoid deceptive "dark patterns" that damage buyer trust—they deceive buyers and damage trust in merchants, Shopify, and the entire commerce ecosystem. The following examples demonstrate key principles you can apply in your own designs.

See [App Store requirement 5.6](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#checkout-customization) for more information.

#### Optional charges must be off by default

If your app adds optional charges to the storefront or checkout, those charges should be turned off by default. The following example shows an app extension that adds a premium shipping option at checkout.

This design is acceptable because buyers can clearly see the optional charge and actively choose to opt in by checking a box:

![Shopify Checkout extension with optional extra charge inactive by default](https://shopify.dev/assets/assets/apps/checkout/app-ui-requirements/checkout-extra-charge-acceptable-CN-0-nFN.png)

However, this design pattern is unacceptable because it automatically adds an optional item to the cart, tries to hide the charge by calling it a "gift," and forces buyers to opt out:

![Shopify Checkout extension with an optional extra charge disguised as an opt-out 'gift' included with purchase](https://shopify.dev/assets/assets/apps/checkout/app-ui-requirements/checkout-extra-charge-unacceptable-QQE1zFwC.png)

#### Optional charges must be clearly disclosed and itemized

If your app adds optional charges to the storefront or checkout, those charges should be itemized so buyers can clearly see them. Simply showing a higher total checkout price isn't enough disclosure. Make sure all optional charges are clearly itemized on the storefront, in the cart, and at checkout.

For example, this cart drawer shows two checkout buttons: one with an optional shipping protection fee and one without. This design is acceptable because the optional fee is clearly itemized and buyers can easily see the additional cost and choose whether to pay it:

![Cart with two clearly labeled checkout options, one disclosing an itemized extra charge](https://shopify.dev/assets/assets/apps/checkout/app-ui-requirements/cart-charge-acceptable-D72sasab.png)

However, the following example is unacceptable. While the optional charge is disclosed, it's unclear which checkout button adds the fee and whether the shipping protection fee is already included in the cart total or will be added later at checkout:

![Cart with a confusing disclosure about an optional extra charge](https://shopify.dev/assets/assets/apps/checkout/app-ui-requirements/cart-charge-unacceptable-tn2gsqtL.png)

This standard applies throughout the storefront, cart, and checkout. For example, this product page has two **Add to Cart** buttons—one clearly shows an optional extra charge. This pattern is acceptable:

![Product page with two clearly labeled Add to Cart buttons, one disclosing an itemized extra charge](https://shopify.dev/assets/assets/apps/checkout/app-ui-requirements/product-page-acceptable-BzUXdkXn.png)

This product page is unacceptable because the primary **Add to Cart** button hides an extra charge within the quoted total price and obscures the option to add the product at its actual display price:

![Product page with a misleadingly labeled Add to Cart button](https://shopify.dev/assets/assets/apps/checkout/app-ui-requirements/product-page-unacceptable-5am7gpeN.png)

#### Shipping must default to the lowest-priced option

When multiple shipping options are available at different prices, the cheapest option must be selected by default.

This example is unacceptable because it places the most expensive shipping option first and makes it the default:

![Checkout where shipping options have been manipulated to default to a higher-priced shipping option](https://shopify.dev/assets/assets/apps/checkout/app-ui-requirements/checkout-shipping-unacceptable-Cj8O4uKC.png)

***

## 19.​Blockchain apps

Blockchain apps enable merchants to sell NFTs and use tokengating. Proper data privacy and regulatory compliance protect merchants from legal risks and regulatory violations.

Ensure no personal data is written or stored on-chain. Support only primary NFT sales on Shopify—secondary sales should occur on third-party platforms. Don't facilitate NFTs that could be classified as securities or have transferrable royalties.

**Caution:**

Royalties should never be dispersed to buyers or recipients of NFTs.

**NFT distribution apps** should identify NFT variants by [populating product metafields](https://shopify.dev/docs/apps/build/blockchain/nft-distribution#nft-distribution-product-metafields-requirements) and write blockchain transaction IDs to fulfillment tracking fields. Provide wallet acquisition options for customers and ensure they can receive full self-custody without post-purchase fees (unless using permissioned blockchains—disclose this before purchase). Block NFT features while Shopify Payments is active until shops are approved using the [NFT Sales Eligibility API](https://shopify.dev/docs/apps/build/blockchain/nft-distribution/check-nft-sales-eligibility).

**Tokengating apps** should identify gated orders using [order metafields](https://shopify.dev/docs/apps/build/blockchain/tokengating#tokengating-order-metafields) and gated products using [product metafields](https://shopify.dev/docs/apps/build/blockchain/tokengating#tokengating-product-metafields).

See [App Store requirement 5.11](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#blockchain) for more information.

***

## Next steps

* [**Review the App Store requirements**](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements) - Review the App Store requirements before submitting your app for review.
* [**Prepare your app before submitting**](https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review) - Learn our recommended best practices for preparing and testing your app before submitting it for review.

***