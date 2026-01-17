import { useEffect, useRef, useCallback, useState } from 'react';

interface UseShakeDetectionOptions {
  threshold?: number;
  timeout?: number;
  onShake: () => void;
  enabled?: boolean;
}

export function useShakeDetection({
  threshold = 15,
  timeout = 1000,
  onShake,
  enabled = true,
}: UseShakeDetectionOptions) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const lastShake = useRef<number>(0);
  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
  const lastZ = useRef<number | null>(null);

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    if (!enabled) return;

    const { accelerationIncludingGravity } = event;
    if (!accelerationIncludingGravity) return;

    const { x, y, z } = accelerationIncludingGravity;
    if (x === null || y === null || z === null) return;

    if (lastX.current !== null && lastY.current !== null && lastZ.current !== null) {
      const deltaX = Math.abs(x - lastX.current);
      const deltaY = Math.abs(y - lastY.current);
      const deltaZ = Math.abs(z - lastZ.current);

      const acceleration = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);

      if (acceleration > threshold) {
        const now = Date.now();
        if (now - lastShake.current > timeout) {
          lastShake.current = now;
          onShake();
        }
      }
    }

    lastX.current = x;
    lastY.current = y;
    lastZ.current = z;
  }, [enabled, threshold, timeout, onShake]);

  const requestPermission = useCallback(async () => {
    // Check if DeviceMotionEvent exists and has requestPermission (iOS 13+)
    try {
      const motionEvent = DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof motionEvent.requestPermission === 'function') {
        const permission = await motionEvent.requestPermission();
        setHasPermission(permission === 'granted');
        return permission === 'granted';
      }
      setHasPermission(true);
      return true;
    } catch (err) {
      console.error('Error requesting motion permission:', err);
      setHasPermission(false);
      return false;
    }
  }, []);

  useEffect(() => {
    // Check if DeviceMotionEvent is supported
    if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') {
      setIsSupported(false);
      return;
    }

    if (!enabled) return;

    // For non-iOS, we can add listener directly
    const motionEvent = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof motionEvent.requestPermission !== 'function') {
      setHasPermission(true);
      window.addEventListener('devicemotion', handleMotion);
      return () => {
        window.removeEventListener('devicemotion', handleMotion);
      };
    }

    // For iOS, we need permission first
    if (hasPermission === true) {
      window.addEventListener('devicemotion', handleMotion);
      return () => {
        window.removeEventListener('devicemotion', handleMotion);
      };
    }
  }, [enabled, hasPermission, handleMotion]);

  return {
    isSupported,
    hasPermission,
    requestPermission,
  };
}
