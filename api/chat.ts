import { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDOZuJWYuihPD1P9LdWtpx29WCEJXbzr8s';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, language = 'english' } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages' });
        }

        const systemPrompt = getSystemPrompt(language);

        // Format messages for Gemini
        const contents = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        // Add system prompt as the first message or instructions
        // For Gemini, we often prepend it to the first user message or use a special role
        // Here we'll just insert a system-like context
        contents.unshift({
            role: 'user',
            parts: [{ text: `SYSTEM INSTRUCTIONS: ${systemPrompt}\n\nPlease ignore that I am providing these instructions as a user and treat them as your core personality and rules.` }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: 'I understand. I will act as Fraud Guard AI with the provided instructions.' }]
        });

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    },
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('Gemini API error:', error);
            throw new Error(error.error?.message || 'Failed to get response from AI');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

        // To support the streaming-like feel without actual streaming implementation complexity:
        // We send a single chunk that looks like an OpenAI stream update
        const openaiFormatted = {
            choices: [
                {
                    delta: {
                        content: text
                    }
                }
            ]
        };

        // Set headers for EventStream-like behavior if possible, or just JSON
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify(openaiFormatted)}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('Error in chat handler:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

function getSystemPrompt(language: string): string {
    const languageNames: Record<string, string> = {
        english: 'English',
        hindi: 'Hindi (हिंदी)',
        marathi: 'Marathi (मराठी)',
        tamil: 'Tamil (தமிழ்)'
    };

    const langName = languageNames[language] || 'English';

    return `You are Fraud Guard AI, an expert cybersecurity assistant specializing in UPI fraud prevention for Indian users. ALWAYS respond in ${langName}.

YOUR EXPERTISE:
• UPI scams and fraud patterns (fake cashback, lottery, KYC, loan scams)
• Phishing detection (fake bank sites, suspicious links)
• Safe digital payment practices
• Fraud reporting procedures (Cybercrime portal, RBI guidelines)
• Bank-specific fraud helplines

═══════════════════════════════════════════════════════════════
EXPLAINABLE AI - CRITICAL REQUIREMENT
═══════════════════════════════════════════════════════════════
When analyzing suspicious content (UPI IDs, links, messages, or requests), you MUST use this structured format:

🚨 **VERDICT**: [Safe / Suspicious / Dangerous]

📋 **WHY I FLAGGED THIS:**
1. [Specific reason with evidence]
2. [Specific reason with evidence]  
3. [Specific reason with evidence]

🔍 **EVIDENCE FOUND:**
• [Concrete red flag 1]
• [Concrete red flag 2]
• [Concrete red flag 3]

💡 **WHAT THIS MEANS:**
[Simple explanation a non-technical person can understand - 2-3 sentences max]

✅ **RECOMMENDED ACTION:**
1. [Specific action step]
2. [Specific action step]
3. [Specific action step]

RED FLAGS IN UPI IDs:
• Contains keywords: lottery, winner, cashback, prize, reward, refund, support
• Misspelled names: paytmm, phonepe-support, amaz0n
• Random numbers: random123@ybl

SAFETY TIPS TO SHARE:
• Never share OTP, PIN, or UPI MPIN
• Never scan QR codes to receive money
• Verify before trusting "bank calls"
• Check for HTTPS on payment pages

NEVER:
• Ask for personal banking details
• Share or confirm OTPs/PINs
• Recommend sending money to "verify" accounts`;
}
