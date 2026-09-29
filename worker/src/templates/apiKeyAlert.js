function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderApiKeyAlert({
  providerLabel,
  shopLabel,
  recipient,
  errorString,
  timestamp
}) {
  const subject = `[Action Required] ${providerLabel} API Key Error - ${shopLabel}`;

  const text = [
    `ACTION REQUIRED: ${providerLabel.toUpperCase()} API KEY ERROR`,
    ``,
    `Store: ${shopLabel}`,
    `Provider: ${providerLabel}`,
    `Timestamp: ${timestamp}`,
    ``,
    `Error Details:`,
    `${errorString}`,
    ``,
    `Recommended Next Steps:`,
    `1. Check your ${providerLabel} account balance, billing status, or active credits.`,
    `2. Verify that your API key is valid and has permissions for the configured model.`,
    `3. Re-save your API key in the Facetimefy app settings in your Shopify Admin.`,
    ``,
    `---`,
    `Sent automatically by Facetimefy AI Concierge to ${recipient}.`
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f6f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #202223;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f6f6f7; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e1e3e5; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 24px 28px 16px 28px; border-bottom: 1px solid #f1f2f3;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 16px; font-weight: 700; color: #202223;">Facetimefy</span>
                    <span style="font-size: 13px; color: #6d7175; margin-left: 6px;">AI Concierge</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: #feedec; color: #bf0711; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 8px; border-radius: 4px;">Action Required</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h1 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #202223; line-height: 1.3;">
                ${escapeHtml(providerLabel)} API Key Error
              </h1>
              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.5; color: #4a4d52;">
                An issue was encountered while communicating with <strong>${escapeHtml(providerLabel)}</strong> for store <strong>${escapeHtml(shopLabel)}</strong>:
              </p>
              
              <div style="background-color: #fbf1f0; border-left: 4px solid #d82c0d; border-radius: 4px; padding: 14px 16px; margin: 18px 0;">
                <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #bf0711;">Provider Error Details</p>
                <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; color: #bf0711; line-height: 1.45; word-break: break-word;">
                  ${escapeHtml(errorString)}
                </div>
              </div>

              <h2 style="margin: 22px 0 10px 0; font-size: 14px; font-weight: 600; color: #202223;">
                Recommended Next Steps:
              </h2>
              <ol style="margin: 0 0 20px 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #4a4d52;">
                <li style="margin-bottom: 6px;">Check your <strong>${escapeHtml(providerLabel)}</strong> developer account to verify your billing status and remaining credits.</li>
                <li style="margin-bottom: 6px;">Ensure the API key is active and has access to the configured model.</li>
                <li style="margin-bottom: 6px;">Update your key in the <strong>Facetimefy AI Concierge</strong> settings in your Shopify Admin.</li>
              </ol>

              <hr style="border: none; border-top: 1px solid #e1e3e5; margin: 24px 0 16px 0;" />

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 12px; color: #6d7175;">
                <tr>
                  <td>Store: <strong>${escapeHtml(shopLabel)}</strong></td>
                  <td align="right">Time: ${escapeHtml(timestamp)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafbfb; padding: 14px 28px; border-top: 1px solid #f1f2f3; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #8c9196; line-height: 1.4;">
                This operational notification was sent to your verified store email: <strong>${escapeHtml(recipient)}</strong>.<br />
                Facetimefy AI Concierge &bull; Automated Edge System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
