import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Initialize AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioContextRef.current = new AudioContextClass();
    }

    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  const resume = useCallback(async () => {
    if (audioContextRef.current?.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (e) {
        console.error('Failed to resume AudioContext:', e);
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const speakNativeFallback = (text: string, langCode?: string) => {
    // Stop any current native speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (langCode) {
      utterance.lang = langCode;
    }

    // Attempt to find a good voice matching the language
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(langCode?.split('-')[0] || 'en'));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const speak = useCallback(async (text: string, langCode?: string) => {
    if (!text || isLoading) return;

    stop();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to use text-to-speech.');
      }

      // Ensure AudioContext is running
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        throw new Error('ElevenLabs failed, falling back to system voice');
      }

      const arrayBuffer = await response.arrayBuffer();

      if (!audioContextRef.current) {
        throw new Error('Audio playback not supported');
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
      };

      sourceRef.current = source;
      source.start(0);
      setIsPlaying(true);

    } catch (err) {
      console.warn('Premium TTS failed, using fallback:', err);
      speakNativeFallback(text, langCode);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, stop]);

  return {
    speak,
    stop: () => {
      stop();
      window.speechSynthesis.cancel();
    },
    resume,
    isPlaying,
    isLoading,
    error,
  };
}
