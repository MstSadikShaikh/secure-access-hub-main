import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserSettings } from './useUserSettings';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getCurrentLocation } from '@/lib/geolocation';

export type SOSStatus = 'idle' | 'countdown' | 'triggering' | 'sent' | 'error';

interface SOSResult {
  success: boolean;
  message: string;
  alertId?: string;
  contactsNotified?: number;
}

interface UserSettings {
  sos_enabled: boolean;
  shake_detection_enabled: boolean;
  alarm_enabled: boolean;
}

export function useSOS() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<SOSStatus>('idle');
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<SOSResult | null>(null);
  const { sosEnabled, shakeDetectionEnabled, alarmEnabled, isLoading: userSettingsLoading } = useUserSettings();

  // Reconstruct settings object for backward compatibility
  const settings = {
    sos_enabled: sosEnabled,
    shake_detection_enabled: shakeDetectionEnabled,
    alarm_enabled: alarmEnabled,
  };

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const alarmRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Play alarm sound
  const playAlarm = useCallback(() => {
    if (!alarmEnabled) return;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      alarmRef.current = audioContext;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      gainNode.gain.value = 0.3;

      // Create pulsing alarm effect
      const pulseAlarm = () => {
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
      };

      oscillator.start();
      oscillatorRef.current = oscillator;

      const pulseInterval = setInterval(pulseAlarm, 400);

      // Stop after 5 seconds
      setTimeout(() => {
        clearInterval(pulseInterval);
        stopAlarm();
      }, 5000);

    } catch (err) {
      console.error('Error playing alarm:', err);
    }
  }, [alarmEnabled]);

  const stopAlarm = useCallback(() => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) {
        console.warn('Error closing oscillator:', e);
      }
      oscillatorRef.current = null;
    }
    if (alarmRef.current) {
      try {
        alarmRef.current.close();
      } catch (e) {
        console.warn('Error closing alarm context:', e);
      }
      alarmRef.current = null;
    }
  }, []);

  // Vibrate device
  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) {
      // SOS pattern: 3 short, 3 long, 3 short
      navigator.vibrate([100, 50, 100, 50, 100, 200, 300, 50, 300, 50, 300, 200, 100, 50, 100, 50, 100]);
    }
  }, []);

  // Start countdown
  const startCountdown = useCallback(() => {
    if (!sosEnabled || status !== 'idle') return;

    setStatus('countdown');
    setCountdown(3);
    vibrate();

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          triggerSOS('button');
          return 0;
        }
        vibrate();
        return prev - 1;
      });
    }, 1000);
  }, [sosEnabled, status, vibrate]);

  // Cancel countdown
  const cancelCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setStatus('idle');
    setCountdown(3);
    stopAlarm();
  }, [stopAlarm]);

  // Trigger SOS
  const triggerSOS = useCallback(async (method: 'button' | 'shake') => {
    if (!user) {
      toast({
        title: 'Not Logged In',
        description: 'Please log in to use SOS features',
        variant: 'destructive',
      });
      return;
    }

    setStatus('triggering');
    playAlarm();
    vibrate();

    try {
      // Get current location
      let location: { latitude: number; longitude: number; address?: string } | null = null;

      try {
        const geoResult = await getCurrentLocation();
        if (geoResult) {
          location = {
            latitude: geoResult.latitude,
            longitude: geoResult.longitude,
          };
        }
      } catch (err) {
        console.warn('Could not get location:', err);
      }

      // Call edge function
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-sos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            latitude: location?.latitude,
            longitude: location?.longitude,
            triggerMethod: method,
            locationAddress: location?.address,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger SOS');
      }

      setResult({
        success: true,
        message: data.message,
        alertId: data.alertId,
        contactsNotified: data.contactsNotified,
      });
      setStatus('sent');

      toast({
        title: '🚨 SOS Alert Sent!',
        description: `Emergency alerts sent to ${data.contactsNotified} contacts`,
      });

    } catch (err) {
      console.error('SOS error:', err);
      setStatus('error');
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send SOS',
      });

      toast({
        title: 'SOS Failed',
        description: 'Could not send emergency alerts. Please call emergency services directly.',
        variant: 'destructive',
      });
    }
  }, [user, playAlarm, vibrate, toast]);

  // Reset state
  const reset = useCallback(() => {
    cancelCountdown();
    setStatus('idle');
    setResult(null);
    stopAlarm();
  }, [cancelCountdown, stopAlarm]);

  // Handle shake detection trigger
  const handleShakeTrigger = useCallback(() => {
    if (sosEnabled && shakeDetectionEnabled && status === 'idle') {
      startCountdown();
    }
  }, [sosEnabled, shakeDetectionEnabled, status, startCountdown]);

  return {
    status,
    countdown,
    result,
    settings,
    startCountdown,
    cancelCountdown,
    triggerSOS,
    reset,
    handleShakeTrigger,
    isEnabled: sosEnabled,
    isLoading: userSettingsLoading,
  };
}
