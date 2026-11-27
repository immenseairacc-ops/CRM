// Mobile Phone & System Notification Engine for Immense Air CRM

export interface PhoneNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  icon?: string;
  silent?: boolean;
}

// Synthesize high-quality notification chime using Web Audio API
export function playNotificationChime(type: 'reminder' | 'lead' | 'recharge' | 'alert' = 'alert') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'reminder') {
      // Urgent reminder dual-tone
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15); // E6
      osc2.frequency.setValueAtTime(1760, now + 0.2); // A6
    } else if (type === 'lead') {
      // New Lead pleasant chime
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      osc2.frequency.setValueAtTime(1174.66, now + 0.2); // D6
    } else {
      // Standard notification alert
      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.15); // B5
      osc2.frequency.setValueAtTime(1318.51, now + 0.2); // E6
    }

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.1);
    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);
  } catch {
    // Ignore audio autoplay restrictions if user has not interacted yet
  }
}

// Vibrate device (Mobile Phones)
export function vibratePhone(pattern: number[] = [300, 100, 300, 100, 300]) {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors
    }
  }
}

// Check if notification is supported
export function isPhoneNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Get current permission status
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isPhoneNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

// Request permission to send push alerts to mobile/desktop
export async function requestPhoneNotificationPermission(): Promise<boolean> {
  if (!isPhoneNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Send confirmation test alert
      await sendPhoneNotification({
        title: '📲 Immense Air Alerts Active',
        body: 'You will now receive all Leads, Reminders, and Recharges on this phone!',
        tag: 'welcome-notification',
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Send system alert to phone/lockscreen/browser
export async function sendPhoneNotification(payload: PhoneNotificationPayload): Promise<boolean> {
  if (typeof window === 'undefined' || !isPhoneNotificationSupported()) return false;

  // Sound & Vibration
  if (!payload.silent) {
    vibratePhone([300, 100, 300, 100, 300]);
    playNotificationChime();
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || `immense-${Date.now()}`,
    vibrate: [300, 100, 300, 100, 300],
    data: {
      url: payload.url || '/',
      timestamp: Date.now(),
    },
    // Keep notification visible until dismissed
    requireInteraction: true,
  };

  try {
    // 1. Try via Service Worker (Best for Mobile & PWA)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(payload.title, notificationOptions);
        return true;
      }
    }

    // 2. Fallback to standard Notification API
    new Notification(payload.title, notificationOptions);
    return true;
  } catch {
    try {
      new Notification(payload.title, notificationOptions);
      return true;
    } catch {
      return false;
    }
  }
}
