// @ts-nocheck
import { useState } from "preact/hooks";
import { validateMcpServer, validateApiKey } from "../api/settingsApi.js";

export default function PowerMerchantSettings({
  mcpServers = [],
  setMcpServers,
  powerModel = "",
  setPowerModel,
  powerApiKey = "",
  setPowerApiKey,
  customPowerModel = "",
  setCustomPowerModel
}) {
  // Power API key validation states
  const [keyStatus, setKeyStatus] = useState("idle"); // "idle" | "verifying" | "valid" | "invalid"
  const [keyError, setKeyError] = useState("");

  const handleValidateKey = async () => {
    if (!powerApiKey || !powerApiKey.trim()) {
      setKeyStatus("idle");
      setKeyError("");
      return;
    }
    const isGemini = powerModel.startsWith("gemini-") || (powerModel === "custom" && customPowerModel.startsWith("gemini-"));
    const provider = isGemini ? "gemini" : "openai";

    setKeyStatus("verifying");
    setKeyError("");

    const shop = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("shop") : null;
    const res = await validateApiKey(provider, powerApiKey, shop);
    if (res.valid) {
      setKeyStatus("valid");
      setKeyError("");
    } else {
      setKeyStatus("invalid");
      setKeyError(res.error || "Invalid API key for selected provider.");
    }
  };

  const isGeminiModel = powerModel.startsWith("gemini-") || (powerModel === "custom" && customPowerModel.startsWith("gemini-"));
  const keyLabel = isGeminiModel ? "Google Gemini API Key" : "OpenAI API Key";
  const keyPlaceholder = isGeminiModel ? "AIzaSy..." : "sk-...";
  const keyLink = isGeminiModel ? "https://aistudio.google.com/api-keys" : "https://platform.openai.com/api-keys";

  // New server inputs
  const [serverUrl, setServerUrl] = useState("");
  const [serverLabel, setServerLabel] = useState("");
  
  // Custom headers array: [{ name: "", value: "" }]
  const [showHeaders, setShowHeaders] = useState(false);
  const [headersList, setHeadersList] = useState([]);

  // Validation states
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [validationSuccess, setValidationSuccess] = useState("");

  // Tools viewer toggle per server
  const [expandedServerId, setExpandedServerId] = useState(null);

  const handleAddHeaderRow = () => {
    setHeadersList([...headersList, { name: "", value: "" }]);
  };

  const handleUpdateHeader = (index, field, value) => {
    const updated = [...headersList];
    updated[index] = { ...updated[index], [field]: value };
    setHeadersList(updated);
  };

  const handleRemoveHeaderRow = (index) => {
    setHeadersList(headersList.filter((_, i) => i !== index));
  };

  const handleConnectServer = async () => {
    if (!serverUrl || !serverUrl.trim()) {
      setValidationError("Please enter a valid MCP server URL (e.g. https://example-mcp-server.com/mcp)");
      return;
    }

    const trimmedUrl = serverUrl.trim();
    setIsValidating(true);
    setValidationError("");
    setValidationSuccess("");

    // Compile active headers
    const headersMap = {};
    for (const h of headersList) {
      if (h.name && h.name.trim() && h.value && h.value.trim()) {
        headersMap[h.name.trim()] = h.value.trim();
      }
    }

    const shop = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("shop") : null;
    const res = await validateMcpServer(trimmedUrl, headersMap, shop);

    if (res.valid) {
      const discoveredTools = res.tools || [];
      const newServer = {
        id: "mcp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        url: trimmedUrl,
        label: serverLabel.trim() || trimmedUrl.replace(/^https?:\/\//, "").split("/")[0],
        status: "ready",
        tools: discoveredTools,
        headers: headersMap,
        connectedAt: new Date().toLocaleTimeString()
      };

      setMcpServers([...mcpServers, newServer]);
      setValidationSuccess(`Connected successfully! Discovered ${discoveredTools.length} tools.`);
      setServerUrl("");
      setServerLabel("");
      setHeadersList([]);
      setShowHeaders(false);
      setExpandedServerId(newServer.id);
    } else {
      setValidationError(res.error || "Could not connect to server. Check the URL and try again.");
    }

    setIsValidating(false);
  };

  const handleDeleteServer = (id) => {
    setMcpServers(mcpServers.filter(s => s.id !== id));
    if (expandedServerId === id) setExpandedServerId(null);
  };

  const toggleTools = (id) => {
    setExpandedServerId(expandedServerId === id ? null : id);
  };

  const totalTools = mcpServers.reduce((acc, s) => acc + (s.tools?.length || 0), 0);

  return (
    <s-section heading="For Power Merchants">
      <s-stack direction="block" gap="base">

        {/* Module: Power Merchant AI Engine */}
        <s-box padding="base" border="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-heading>Power Merchant AI Engine</s-heading>
            <s-paragraph color="subdued">
              Override standard store models with an advanced agentic model and dedicated API key.
            </s-paragraph>

            <s-select
              label="Select AI Model"
              name="power_model"
              value={powerModel}
              onChange={(e) => {
                const val = e.target?.value || e.detail?.value || e.currentTarget?.value;
                setPowerModel(val);
                if (keyStatus !== "idle") setKeyStatus("idle");
                if (keyError) setKeyError("");
              }}
            >
              <s-option value="">Inherit Standard Store Settings (Default)</s-option>
              <s-option value="gpt-6-sol" selected={powerModel === "gpt-6-sol"}>gpt-6-sol</s-option>
              <s-option value="gpt-5.5" selected={powerModel === "gpt-5.5"}>gpt-5.5</s-option>
              <s-option value="gpt-5.4" selected={powerModel === "gpt-5.4"}>gpt-5.4</s-option>
              <s-option value="gpt-6-astra" selected={powerModel === "gpt-6-astra"}>gpt-6-astra</s-option>
              <s-option value="gemini-3.6-flash" selected={powerModel === "gemini-3.6-flash"}>gemini-3.6-flash</s-option>
              <s-option value="gemini-3.7-flash" selected={powerModel === "gemini-3.7-flash"}>gemini-3.7-flash</s-option>
              <s-option value="gemini-3.8-flash" selected={powerModel === "gemini-3.8-flash"}>gemini-3.8-flash</s-option>
              <s-option value="custom" selected={powerModel === "custom"}>Custom Model...</s-option>
            </s-select>

            {powerModel === "custom" && (
              <s-text-field
                label="Custom Model Identifier"
                name="custom_power_model"
                value={customPowerModel}
                placeholder="e.g. ft:gpt-4o-... or gemini-3.1-pro-preview"
                onInput={(e) => setCustomPowerModel(e.target.value)}
                details="Enter the exact model identifier string."
              ></s-text-field>
            )}

            {powerModel && (
              <s-box paddingBlockStart="small-100">
                <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="end">
                  <s-password-field
                    label={keyLabel}
                    name="power_api_key"
                    value={powerApiKey}
                    placeholder={keyPlaceholder}
                    autocomplete="off"
                    error={keyError || undefined}
                    onInput={(e) => {
                      setPowerApiKey(e.target.value);
                      if (keyStatus !== "idle") setKeyStatus("idle");
                      if (keyError) setKeyError("");
                    }}
                    onBlur={handleValidateKey}
                  ></s-password-field>
                  <s-button
                    onClick={(e) => {
                      e.preventDefault();
                      handleValidateKey();
                    }}
                    loading={keyStatus === "verifying" ? true : undefined}
                  >
                    Verify Key
                  </s-button>
                </s-grid>
                {keyStatus === "verifying" && (
                  <s-box paddingBlockStart="extra-tight">
                    <s-text color="subdued">Verifying key with {isGeminiModel ? "Google Gemini" : "OpenAI"}...</s-text>
                  </s-box>
                )}
                {keyStatus === "valid" && (
                  <s-box paddingBlockStart="extra-tight">
                    <s-text tone="success">✓ API key verified & active</s-text>
                  </s-box>
                )}
                <s-box paddingBlockStart="extra-tight">
                  <s-link href={keyLink} target="_blank">
                    {keyLabel}
                  </s-link>
                </s-box>
              </s-box>
            )}
          </s-stack>
        </s-box>

        {/* Connect MCP Server Box */}
        <s-box padding="base" border="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-heading>Connect MCP Server</s-heading>

            <s-url-field
              label="Server URL"
              placeholder="https://example-mcp-server.com/mcp"
              value={serverUrl}
              onInput={(e) => setServerUrl(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              onChange={(e) => setServerUrl(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              details="Only use MCP servers you trust and verify."
              required
            ></s-url-field>

            <s-text-field
              label="Server Label (Optional)"
              placeholder="e.g. custom_store_tools"
              value={serverLabel}
              onInput={(e) => setServerLabel(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              onChange={(e) => setServerLabel(e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
              details="Friendly identifier for routing and telemetry."
            ></s-text-field>

            {/* Custom Headers Toggle Button */}
            <s-stack direction="inline" gap="tight">
              <s-button
                variant="secondary"
                type="button"
                onClick={() => {
                  const nextState = !showHeaders;
                  setShowHeaders(nextState);
                  if (nextState && headersList.length === 0) {
                    setHeadersList([{ name: "", value: "" }]);
                  }
                }}
              >
                {showHeaders ? "Hide custom headers" : "Add custom headers"}
              </s-button>
            </s-stack>

            {/* Custom Headers Editor (Unlimited rows with easy row-by-row deletion) */}
            {showHeaders && (
              <s-box padding="base" background="subdued" border="base" borderRadius="base">
                <s-stack direction="block" gap="base">
                  <s-heading>Custom Headers</s-heading>

                  {headersList.map((header, index) => (
                    <s-grid key={index} gridTemplateColumns="1fr 1fr auto" gap="base" alignItems="end">
                      <s-text-field
                        label="Header name"
                        placeholder="Authorization"
                        value={header.name}
                        onInput={(e) => handleUpdateHeader(index, "name", e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
                        onChange={(e) => handleUpdateHeader(index, "name", e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
                      ></s-text-field>

                      <s-text-field
                        label="Value"
                        placeholder="Bearer token or API key"
                        value={header.value}
                        onInput={(e) => handleUpdateHeader(index, "value", e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
                        onChange={(e) => handleUpdateHeader(index, "value", e.target?.value || e.detail?.value || e.currentTarget?.value || "")}
                      ></s-text-field>

                      <s-button
                        variant="tertiary"
                        tone="critical"
                        type="button"
                        onClick={() => handleRemoveHeaderRow(index)}
                      >
                        Delete
                      </s-button>
                    </s-grid>
                  ))}

                  <s-stack direction="inline" gap="tight">
                    <s-button
                      variant="secondary"
                      type="button"
                      onClick={handleAddHeaderRow}
                    >
                      + Add another header
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-box>
            )}

            {/* Validation Feedback Banners */}
            {validationError && (
              <s-banner tone="critical" dismissible onDismiss={() => setValidationError("")}>
                <s-paragraph>{validationError}</s-paragraph>
              </s-banner>
            )}

            {validationSuccess && (
              <s-banner tone="success" dismissible onDismiss={() => setValidationSuccess("")}>
                <s-paragraph>{validationSuccess}</s-paragraph>
              </s-banner>
            )}

            {/* Connect Button */}
            <s-stack direction="inline" gap="tight">
              <s-button
                variant="primary"
                type="button"
                onClick={handleConnectServer}
                loading={isValidating ? true : undefined}
              >
                Connect Server
              </s-button>
            </s-stack>
          </s-stack>
        </s-box>

        {/* Connected Servers List (Unlimited servers) */}
        {mcpServers.length > 0 && (
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" justifyContent="space-between" alignItems="center">
              <s-heading>Connected Servers ({mcpServers.length})</s-heading>
              <s-badge tone="info">{totalTools} tools active</s-badge>
            </s-stack>

            {mcpServers.map((server) => {
              const isReady = server.status === "ready";
              const isExpanded = expandedServerId === server.id;
              const toolCount = server.tools?.length || 0;

              return (
                <s-box key={server.id} padding="base" border="base" borderRadius="base" background="subdued">
                  <s-stack direction="block" gap="tight">
                    <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                      <s-stack direction="inline" gap="tight" alignItems="center">
                        <s-text type="strong">{server.label}</s-text>
                        <s-badge tone={isReady ? "success" : "critical"}>
                          {isReady ? "Ready" : "Failed"}
                        </s-badge>
                        {isReady && (
                          <s-text color="subdued">
                            ({toolCount} {toolCount === 1 ? "tool" : "tools"})
                          </s-text>
                        )}
                      </s-stack>

                      <s-button
                        variant="tertiary"
                        tone="critical"
                        type="button"
                        onClick={() => handleDeleteServer(server.id)}
                      >
                        Delete
                      </s-button>
                    </s-stack>

                    <s-paragraph color="subdued">{server.url}</s-paragraph>

                    {server.error && (
                      <s-paragraph tone="critical">{server.error}</s-paragraph>
                    )}

                    {/* Live Discovered Tools list */}
                    {isReady && toolCount > 0 && (
                      <s-stack direction="block" gap="tight">
                        <s-stack direction="inline" gap="tight">
                          <s-button
                            variant="secondary"
                            type="button"
                            onClick={() => toggleTools(server.id)}
                          >
                            {isExpanded ? `Hide tools (${toolCount})` : `View discovered tools (${toolCount})`}
                          </s-button>
                        </s-stack>

                        {isExpanded && (
                          <s-stack direction="block" gap="tight">
                            {server.tools.map((tool, tIdx) => (
                              <s-box key={tIdx} padding="base" border="base" borderRadius="base" background="base">
                                <s-stack direction="block" gap="tight">
                                  <s-stack direction="inline" gap="tight" alignItems="center">
                                    <s-text type="strong">{tool.name}</s-text>
                                    <s-badge tone="info">Tool</s-badge>
                                  </s-stack>
                                  {tool.description && (
                                    <s-paragraph color="subdued">
                                      {tool.description}
                                    </s-paragraph>
                                  )}
                                </s-stack>
                              </s-box>
                            ))}
                          </s-stack>
                        )}
                      </s-stack>
                    )}
                  </s-stack>
                </s-box>
              );
            })}
          </s-stack>
        )}

      </s-stack>
    </s-section>
  );
}
