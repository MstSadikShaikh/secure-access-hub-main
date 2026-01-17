export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { messages, language } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY || "AIzaSyDOZuJWYuihPD1P9LdWtpx29WCEJXbzr8s";

        // Gemini requires the conversation to start with 'user'. 
        // If our history starts with the assistant's welcome message, we should move it or skip it.
        let chatMessages = [...messages];
        if (chatMessages.length > 0 && chatMessages[0].role === 'assistant') {
            // If the first message is from the assistant, we'll prefix the first USER message with its context
            // Or simply skip it for the API call to avoid sequence errors.
            chatMessages = chatMessages.slice(1);
        }

        // Process messages into Gemini format
        const contents = chatMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // If after slicing we have no messages, something's wrong
        if (contents.length === 0) {
            return new Response(JSON.stringify({ error: 'No user message provided' }), { status: 400 });
        }

        // System instruction for Fraud Guard AI
        const systemInstruction = `You are Fraud Guard AI, an expert cybersecurity assistant specializing in UPI fraud prevention for Indian users. Respond in ${language || 'English'}. 
    Analyze suspicious UPI IDs, links, and scams. Provide verdicts (Safe/Suspicious/Dangerous) and recommended actions. 
    Use a structured format for alerts:
    🚨 VERDICT: [Safe / Suspicious / Dangerous]
    📋 WHY I FLAGGED THIS: [Reasons]
    ✅ RECOMMENDED ACTION: [Steps]`;

        // Using gemini-1.5-flash for speed and reliability
        const model = "gemini-1.5-flash";
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: contents,
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                },
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error status:', response.status, errorText);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body.getReader();
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });

                        // Gemini stream returns chunks that are often part of a JSON array like [{},{},...]
                        // For Edge runtime, we need to handle this manually since SSE doesn't natively parse Gemini stream
                        // The simplest way to handle Gemini stream without heavy libs:
                        let startBracket = buffer.indexOf('{"candidates"');
                        while (startBracket !== -1) {
                            let balance = 0;
                            let endBracket = -1;
                            for (let i = startBracket; i < buffer.length; i++) {
                                if (buffer[i] === '{') balance++;
                                if (buffer[i] === '}') balance--;
                                if (balance === 0) {
                                    endBracket = i;
                                    break;
                                }
                            }

                            if (endBracket !== -1) {
                                const jsonStr = buffer.slice(startBracket, endBracket + 1);
                                try {
                                    const json = JSON.parse(jsonStr);
                                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                                    if (text) {
                                        const sseData = JSON.stringify({
                                            choices: [{ delta: { content: text } }]
                                        });
                                        controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                                    }
                                } catch (e) {
                                    // Skip invalid JSON
                                }
                                buffer = buffer.slice(endBracket + 1);
                                startBracket = buffer.indexOf('{"candidates"');
                            } else {
                                break; // Wait for more data to complete the JSON object
                            }
                        }
                    }
                } catch (err) {
                    console.error('Stream processing error:', err);
                } finally {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
