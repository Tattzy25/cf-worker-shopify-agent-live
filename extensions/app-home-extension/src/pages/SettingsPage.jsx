// @ts-nocheck
import { useState, useEffect } from "preact/hooks";
import ApiKeysSettings from "../settings/ApiKeysSettings.jsx";
import SystemMessageSettings from "../settings/SystemMessageSettings.jsx";
import PowerMerchantSettings from "../settings/PowerMerchantSettings.jsx";
import { saveSettings, getSettings } from "../api/settingsApi.js";

/**
 * SettingsPage
 * Main layout coordinating AI credentials, persona instructions, Power Merchant MCP tools, and form persistence.
 */
export default function SettingsPage() {
  // AI Provider & Model States
  const [providerMode, setProviderMode] = useState("facetimefy");
  const [primaryChoice, setPrimaryChoice] = useState("openai_primary");
  const [openaiModel, setOpenaiModel] = useState("gpt-5.5");
  const [geminiModel, setGeminiModel] = useState("gemini-3.8-flash");
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");

  // System Message & Persona States
  const [personaTone, setPersonaTone] = useState("friendly");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  // Power Merchant MCP Servers State (supports 100+ servers dynamically)
  const [mcpServers, setMcpServers] = useState([]);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Load existing settings on mount
  useEffect(() => {
    const shop = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("shop") : null;
    if (shop) {
      getSettings(shop).then((data) => {
        if (data) {
          if (data.provider_mode) setProviderMode(data.provider_mode);
          if (data.primary_choice) setPrimaryChoice(data.primary_choice);
          if (data.openai_model) setOpenaiModel(data.openai_model);
          if (data.gemini_model) setGeminiModel(data.gemini_model);
          if (data.persona_tone) setPersonaTone(data.persona_tone);
          if (data.greeting_message) setGreetingMessage(data.greeting_message);
          if (data.system_prompt) setSystemPrompt(data.system_prompt);
          if (data.mcp_servers) {
            try {
              const parsed = typeof data.mcp_servers === "string" ? JSON.parse(data.mcp_servers) : data.mcp_servers;
              if (Array.isArray(parsed)) setMcpServers(parsed);
            } catch (_) {}
          }
        }
      }).catch(() => {});
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const formEntries = Object.fromEntries(formData.entries());

    // Explicitly merge state values
    formEntries.provider_mode = providerMode;
    formEntries.primary_choice = primaryChoice;
    formEntries.openai_model = openaiModel;
    formEntries.gemini_model = geminiModel;
    formEntries.openai_api_key = openaiKey;
    formEntries.gemini_api_key = geminiKey;
    formEntries.persona_tone = personaTone;
    formEntries.greeting_message = greetingMessage;
    formEntries.system_prompt = systemPrompt;
    formEntries.mcp_servers = JSON.stringify(mcpServers);

    const shop = new URLSearchParams(window.location.search).get("shop");
    if (shop) formEntries.shop = shop;

    const res = await saveSettings(formEntries);

    if (typeof shopify !== "undefined" && shopify.toast) {
      if (res.success) {
        shopify.toast.show("Settings saved successfully!");
      } else {
        shopify.toast.show(res.error || "Failed to save settings", { isError: true });
      }
    }

    setIsSaving(false);
  };

  const handleReset = () => {
    if (typeof shopify !== "undefined" && shopify.toast) {
      shopify.toast.show("Changes discarded");
    }
  };

  return (
    <form
      data-save-bar
      onSubmit={handleSubmit}
      onReset={handleReset}
    >
      <s-page heading="Concierge Settings" inlineSize="small">
        
        {/* Module 1: AI Provider & API Keys */}
        <ApiKeysSettings
          providerMode={providerMode}
          setProviderMode={setProviderMode}
          primaryChoice={primaryChoice}
          setPrimaryChoice={setPrimaryChoice}
          openaiKey={openaiKey}
          setOpenaiKey={setOpenaiKey}
          openaiModel={openaiModel}
          setOpenaiModel={setOpenaiModel}
          geminiKey={geminiKey}
          setGeminiKey={setGeminiKey}
          geminiModel={geminiModel}
          setGeminiModel={setGeminiModel}
        />

        {/* Module 2: System Message & Store Persona */}
        <SystemMessageSettings
          personaTone={personaTone}
          setPersonaTone={setPersonaTone}
          greetingMessage={greetingMessage}
          setGreetingMessage={setGreetingMessage}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
        />

        {/* Module 3: For Power Merchants (MCP Tool Servers) */}
        <PowerMerchantSettings
          mcpServers={mcpServers}
          setMcpServers={setMcpServers}
        />

        {/* Primary Save Button */}
        <s-box paddingBlockStart="base">
          <s-button variant="primary" type="submit" loading={isSaving ? true : undefined}>
            Save Settings
          </s-button>
        </s-box>

      </s-page>
    </form>
  );
}