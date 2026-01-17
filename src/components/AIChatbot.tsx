import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Send, Bot, User, Loader2, X, Minimize2, Maximize2, Volume2, VolumeX, Globe, Mic, MicOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type Language = 'english' | 'hindi' | 'marathi' | 'tamil';

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  welcomeMessage: string;
  placeholder: string;
  speechLang: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    code: 'english',
    name: 'English',
    nativeName: 'English',
    welcomeMessage: "Hi! I'm FraudGuard AI. Ask me about scams, suspicious UPI IDs, or how to stay safe online.",
    placeholder: "Ask about fraud prevention...",
    speechLang: 'en-IN'
  },
  {
    code: 'hindi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    welcomeMessage: "नमस्ते! मैं FraudGuard AI हूं। मुझसे धोखाधड़ी, संदिग्ध UPI ID, या ऑनलाइन सुरक्षा के बारे में पूछें।",
    placeholder: "धोखाधड़ी रोकथाम के बारे में पूछें...",
    speechLang: 'hi-IN'
  },
  {
    code: 'marathi',
    name: 'Marathi',
    nativeName: 'मराठी',
    welcomeMessage: "नमस्कार! मी FraudGuard AI आहे। फसवणूक, संशयास्पद UPI ID, किंवा ऑनलाइन सुरक्षेबद्दल मला विचारा.",
    placeholder: "फसवणूक प्रतिबंधाबद्दल विचारा...",
    speechLang: 'mr-IN'
  },
  {
    code: 'tamil',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    welcomeMessage: "வணக்கம்! நான் FraudGuard AI. மோசடி, சந்தேகத்திற்குரிய UPI ID அல்லது ஆன்லைன் பாதுகாப்பு பற்றி கேளுங்கள்.",
    placeholder: "மோசடி தடுப்பு பற்றி கேளுங்கள்...",
    speechLang: 'ta-IN'
  }
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

// Clean text for TTS - remove markdown and special characters
const cleanTextForSpeech = (text: string): string => {
  return text
    // Remove bullet points and list markers
    .replace(/^[*\-•]\s*/gm, '')
    .replace(/^\d+\.\s*/gm, '')
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/`(.*?)`/g, '$1') // code
    .replace(/#{1,6}\s*/g, '') // headers
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    // Remove extra whitespace
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
};

interface AIChatbotProps {
  inline?: boolean;
}

export function AIChatbot({ inline = false }: AIChatbotProps) {
  const { user } = useAuth();
  const { speak, stop, resume, isPlaying, isLoading: isSpeaking } = useTextToSpeech();
  const [isOpen, setIsOpen] = useState(inline); // Auto-open if inline
  const [isMinimized, setIsMinimized] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { isListening, transcript, startListening, stopListening, setTranscript } = useSpeechToText();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle voice transcript updates
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Handle voice auto-send if listening ends with content
  useEffect(() => {
    if (!isListening && transcript.trim() && !isLoading) {
      handleSend(transcript.trim());
      setTranscript('');
    }
  }, [isListening]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSelectLanguage = (lang: Language) => {
    setSelectedLanguage(lang);
    const langOption = LANGUAGES.find(l => l.code === lang);
    if (langOption) {
      setMessages([{
        role: 'assistant',
        content: langOption.welcomeMessage
      }]);
    }
    // Initialize audio context on first interaction
    resume();
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input.trim();
    if (!textToSend || isLoading || !selectedLanguage) return;

    // Resume audio context to ensure playback is allowed later
    resume();

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    if (!overrideInput) setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in again to use FraudGuard AI.');
      }

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          language: selectedLanguage
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const updateAssistantMessage = (content: string) => {
        assistantContent = content;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { role: 'assistant', content }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              updateAssistantMessage(assistantContent + content);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Save messages to database
      if (user) {
        await supabase.from('chat_messages').insert([
          { user_id: user.id, role: 'user', content: userMessage.content },
          { user_id: user.id, role: 'assistant', content: assistantContent },
        ]);
      }

      // Speak the response if voice is enabled
      if (voiceEnabled && assistantContent) {
        const cleanedText = cleanTextForSpeech(assistantContent);
        // Ensure context is resumed before speaking
        await resume();
        const langOption = LANGUAGES.find(l => l.code === selectedLanguage);
        speak(cleanedText, langOption?.speechLang);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessages: Record<Language, string> = {
        english: "Sorry, an error occurred. Please try again.",
        hindi: "क्षमा करें, एक त्रुटि हुई। कृपया पुनः प्रयास करें।",
        marathi: "क्षमस्व, एक त्रुटी आली. कृपया पुन्हा प्रयत्न करा.",
        tamil: "மன்னிக்கவும், பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்."
      };
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errorMessages[selectedLanguage || 'english'],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakMessage = async (content: string) => {
    if (isPlaying) {
      stop();
    } else {
      await resume();
      const cleanedText = cleanTextForSpeech(content);
      const langOption = LANGUAGES.find(l => l.code === selectedLanguage);
      speak(cleanedText, langOption?.speechLang);
    }
  };

  const getCurrentPlaceholder = () => {
    if (!selectedLanguage) return "Ask about fraud prevention...";
    return LANGUAGES.find(l => l.code === selectedLanguage)?.placeholder || "Ask about fraud prevention...";
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      const langOption = LANGUAGES.find(l => l.code === selectedLanguage);
      startListening(langOption?.speechLang || 'en-IN');
      if (isPlaying) stop();
    }
  };

  // Floating button for non-inline mode
  if (!inline && !isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg glow z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  // Language selection screen
  if (!selectedLanguage) {
    const containerClass = inline
      ? "w-full h-[600px]"
      : "fixed bottom-6 right-6 z-50 shadow-xl w-80";

    return (
      <Card className={containerClass}>
        <CardHeader className="flex flex-row items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center">
              <Globe className="h-4 w-4 text-primary-foreground" />
            </div>
            <CardTitle className="text-sm font-medium">Choose Language</CardTitle>
          </div>
          {!inline && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-3 text-center">
            अपनी भाषा चुनें • உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்
          </p>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => (
              <Button
                key={lang.code}
                variant="outline"
                className="flex flex-col h-auto py-3 hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleSelectLanguage(lang.code)}
              >
                <span className="text-sm font-medium">{lang.nativeName}</span>
                <span className="text-xs opacity-70">{lang.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main chat interface
  const chatContainerClass = inline
    ? `w-full h-full ${isMinimized ? 'h-14' : ''}`
    : `fixed bottom-6 right-6 z-50 shadow-xl transition-all duration-300 ${isMinimized ? 'w-80 h-14' : 'w-96 h-[500px]'}`;

  return (
    <Card className={chatContainerClass}>
      <CardHeader className="flex flex-row items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium">FraudGuard AI</CardTitle>
            <span className="text-xs text-muted-foreground">
              {LANGUAGES.find(l => l.code === selectedLanguage)?.nativeName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setSelectedLanguage(null);
              setMessages([]);
            }}
            title="Change language"
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${voiceEnabled ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => {
              if (isPlaying) stop();
              setVoiceEnabled(!voiceEnabled);
            }}
            title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          {!inline && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
          )}
          {!inline && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-[calc(100%-56px)]">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                      }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.role === 'assistant' && index > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 mt-1 opacity-60 hover:opacity-100"
                        onClick={() => handleSpeakMessage(message.content)}
                        disabled={isSpeaking}
                      >
                        {isPlaying ? (
                          <VolumeX className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-2 justify-start">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="bg-secondary rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={getCurrentPlaceholder()}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={handleMicClick}
                className={isListening ? "animate-pulse" : ""}
                disabled={isLoading}
              >
                {isListening ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
