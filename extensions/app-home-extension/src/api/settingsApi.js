// @ts-nocheck
const WORKER_BASE_URL = "https://chat.facetimefy.com";

/**
 * Validates an OpenAI or Google Gemini API key via the Cloudflare Edge Worker.
 * @param {"openai" | "gemini"} provider
 * @param {string} key
 * @param {string} [shop]
 * @param {string} [notificationEmail]
 * @returns {Promise<{ valid: boolean, error?: string, notice?: string }>}
 */
export async function validateApiKey(provider, key, shop = null, notificationEmail = null) {
  if (!key || !key.trim()) {
    return { valid: false, error: "Key cannot be empty" };
  }

  const resolvedShop = shop || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("shop") : null);

  try {
    const res = await fetch(`${WORKER_BASE_URL}/admin/validate-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        provider, 
        key: key.trim(),
        shop: resolvedShop || undefined,
        notification_email: notificationEmail || undefined
      })
    });
    const data = await res.json();
    return {
      valid: Boolean(data?.valid),
      error: data?.error || undefined,
      notice: data?.notice || undefined
    };
  } catch (err) {
    return {
      valid: false,
      error: "Unable to reach validation service. Check network connection.",
      notice: "Our team has been notified. Please try again later."
    };
  }
}

/**
 * Saves merchant settings to D1 database and KV edge cache.
 * @param {Record<string, any>} settings
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function saveSettings(settings) {
  try {
    const res = await fetch(`${WORKER_BASE_URL}/admin/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    if (!res.ok || data?.error) {
      return { success: false, error: data?.error || "Failed to save settings" };
    }
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: "Network error while saving settings"
    };
  }
}

/**
 * Loads merchant settings for a store.
 * @param {string} shop
 * @returns {Promise<Record<string, any> | null>}
 */
export async function getSettings(shop) {
  try {
    const res = await fetch(`${WORKER_BASE_URL}/admin/settings?shop=${encodeURIComponent(shop)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Failed to load settings:", err);
    return null;
  }
}
