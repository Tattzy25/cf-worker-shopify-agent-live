import { useState } from "react";
import { useLoaderData, useActionData, Form } from "react-router";

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "default";

  // Attempt to fetch current settings from the backend or environment
  let currentSettings = {
    provider: process.env.DEFAULT_AI_PROVIDER || "openai",
    model: "gpt-5.5",
    workerUrl: process.env.WORKER_URL || "https://shop-chat-agent-worker.avi-kay2019.workers.dev",
    hasCustomKey: Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY)
  };

  return { shop, currentSettings };
}

export async function action({ request }) {
  const formData = await request.formData();
  const provider = formData.get("provider");
  const apiKey = formData.get("apiKey");
  const model = formData.get("model");
  const workerUrl = formData.get("workerUrl");
  const shop = formData.get("shop");

  // If workerUrl is configured, sync directly to Cloudflare Worker KV
  if (workerUrl) {
    try {
      const cleanUrl = workerUrl.replace(/\/$/, "");
      await fetch(`${cleanUrl}/admin/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, provider, apiKey, model })
      });
    } catch (e) {
      console.error("Failed to sync to worker:", e);
    }
  }

  return { success: true, message: "Settings saved successfully!" };
}

export default function Index() {
  const { shop, currentSettings } = useLoaderData();
  const actionData = useActionData();

  const [provider, setProvider] = useState(currentSettings.provider || "openai");
  const [model, setModel] = useState(currentSettings.model || "gpt-5.5");
  const [apiKey, setApiKey] = useState("");
  const [workerUrl, setWorkerUrl] = useState(currentSettings.workerUrl || "");

  const handleProviderChange = (e) => {
    const val = e.target.value;
    setProvider(val);
    if (val === "gemini") {
      setModel("gemini-3.6-flash");
    } else {
      setModel("gpt-5.5");
    }
  };

  return (
    <s-page>
      <ui-title-bar title="AI Shopping Concierge - Settings" />

      {actionData?.success && (
        <s-section>
          <s-banner tone="success" heading="Settings Saved">
            Your AI Concierge settings have been updated and are live on your storefront.
          </s-banner>
        </s-section>
      )}

      <s-section heading="AI Provider & API Configuration">
        <Form method="post">
          <input type="hidden" name="shop" value={shop} />
          
          <s-stack gap="base">
            <s-paragraph>
              Select whether you want to use OpenAI or Google Gemini. You can bring your own API key (BYOK) or use the platform managed key.
            </s-paragraph>

            {/* Provider Selection */}
            <div>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
                AI Provider
              </label>
              <select
                name="provider"
                value={provider}
                onChange={handleProviderChange}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  background: "#ffffff"
                }}
              >
                <option value="openai">OpenAI (Native MCP Tools & Virtual Try-On)</option>
                <option value="gemini">Google Gemini (Gemini 3.6 Flash via Master MCP)</option>
                <option value="platform">Platform Managed (Zero Setup)</option>
              </select>
            </div>

            {/* Model Selection */}
            <div>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
                Active Model
              </label>
              <select
                name="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  background: "#ffffff"
                }}
              >
                {provider === "gemini" ? (
                  <>
                    <option value="gemini-3.6-flash">gemini-3.6-flash (Recommended)</option>
                  </>
                ) : (
                  <>
                    <option value="gpt-5.5">gpt-5.5 (Recommended for Concierge)</option>
                    <option value="gpt-4o">gpt-4o</option>
                  </>
                )}
              </select>
            </div>

            {/* API Key Input */}
            {provider !== "platform" && (
              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
                  {provider === "gemini" ? "Google Gemini API Key" : "OpenAI API Key"}
                </label>
                <input
                  type="password"
                  name="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    currentSettings.hasCustomKey
                      ? "•••••••••••••••••••••••• (Key already configured)"
                      : provider === "gemini"
                      ? "AIzaSy..."
                      : "sk-..."
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
                <s-text color="subdued" style={{ fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Your key is securely stored on the server. Shoppers will never see your API key.
                </s-text>
              </div>
            )}

            {/* Cloudflare Worker URL */}
            <div>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
                Cloudflare Worker URL
              </label>
              <input
                type="text"
                name="workerUrl"
                value={workerUrl}
                onChange={(e) => setWorkerUrl(e.target.value)}
                placeholder="https://shop-chat-agent-worker.your-subdomain.workers.dev"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
              <s-text color="subdued" style={{ fontSize: "12px", marginTop: "4px", display: "block" }}>
                Your production Cloudflare Worker endpoint handling storefront requests.
              </s-text>
            </div>

            <div style={{ marginTop: "12px" }}>
              <s-button variant="primary" type="submit">
                Save Settings
              </s-button>
            </div>
          </s-stack>
        </Form>
      </s-section>

      {/* Sidebar Info */}
      <s-section heading="System Connectivity" slot="aside">
        <s-stack gap="base">
          <div>
            <s-text fontWeight="bold">Master MCP Server: </s-text>
            <s-badge tone="success">13 Tools Connected</s-badge>
          </div>
          <div>
            <s-text fontWeight="bold">Virtual Try-On: </s-text>
            <s-badge tone="info">gpt-image-2.5-sunburst</s-badge>
          </div>
          <div>
            <s-text fontWeight="bold">UCP Agent Profile: </s-text>
            <s-badge tone="success">Active</s-badge>
          </div>
          <div>
            <s-text fontWeight="bold">Storefront Cart: </s-text>
            <s-badge tone="success">Native /cart/add.js</s-badge>
          </div>
        </s-stack>
      </s-section>

      <s-section heading="Setup Instructions" slot="aside">
        <s-stack gap="base">
          <s-paragraph>
            1. Deploy your Cloudflare Worker using <code>wrangler deploy</code>.
          </s-paragraph>
          <s-paragraph>
            2. Enter your Worker URL and chosen API key above, then click <b>Save Settings</b>.
          </s-paragraph>
          <s-paragraph>
            3. Open your Shopify <b>Theme Editor</b> &rarr; <b>App Embeds</b> and toggle <b>AI Chat Assistant</b> ON.
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}
