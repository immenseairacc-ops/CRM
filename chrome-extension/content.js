// Mark page so Immense CRM knows the Tab Switcher extension is installed
try {
  document.documentElement.dataset.immenseTabSwitcher = '1';
} catch {
  // ignore
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.type !== 'IMMENSE_CRM_OPEN_TAB') return;

  try {
    chrome.runtime.sendMessage(
      {
        type: 'IMMENSE_CRM_OPEN_TAB',
        target: data.target,
        url: data.url,
      },
      (response) => {
        const lastError = chrome.runtime.lastError;
        window.postMessage(
          {
            type: 'IMMENSE_CRM_OPEN_TAB_ACK',
            requestId: data.requestId,
            ok: !lastError && Boolean(response && response.ok),
            reusedTab: Boolean(response && response.reusedTab),
          },
          '*'
        );
      }
    );
  } catch {
    window.postMessage(
      {
        type: 'IMMENSE_CRM_OPEN_TAB_ACK',
        requestId: data.requestId,
        ok: false,
      },
      '*'
    );
  }
});
