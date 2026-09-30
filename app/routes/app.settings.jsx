import { useState } from "react";
import { useLoaderData, useActionData, useSubmit, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";

const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || "https://shop-chat-agent-worker.avi-kay2019.workers.dev";

export async function loader({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  // Retrieve verified merchant email from Shopify Admin GraphQL
  let defaultEmail = "";
  try {
    const res = await admin.graphql(`
      query getShopContact {
        shop {
          email
          contactEmail
          name
          myshopifyDomain
        }
      }
    `);
    const data = await res.json();
    defaultEmail = data?.data?.shop?.contactEmail || data?.data?.shop?.email || "";
  } catch (err) {
    console.error("[Settings] Error fetching shop email from Admin GraphQL:", err);
  }

  // Fetch current edge settings from Cloudflare Worker
  let currentSettings = {
    tier: "byok",
    provider: "openai",
    model: "gpt-5.5",
    hasCustomKey: false,
    apiKey: "",
    notificationEmail: defaultEmail,
    customPrompt: "",
    agentProfileUrl: "",
    promptPreset: "standardAssistant",
    launcherButtonText: "Shop with AI",
    launcherPosition: "bottom-center",
    iconBgColor: "#ffffff",
    iconColor: "#000000",
    agentName: "Facetimefy AI",
    welcomeMessage: "👋 Hi there! How can I help you today?",
    inputPlaceholder: "Message Facetimefy AI...",
    workerUrl: WORKER_URL
  };

  let billingData = null;

  try {
    const [workerRes, billingRes] = await Promise.all([
      fetch(`${WORKER_URL}/admin/settings?shop=${shop}`),
      fetch(`${WORKER_URL}/admin/billing/usage?shop=${shop}`)
    ]);
    if (workerRes.ok) {
      const data = await workerRes.json();
      currentSettings = {
        ...currentSettings,
        ...data,
        notificationEmail: data.notificationEmail || defaultEmail,
        workerUrl: data.workerUrl || WORKER_URL
      };
    }
    if (billingRes && billingRes.ok) {
      billingData = await billingRes.json();
    }
  } catch (err) {
    console.error("[Settings] Error fetching worker settings or billing:", err);
  }

  return { shop, currentSettings, defaultEmail, billingData };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();

  const payload = {
    shop,
    tier: formData.get("tier") || "byok",
    provider: formData.get("provider") || "openai",
    model: formData.get("model") || "gpt-5.5",
    apiKey: formData.get("apiKey") || undefined,
    notificationEmail: formData.get("notificationEmail") || "",
    customPrompt: formData.get("customPrompt") || "",
    agentProfileUrl: formData.get("agentProfileUrl") || "",
    promptPreset: formData.get("promptPreset") || "standardAssistant",
    launcherButtonText: formData.get("launcherButtonText") || "Shop with AI",
    launcherPosition: formData.get("launcherPosition") || "bottom-center",
    iconBgColor: formData.get("iconBgColor") || "#ffffff",
    iconColor: formData.get("iconColor") || "#000000",
    agentName: formData.get("agentName") || "Facetimefy AI",
    welcomeMessage: formData.get("welcomeMessage") || "👋 Hi there! How can I help you today?",
    inputPlaceholder: formData.get("inputPlaceholder") || "Message Facetimefy AI...",
    workerUrl: formData.get("workerUrl") || WORKER_URL
  };

  try {
    const workerRes = await fetch(`${WORKER_URL}/admin/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!workerRes.ok) {
      const errText = await workerRes.text();
      return { success: false, error: `Edge worker error (${workerRes.status}): ${errText}` };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }

  return { success: true, message: "Settings saved successfully!" };
}

export default function Settings() {
  const { shop, currentSettings, billingData } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  // Tier & Provider
  const [tier, setTier] = useState(currentSettings.tier || (currentSettings.provider === "platform" ? "platform" : "byok"));
  const [provider, setProvider] = useState(currentSettings.provider || "openai");
  const [model, setModel] = useState(currentSettings.model || "gpt-5.5");
  const [apiKey, setApiKey] = useState("");
  const [agentProfileUrl, setAgentProfileUrl] = useState(currentSettings.agentProfileUrl || "");

  // Brand Persona & Selling Style
  const [customPrompt, setCustomPrompt] = useState(currentSettings.customPrompt || "");
  const [promptPreset, setPromptPreset] = useState(currentSettings.promptPreset || "standardAssistant");

  // Storefront Concierge Widget Appearance (from screenshots)
  const [launcherButtonText, setLauncherButtonText] = useState(currentSettings.launcherButtonText || "Shop with AI");
  const [launcherPosition, setLauncherPosition] = useState(currentSettings.launcherPosition || "bottom-center");
  const [iconBgColor, setIconBgColor] = useState(currentSettings.iconBgColor || "#ffffff");
  const [iconColor, setIconColor] = useState(currentSettings.iconColor || "#000000");
  const [agentName, setAgentName] = useState(currentSettings.agentName || "Facetimefy AI");
  const [welcomeMessage, setWelcomeMessage] = useState(currentSettings.welcomeMessage || "👋 Hi there! How can I help you today?");
  const [inputPlaceholder, setInputPlaceholder] = useState(currentSettings.inputPlaceholder || "Message Facetimefy AI...");

  // Operations & Alerts
  const [notificationEmail, setNotificationEmail] = useState(currentSettings.notificationEmail || "");
  const [workerUrl, setWorkerUrl] = useState(currentSettings.workerUrl || WORKER_URL);


  const handleProviderChange = (e) => {
    const val = e.target?.value || e.detail?.value || e.currentTarget?.value;
    if (!val) return;
    setProvider(val);
    if (val === "gemini") {
      setModel("gemini-3.6-flash");
    } else {
      setModel("gpt-5.5");
    }
  };

  const handleTierChange = (e) => {
    const val = e.target?.value || e.detail?.value || e.currentTarget?.value;
    if (!val) return;
    setTier(val);
    if (val === "platform") {
      setProvider("platform");
      setModel("gpt-5.5");
    } else {
      setProvider("openai");
      setModel("gpt-5.5");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    // Explicitly append controlled state values to ensure complete submission
    formData.set("tier", tier);
    formData.set("provider", tier === "platform" ? "platform" : provider);
    formData.set("model", model);
    if (apiKey) formData.set("apiKey", apiKey);
    formData.set("agentProfileUrl", agentProfileUrl);
    formData.set("customPrompt", customPrompt);
    formData.set("promptPreset", promptPreset);
    formData.set("launcherButtonText", launcherButtonText);
    formData.set("launcherPosition", launcherPosition);
    formData.set("iconBgColor", iconBgColor);
    formData.set("iconColor", iconColor);
    formData.set("agentName", agentName);
    formData.set("welcomeMessage", welcomeMessage);
    formData.set("inputPlaceholder", inputPlaceholder);
    formData.set("notificationEmail", notificationEmail);
    formData.set("workerUrl", workerUrl);

    submit(formData, { method: "post" });

    if (typeof window !== "undefined" && window.shopify?.toast) {
      window.shopify.toast.show("Settings saved successfully");
    }
  };

  const handleResetToDefaults = () => {
    setTier("byok");
    setProvider("openai");
    setModel("gpt-5.5");
    setApiKey("");
    setAgentProfileUrl("");
    setCustomPrompt("");
    setPromptPreset("standardAssistant");
    setLauncherButtonText("Shop with AI");
    setLauncherPosition("bottom-center");
    setIconBgColor("#ffffff");
    setIconColor("#000000");
    setAgentName("Facetimefy AI");
    setWelcomeMessage("👋 Hi there! How can I help you today?");
    setInputPlaceholder("Message Facetimefy AI...");

    if (typeof window !== "undefined" && window.shopify?.toast) {
      window.shopify.toast.show("Settings reset to defaults");
    }
  };

  return (
    <form
      data-save-bar
      onSubmit={handleSubmit}
      onReset={(e) => {
        e.preventDefault();
        handleResetToDefaults();
      }}
    >
      <input type="hidden" name="shop" value={shop} />

      <s-page heading="Concierge Settings" inlineSize="small">
        <ui-title-bar title="Concierge Settings" />

        {actionData?.success && (
          <s-section>
            <s-banner tone="success" heading="Settings Saved">
              Your Concierge configurations are saved and actively applied on your storefront.
            </s-banner>
          </s-section>
        )}

        {actionData?.error && (
          <s-section>
            <s-banner tone="critical" heading="Save Failed">
              {actionData.error}
            </s-banner>
          </s-section>
        )}

        {/* ========================================================= */}
        {/* SECTION 1: AI INTELLIGENCE & SERVICE TIER                 */}
        {/* ========================================================= */}
        <s-section heading="AI Intelligence & Models">
          <s-stack direction="block" gap="base">
            <s-paragraph tone="neutral">
              Select your service tier and high-performance AI model. Only models validated for LiveCommerce multi-tool catalog reasoning are supported.
            </s-paragraph>

            <s-select
              label="Service Tier"
              name="tier_select"
              value={tier}
              onInput={handleTierChange}
              onChange={handleTierChange}
            >
              <s-option value="platform">Platform Managed (Turnkey "Chat Key" — Zero API Setup)</s-option>
              <s-option value="byok">Bring Your Own Key (BYOK — Direct Provider Execution)</s-option>
            </s-select>

            {tier === "platform" ? (
              <>
                <s-select
                  label="AI Provider"
                  name="provider_select"
                  value={provider}
                  onInput={handleProviderChange}
                  onChange={handleProviderChange}
                >
                  <s-option value="gemini">Google Gemini (Gemini 3.6 Flash — Starting at $0.0025 / message)</s-option>
                  <s-option value="openai">OpenAI (GPT-5.5 & GPT-4o mini with Master MCP)</s-option>
                </s-select>

                <s-select
                  label="Active Model"
                  name="model_select"
                  value={model}
                  onInput={(e) => setModel(e.target?.value || e.detail?.value || e.currentTarget?.value)}
                  onChange={(e) => setModel(e.target?.value || e.detail?.value || e.currentTarget?.value)}
                >
                  {provider === "gemini" ? (
                    <>
                      <s-option value="gemini-3.6-flash">gemini-3.6-flash — $0.0025 / message (Recommended for High Speed)</s-option>
                      <s-option value="gemini-2.5-pro">gemini-2.5-pro — $0.015 / message (Deep Reasoning)</s-option>
                    </>
                  ) : (
                    <>
                      <s-option value="gpt-4o-mini">gpt-4o-mini — $0.005 / message (High-Speed LiveCommerce)</s-option>
                      <s-option value="gpt-5.5">gpt-5.5 — $0.025 / message (Flagship Concierge & Styling)</s-option>
                    </>
                  )}
                </s-select>

                <s-box padding="base" border="base" borderRadius="base" style={{ background: "#f8fafc" }}>
                  <s-stack direction="block" gap="small">
                    <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                      <s-text type="strong" tone="success">⚡ Usage-Based Micro-Billing Active</s-text>
                      <s-badge tone="info">No monthly minimums</s-badge>
                    </s-stack>
                    <s-paragraph tone="subdued">
                      Zero API setup required. You are charged strictly per shopper message at low micro-rates. Pay only for what your store uses.
                    </s-paragraph>
                    <s-grid gridTemplateColumns="repeat(auto-fit, minmax(140px, 1fr))" gap="base" style={{ marginTop: "6px" }}>
                      <s-box padding="small" border="base" borderRadius="base" style={{ background: "#ffffff" }}>
                        <s-text tone="subdued" size="small">Active Rate</s-text>
                        <s-heading size="small">
                          {model === "gemini-3.6-flash" ? "$0.0025 / msg" : model === "gpt-4o-mini" ? "$0.005 / msg" : model === "gemini-2.5-pro" ? "$0.015 / msg" : "$0.025 / msg"}
                        </s-heading>
                      </s-box>
                      <s-box padding="small" border="base" borderRadius="base" style={{ background: "#ffffff" }}>
                        <s-text tone="subdued" size="small">Messages (30d)</s-text>
                        <s-heading size="small">{billingData?.summary?.total_turns || 0}</s-heading>
                      </s-box>
                      <s-box padding="small" border="base" borderRadius="base" style={{ background: "#ffffff" }}>
                        <s-text tone="subdued" size="small">Current Accrued</s-text>
                        <s-heading size="small">${Number(billingData?.summary?.total_billed_usd || 0).toFixed(2)}</s-heading>
                      </s-box>
                    </s-grid>
                  </s-stack>
                </s-box>
              </>
            ) : (
              <>
                <s-select
                  label="AI Provider"
                  name="provider_select"
                  value={provider}
                  onInput={handleProviderChange}
                  onChange={handleProviderChange}
                >
                  <s-option value="openai">OpenAI (Native MCP Tools & Virtual Try-On)</s-option>
                  <s-option value="gemini">Google Gemini (Gemini 3.6 Flash via Master MCP)</s-option>
                </s-select>

                <s-select
                  label="Active Model"
                  name="model_select"
                  value={model}
                  onInput={(e) => setModel(e.target?.value || e.detail?.value || e.currentTarget?.value)}
                  onChange={(e) => setModel(e.target?.value || e.detail?.value || e.currentTarget?.value)}
                >
                  {provider === "gemini" ? (
                    <>
                      <s-option value="gemini-3.8-flash">gemini-3.8-flash</s-option>
                      <s-option value="gemini-3.7-flash">gemini-3.7-flash</s-option>
                      <s-option value="gemini-3.6-flash">gemini-3.6-flash</s-option>
                    </>
                  ) : (
                    <>
                      <s-option value="gpt-6-sol">gpt-6-sol</s-option>
                      <s-option value="gpt-5.5">gpt-5.5</s-option>
                      <s-option value="gpt-5.4">gpt-5.4</s-option>
                      <s-option value="gpt-6-astra">gpt-6-astra</s-option>
                    </>
                  )}
                </s-select>

                <s-password-field
                  label={provider === "gemini" ? "Google Gemini API Key" : "OpenAI API Key"}
                  name="apiKey_input"
                  value={apiKey}
                  onInput={(e) => setApiKey(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
                  onChange={(e) => setApiKey(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
                  placeholder={
                    currentSettings.hasCustomKey
                      ? "•••••••••••••••••••••••• (Active key securely stored)"
                      : provider === "gemini"
                      ? "AIzaSy..."
                      : "sk-..."
                  }
                  details="Strict Zero-Fallback Protocol: requests execute exclusively on your configured key with $0.00 platform usage fees. Never falls back to platform credits."
                ></s-password-field>

                <s-url-field
                  label="Custom UCP Agent Profile URL (Optional)"
                  name="agentProfileUrl_input"
                  value={agentProfileUrl}
                  onInput={(e) => setAgentProfileUrl(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
                  onChange={(e) => setAgentProfileUrl(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
                  placeholder="https://ucp-agent-profile.facetimefy.com/..."
                  details="Leave blank to use the default Facetimefy UCP Agent Profile, or specify your store's custom agent URL."
                ></s-url-field>
              </>
            )}
          </s-stack>
        </s-section>

        {/* ========================================================= */}
        {/* SECTION 2: SALES STYLE & BRAND PERSONA                   */}
        {/* ========================================================= */}
        <s-section heading="Sales Style & Brand Persona">
          <s-stack direction="block" gap="base">
            <s-paragraph tone="neutral">
              Customize how your concierge communicates with your shoppers. Core Grandmaster rules (catalog tools, no raw tables, zero direct checkout PII) remain strictly protected.
            </s-paragraph>

            <s-select
              label="System Prompt Style Preset"
              name="promptPreset_select"
              value={promptPreset}
              onInput={(e) => setPromptPreset(e.target?.value || e.detail?.value || e.currentTarget?.value)}
              onChange={(e) => setPromptPreset(e.target?.value || e.detail?.value || e.currentTarget?.value)}
            >
              <s-option value="standardAssistant">Standard Assistant (Warm, Helpful & Professional)</s-option>
              <s-option value="enthusiasticStylist">Enthusiastic Stylist (Bubbly, Energetic & Trend-Focused)</s-option>
            </s-select>

            <s-text-area
              label="Custom Brand Persona & Selling Instructions (Optional)"
              name="customPrompt_input"
              value={customPrompt}
              onInput={(e) => setCustomPrompt(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              onChange={(e) => setCustomPrompt(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              rows={5}
              placeholder="E.g. We are an edgy luxury streetwear brand based in NYC. Greet shoppers casually, use fashion slang like 'cop', emphasize our limited drop schedule, and recommend matching hats with every hoodie."
              details="Your custom persona instructions are injected directly into the live AI prompt while strictly preserving all core catalog and checkout safety rules."
            ></s-text-area>
          </s-stack>
        </s-section>

        {/* ========================================================= */}
        {/* SECTION 3: STOREFRONT CONCIERGE APPEARANCE                */}
        {/* ========================================================= */}
        <s-section heading="Storefront Concierge Appearance">
          <s-stack direction="block" gap="base">
            <s-paragraph tone="neutral">
              Configure how the chat launcher and header appear on your live storefront.
            </s-paragraph>

            <s-text-field
              label="Launcher Button Text"
              name="launcherButtonText_input"
              value={launcherButtonText}
              onInput={(e) => setLauncherButtonText(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              onChange={(e) => setLauncherButtonText(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              placeholder="Shop with AI"
              details="The text displayed on the shimmering storefront pill launcher."
            ></s-text-field>

            <s-select
              label="Launcher Position"
              name="launcherPosition_select"
              value={launcherPosition}
              onInput={(e) => setLauncherPosition(e.target?.value || e.detail?.value || e.currentTarget?.value)}
              onChange={(e) => setLauncherPosition(e.target?.value || e.detail?.value || e.currentTarget?.value)}
            >
              <s-option value="bottom-center">Bottom Center (Recommended)</s-option>
              <s-option value="bottom-right">Bottom Right</s-option>
              <s-option value="bottom-left">Bottom Left</s-option>
            </s-select>

            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <s-text-field
                label="Icon Circle Background"
                name="iconBgColor_input"
                value={iconBgColor}
                onInput={(e) => setIconBgColor(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
                onChange={(e) => setIconBgColor(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
                placeholder="#ffffff"
                details="Hex color for launcher circle."
              ></s-text-field>

              <s-text-field
                label="Sparkle Icon Color"
                name="iconColor_input"
                value={iconColor}
                onInput={(e) => setIconColor(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
                onChange={(e) => setIconColor(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
                placeholder="#000000"
                details="Hex color for sparkle icon."
              ></s-text-field>
            </s-grid>

            <s-text-field
              label="Agent Name"
              name="agentName_input"
              value={agentName}
              onInput={(e) => setAgentName(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              onChange={(e) => setAgentName(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              placeholder="Facetimefy AI"
              details="Title shown at the top of the chat window."
            ></s-text-field>

            <s-text-field
              label="Welcome Message"
              name="welcomeMessage_input"
              value={welcomeMessage}
              onInput={(e) => setWelcomeMessage(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              onChange={(e) => setWelcomeMessage(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              placeholder="👋 Hi there! How can I help you today?"
              details="The opening greeting message shown to shoppers."
            ></s-text-field>

            <s-text-field
              label="Input Placeholder"
              name="inputPlaceholder_input"
              value={inputPlaceholder}
              onInput={(e) => setInputPlaceholder(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              onChange={(e) => setInputPlaceholder(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              placeholder="Message Facetimefy AI..."
              details="Placeholder prompt inside the chat input box."
            ></s-text-field>
          </s-stack>
        </s-section>

        {/* ========================================================= */}
        {/* SECTION 4: ALERTS & OPERATIONAL ROUTING                   */}
        {/* ========================================================= */}
        <s-section heading="Alerts & Operational Routing">
          <s-stack direction="block" gap="base">
            <s-email-field
              label="Merchant Alert Notification Email"
              name="notificationEmail_input"
              value={notificationEmail}
              onInput={(e) => setNotificationEmail(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              onChange={(e) => setNotificationEmail(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              placeholder="store-owner@yourstore.com"
              details="Zero customer errors: all edge exceptions fail silently on the storefront and dispatch privately to this verified store address from error@urgent.facetimefy.com."
            ></s-email-field>

            <s-url-field
              label="Cloudflare Worker URL"
              name="workerUrl_input"
              value={workerUrl}
              onInput={(e) => setWorkerUrl(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              onChange={(e) => setWorkerUrl(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              placeholder="https://shop-chat-agent-worker.your-subdomain.workers.dev"
              details="Production edge worker endpoint executing chat requests and analytics."
            ></s-url-field>
          </s-stack>
        </s-section>


        {/* ========================================================= */}
        {/* SECTION 6: TOOLS & RESET CONFIRMATION                     */}
        {/* ========================================================= */}
        <s-section heading="Tools & Defaults">
          <s-box padding="small-100" border="base" borderRadius="base">
            <s-grid gridTemplateColumns="1fr auto" alignItems="center" gap="base">
              <s-box>
                <s-heading>Reset all settings</s-heading>
                <s-paragraph color="subdued">
                  Restore all AI models, styling, and prompts to their default turnkey values.
                </s-paragraph>
              </s-box>
              <s-button
                tone="critical"
                commandFor="reset-modal"
                command="--show"
                type="button"
              >
                Reset
              </s-button>
            </s-grid>
          </s-box>

          <s-modal id="reset-modal" heading="Reset all settings?">
            <s-stack direction="block" gap="base">
              <s-text>
                Are you sure you want to reset all settings to their default values? This will restore standard concierge defaults.
              </s-text>
              <s-banner tone="warning">
                <s-text>
                  This will reset model options, storefront launcher styling, and custom brand persona prompts.
                </s-text>
              </s-banner>
            </s-stack>
            <s-button
              slot="primary-action"
              variant="primary"
              tone="critical"
              type="button"
              onClick={handleResetToDefaults}
            >
              Reset settings
            </s-button>
            <s-button
              slot="secondary-actions"
              commandFor="reset-modal"
              command="--hide"
              type="button"
            >
              Cancel
            </s-button>
          </s-modal>
        </s-section>

        <s-box paddingBlock="base">
          <s-button variant="primary" type="submit" loading={isSaving}>
            Save All Settings
          </s-button>
        </s-box>
      </s-page>
    </form>
  );
}
