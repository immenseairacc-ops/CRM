export type SmartTabTarget = 'whatsapp' | 'hostinger';

/**
 * Checks whether the Immense CRM Tab Switcher Chrome Extension is installed.
 */
export function isTabSwitcherExtensionInstalled(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement?.dataset?.immenseTabSwitcher === '1';
}

/**
 * Opens or switches directly to an ALREADY-OPEN WhatsApp Web or Hostinger Mail tab
 * using the Immense CRM Tab Switcher Chrome Extension (zero duplicate tabs).
 * Falls back gracefully to named window.open() if the extension is not installed.
 */
export function openSmartTab(target: SmartTabTarget, url: string): void {
  if (typeof window === 'undefined') return;

  const fallbackWindowName =
    target === 'whatsapp' ? 'immense_whatsapp_web' : 'immense_hostinger_mail';

  if (!isTabSwitcherExtensionInstalled()) {
    window.open(url, fallbackWindowName);
    return;
  }

  const requestId = `immense-tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let settled = false;

  const cleanup = () => {
    window.removeEventListener('message', onAck);
    window.clearTimeout(timer);
  };

  const onAck = (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== 'IMMENSE_CRM_OPEN_TAB_ACK' || data.requestId !== requestId) {
      return;
    }
    settled = true;
    cleanup();
    if (!data.ok) {
      window.open(url, fallbackWindowName);
    }
  };

  const timer = window.setTimeout(() => {
    if (!settled) {
      cleanup();
      window.open(url, fallbackWindowName);
    }
  }, 450);

  window.addEventListener('message', onAck);
  window.postMessage(
    {
      type: 'IMMENSE_CRM_OPEN_TAB',
      requestId,
      target,
      url,
    },
    '*'
  );
}
