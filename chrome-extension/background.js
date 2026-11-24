chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'IMMENSE_CRM_OPEN_TAB') {
    return false;
  }

  const { target, url } = message;

  (async () => {
    try {
      if (target === 'whatsapp') {
        const tabs = await chrome.tabs.query({ url: '*://web.whatsapp.com/*' });
        if (tabs.length > 0 && tabs[0].id !== undefined) {
          const existing = tabs[0];
          // Reuse the ALREADY-OPEN WhatsApp Web tab directly (zero 2nd tab)
          await chrome.tabs.update(existing.id, { url, active: true });
          if (existing.windowId !== undefined) {
            await chrome.windows.update(existing.windowId, { focused: true });
          }
          sendResponse({ ok: true, reusedTab: true, tabId: existing.id });
          return;
        }
        const created = await chrome.tabs.create({ url, active: true });
        sendResponse({ ok: true, reusedTab: false, tabId: created.id });
        return;
      }

      if (target === 'hostinger') {
        const tabs = await chrome.tabs.query({ url: '*://mail.hostinger.com/*' });
        if (tabs.length > 0 && tabs[0].id !== undefined) {
          const existing = tabs[0];
          // Just focus the ALREADY-OPEN Hostinger Mail tab without reloading/login prompt
          await chrome.tabs.update(existing.id, { active: true });
          if (existing.windowId !== undefined) {
            await chrome.windows.update(existing.windowId, { focused: true });
          }
          sendResponse({ ok: true, reusedTab: true, tabId: existing.id });
          return;
        }
        const created = await chrome.tabs.create({
          url: url || 'https://mail.hostinger.com',
          active: true,
        });
        sendResponse({ ok: true, reusedTab: false, tabId: created.id });
        return;
      }

      sendResponse({ ok: false, error: 'Unknown target' });
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
  })();

  // Keep message channel open for async response
  return true;
});
