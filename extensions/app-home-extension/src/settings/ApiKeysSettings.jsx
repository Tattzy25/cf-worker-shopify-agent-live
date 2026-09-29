// @ts-nocheck
import { useState } from "preact/hooks";
import { validateApiKey } from "../api/settingsApi.js";

/**
 * AI Credentials & Model Configuration Section
 * Manages provider selection, BYOK keys, live validation, and model selection.
 */
export default function ApiKeysSettings({
  providerMode,
  setProviderMode,
  primaryChoice,
  setPrimaryChoice,
  openaiKey,
  setOpenaiKey,
  openaiModel,
  setOpenaiModel,
  geminiKey,
  setGeminiKey,
  geminiModel,
  setGeminiModel
}) {
  // Local validation states (kept private to this component)
  const [openaiStatus, setOpenaiStatus] = useState("idle"); // "idle" | "verifying" | "valid" | "invalid"
  const [openaiError, setOpenaiError] = useState("");

  const [geminiStatus, setGeminiStatus] = useState("idle");
  const [geminiError, setGeminiError] = useState("");

  const handleValidate = async (provider) => {
    const key = provider === "openai" ? openaiKey : geminiKey;
    if (!key || !key.trim()) {
      if (provider === "openai") {
        setOpenaiStatus("idle");
        setOpenaiError("");
      } else {
        setGeminiStatus("idle");
        setGeminiError("");
      }
      return;
    }

    if (provider === "openai") {
      setOpenaiStatus("verifying");
      setOpenaiError("");
    } else {
      setGeminiStatus("verifying");
      setGeminiError("");
    }

    const shop = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("shop") : null;
    const res = await validateApiKey(provider, key, shop);
    if (res.valid) {
      if (provider === "openai") {
        setOpenaiStatus("valid");
        setOpenaiError("");
      } else {
        setGeminiStatus("valid");
        setGeminiError("");
      }
    } else {
      const noticeText = res.notice || "Our team has been notified. Please try again later.";
      const errorMsg = res.error ? `${res.error} — ${noticeText}` : noticeText;
      if (provider === "openai") {
        setOpenaiStatus("invalid");
        setOpenaiError(errorMsg);
      } else {
        setGeminiStatus("invalid");
        setGeminiError(errorMsg);
      }
    }
  };

  const handleProviderModeChange = (e) => {
    const selected = e.currentTarget?.values?.[0] || e.target?.value || (e.detail && e.detail.values?.[0]);
    if (selected) {
      setProviderMode(selected);
    }
  };

  const handlePrimaryChoiceChange = (e) => {
    const selected = e.currentTarget?.values?.[0] || e.target?.value || (e.detail && e.detail.values?.[0]);
    if (selected) {
      setPrimaryChoice(selected);
    }
  };

  const showOpenAI = providerMode === "openai" || providerMode === "both";
  const showGemini = providerMode === "gemini" || providerMode === "both";

  return (
    <s-section heading="AI Credentials & Model">
      <s-choice-list
        label="Which AI provider do you want to use?"
        name="provider_mode"
        details="Please note: It does not fallback to Facetimefy API key if there is an issue with BYOK keys."
        onChange={handleProviderModeChange}
        onInput={handleProviderModeChange}
      >
        <s-choice value="facetimefy" selected={providerMode === "facetimefy"}>
          Facetimefy Key & Model (default)
        </s-choice>
        <s-choice value="openai" selected={providerMode === "openai"}>
          OpenAI
        </s-choice>
        <s-choice value="gemini" selected={providerMode === "gemini"}>
          Google Gemini
        </s-choice>
        <s-choice value="both" selected={providerMode === "both"}>
          Both (OpenAI & Gemini with Fallback)
        </s-choice>
      </s-choice-list>

      {/* Facetimefy Platform Default Info */}
      {providerMode === "facetimefy" && (
        <s-box paddingBlockStart="small-100">
          <s-banner tone="info">
            <s-text>
              Operating on standard Facetimefy platform credentials using <strong>OpenAI GPT-5.5</strong>. No merchant API keys required.
            </s-text>
          </s-banner>
        </s-box>
      )}

      {/* Fallback Priority (Only shown if Both is selected) */}
      {providerMode === "both" && (
        <s-box paddingBlockStart="small-100">
          <s-choice-list
            label="Which provider is your primary default?"
            name="primary_choice"
            onChange={handlePrimaryChoiceChange}
            onInput={handlePrimaryChoiceChange}
          >
            <s-choice value="openai_primary" selected={primaryChoice === "openai_primary"}>
              OpenAI as Primary (Gemini as backup fallback)
            </s-choice>
            <s-choice value="gemini_primary" selected={primaryChoice === "gemini_primary"}>
              Google Gemini as Primary (OpenAI as backup fallback)
            </s-choice>
          </s-choice-list>
        </s-box>
      )}

      {/* OpenAI Inputs */}
      {showOpenAI && (
        <s-box paddingBlockStart="small-100">
          <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="end">
            <s-password-field
              label="OpenAI API Key"
              name="openai_api_key"
              value={openaiKey}
              placeholder="sk-..."
              autocomplete="off"
              error={openaiError || undefined}
              onInput={(e) => {
                setOpenaiKey(e.target.value);
                if (openaiStatus !== "idle") setOpenaiStatus("idle");
                if (openaiError) setOpenaiError("");
              }}
              onBlur={() => handleValidate("openai")}
            ></s-password-field>
            <s-button
              onClick={(e) => {
                e.preventDefault();
                handleValidate("openai");
              }}
              loading={openaiStatus === "verifying" ? true : undefined}
            >
              Verify Key
            </s-button>
          </s-grid>
          {openaiStatus === "verifying" && (
            <s-box paddingBlockStart="extra-tight">
              <s-text color="subdued">Verifying key with OpenAI...</s-text>
            </s-box>
          )}
          {openaiStatus === "valid" && (
            <s-box paddingBlockStart="extra-tight">
              <s-text tone="success">✓ API key verified & active</s-text>
            </s-box>
          )}
          <s-box paddingBlockStart="extra-tight" paddingBlockEnd="small-100">
            <s-link href="https://platform.openai.com/api-keys" target="_blank">
              OpenAI API Key
            </s-link>
          </s-box>
          <s-select
            label="OpenAI Model"
            name="openai_model"
            value={openaiModel}
            onChange={(e) => setOpenaiModel(e.target.value)}
          >
            <s-option value="gpt-5.5" selected={openaiModel === "gpt-5.5"}>GPT-5.5 (Recommended Default)</s-option>
            <s-option value="gpt-5.4" selected={openaiModel === "gpt-5.4"}>GPT-5.4</s-option>
            <s-option value="gpt-sol" selected={openaiModel === "gpt-sol"}>GPT-sol</s-option>
          </s-select>
        </s-box>
      )}

      {/* Gemini Inputs */}
      {showGemini && (
        <s-box paddingBlockStart="small-100">
          <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="end">
            <s-password-field
              label="Google Gemini API Key"
              name="gemini_api_key"
              value={geminiKey}
              placeholder="AIzaSy..."
              autocomplete="off"
              error={geminiError || undefined}
              onInput={(e) => {
                setGeminiKey(e.target.value);
                if (geminiStatus !== "idle") setGeminiStatus("idle");
                if (geminiError) setGeminiError("");
              }}
              onBlur={() => handleValidate("gemini")}
            ></s-password-field>
            <s-button
              onClick={(e) => {
                e.preventDefault();
                handleValidate("gemini");
              }}
              loading={geminiStatus === "verifying" ? true : undefined}
            >
              Verify Key
            </s-button>
          </s-grid>
          {geminiStatus === "verifying" && (
            <s-box paddingBlockStart="extra-tight">
              <s-text color="subdued">Verifying key with Google Gemini...</s-text>
            </s-box>
          )}
          {geminiStatus === "valid" && (
            <s-box paddingBlockStart="extra-tight">
              <s-text tone="success">✓ API key verified & active</s-text>
            </s-box>
          )}
          <s-box paddingBlockStart="extra-tight" paddingBlockEnd="small-100">
            <s-link href="https://aistudio.google.com/api-keys" target="_blank">
              Gemini API Key
            </s-link>
          </s-box>
          <s-select
            label="Gemini Model"
            name="gemini_model"
            value={geminiModel}
            onChange={(e) => setGeminiModel(e.target.value)}
          >
            <s-option value="gemini-3.8-flash" selected={geminiModel === "gemini-3.8-flash"}>Gemini 3.8 Flash (Recommended Default)</s-option>
            <s-option value="gemini-3.6-flash" selected={geminiModel === "gemini-3.6-flash"}>Gemini 3.6 Flash</s-option>
          </s-select>
        </s-box>
      )}
    </s-section>
  );
}
