// Device fingerprinting utility for fraud detection
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timezone: string;
  deviceId: string;
  colorDepth: number;
  hardwareConcurrency: number;
  touchSupport: boolean;
}

// Simple hash function for generating device ID
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Generate a unique device fingerprint
function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.platform,
    navigator.language,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen.colorDepth?.toString() || '',
    navigator.hardwareConcurrency?.toString() || '',
    ('ontouchstart' in window).toString(),
  ];
  
  return simpleHash(components.join('|'));
}

// Get or create a persistent device ID
function getDeviceId(): string {
  const STORAGE_KEY = 'fraud_detection_device_id';
  
  try {
    let deviceId = localStorage.getItem(STORAGE_KEY);
    
    if (!deviceId) {
      // Generate new device ID combining fingerprint + random component
      const fingerprint = generateDeviceFingerprint();
      const random = Math.random().toString(36).substring(2, 10);
      deviceId = `${fingerprint}-${random}`;
      localStorage.setItem(STORAGE_KEY, deviceId);
    }
    
    return deviceId;
  } catch {
    // Fallback if localStorage is not available
    return generateDeviceFingerprint();
  }
}

// Collect complete device information
export function getDeviceInfo(): DeviceInfo {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    deviceId: getDeviceId(),
    colorDepth: screen.colorDepth || 24,
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    touchSupport: 'ontouchstart' in window,
  };
}

// Check if this appears to be a new device
export function isNewDevice(knownDeviceIds: string[]): boolean {
  const currentDeviceId = getDeviceId();
  return !knownDeviceIds.includes(currentDeviceId);
}
