// @ts-nocheck
import { useState } from "preact/hooks";

/**
 * System Message & Store Persona Settings Section
 * Manages the AI concierge's tone, custom instructions, and storefront greeting.
 */
export default function SystemMessageSettings({
  personaTone = "friendly",
  setPersonaTone,
  systemPrompt = "",
  setSystemPrompt,
  greetingMessage = "",
  setGreetingMessage
}) {
  return (
    <s-section heading="AI Persona & Instructions">
      <s-select
        label="Concierge Tone"
        name="persona_tone"
        value={personaTone}
        onChange={(e) => setPersonaTone && setPersonaTone(e.target.value)}
      >
        <s-option value="friendly" selected={personaTone === "friendly"}>
          Friendly & Warm (Recommended)
        </s-option>
        <s-option value="luxury" selected={personaTone === "luxury"}>
          Luxury Brand Stylist & Curated
        </s-option>
        <s-option value="sales" selected={personaTone === "sales"}>
          Proactive Sales & Upsell Focused
        </s-option>
        <s-option value="concise" selected={personaTone === "concise"}>
          Direct, Crisp & Concise
        </s-option>
      </s-select>

      <s-box paddingBlockStart="small-100">
        <s-text-field
          label="Initial Storefront Greeting"
          name="greeting_message"
          value={greetingMessage}
          placeholder="Hi there! How can I help you find the perfect item today?"
          onInput={(e) => setGreetingMessage && setGreetingMessage(e.target.value)}
        ></s-text-field>
      </s-box>

      <s-box paddingBlockStart="small-100">
        <s-text-area
          label="Custom System Prompt & Instructions"
          name="system_prompt"
          value={systemPrompt}
          rows={5}
          maxLength={2000}
          placeholder="Provide specific instructions for your AI concierge (e.g., recommend accessories for apparel, mention current free shipping over $50, answer questions about our return policy)..."
          onInput={(e) => setSystemPrompt && setSystemPrompt(e.target.value)}
        ></s-text-area>
      </s-box>
    </s-section>
  );
}
