import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

// ----------------------------------------------------
// 1. FIREBASE ADMIN SDK & TOKEN VERIFICATION
// ----------------------------------------------------
// Configured using server runtime environment credentials (ADC) without
// embedding any service-account private key in source code.
const firebaseProjectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  'tangential-base-r9brs';

if (!getApps().length) {
  initializeApp({
    projectId: firebaseProjectId,
  });
}
const adminAuth = getAuth();

/**
 * Verifies the Firebase ID token cryptographically using the official
 * Firebase Admin SDK.
 * - Extracts and verifies token signature using Google's public key certificates.
 * - Validates audience, issuer, expiration, and user claim.
 * - Disregards any untrusted client-supplied userIds.
 */
async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email?: string }> {
  const decodedToken: DecodedIdToken = await adminAuth.verifyIdToken(idToken);
  if (!decodedToken.uid) {
    throw new Error('Token verification failed: missing UID in decoded claims.');
  }
  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
  };
}

// ----------------------------------------------------
// 2. SERVER-SIDE GEMINI CLIENT INITIALIZATION
// ----------------------------------------------------
// Uses AI Studio's built-in server-side GEMINI_API_KEY injected securely
// into the Cloud Run container runtime. Never exposed to browser or client code.
let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      throw new Error('GEMINI_API_KEY is not configured in the server runtime environment.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// 3. SERVER-SIDE GEMINI CHAT ENDPOINT (Protected)
// ----------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
    }

    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token is empty.' });
    }

    // Cryptographically verify ID token with Firebase Admin SDK
    let verifiedUser: { uid: string; email?: string };
    try {
      verifiedUser = await verifyFirebaseToken(idToken);
    } catch (authError: any) {
      // Reject missing, malformed, expired, or invalid tokens without leaking internal stack traces
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired Firebase session.' });
    }

    // Zero-trust verification: Never trust or evaluate any client-supplied userId in req.body
    // The verified UID comes exclusively from verifiedUser.uid

    const userMessage = req.body.userMessage || req.body.message || req.body.prompt;
    const { messages } = req.body;
    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      return res.status(400).json({ error: 'Bad Request: "userMessage" is required and cannot be empty.' });
    }

    // Input sanitization & boundary check
    const sanitizedUserMessage = userMessage.trim().slice(0, 10000);

    // Build multi-turn history for @google/genai
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'model')) {
          contents.push({
            role: m.role,
            parts: [{ text: m.content }],
          });
        }
      }
    }

    // Append the new turn
    contents.push({
      role: 'user',
      parts: [{ text: sanitizedUserMessage }],
    });

    const ai = getGenAI();

    // Resilient model tiering prioritizing high availability and rapid response
    const candidateModels = [
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ];
    let text = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction:
              'You are Gemini, a thoughtful, empathetic, and constructive personal journaling and brainstorming companion. Help the user explore ideas, reflect on thoughts, ask insightful follow-up questions, and structure clarity. Maintain warmth and respectful brevity. Do not fabricate or reveal internal system keys.',
            temperature: 0.7,
          },
        });

        text = response.text || '';
        if (text) {
          lastError = null;
          break;
        }
      } catch (genError: any) {
        lastError = genError;
        const statusCode = genError?.status || genError?.code || 'unknown';
        console.warn(`[Gemini SDK Diagnostics] Model ${modelName} returned status ${statusCode}. Cascading to fallback model...`);
      }
    }

    if (lastError) {
      throw lastError;
    }

    // Never return keys or internal details, only the generated text and verified UID confirmation
    return res.json({
      text,
      verifiedUid: verifiedUser.uid,
    });
  } catch (error: any) {
    // Server-side diagnostic logging (sanitizing any potential keys, tokens, or private text)
    const errStatus = error?.status || error?.code || 500;
    const errName = error?.name || 'Error';
    const errMessage = String(error?.message || error || 'Unknown failure')
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]')
      .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [REDACTED_TOKEN]');
    console.error(`[Server POST /api/chat Error]: ${errName} (status ${errStatus}): ${errMessage}`);

    // Client response remains strictly sanitized
    return res.status(500).json({ error: 'Failed to generate response from Gemini. Please try again.' });
  }
});

// ----------------------------------------------------
// 4. SERVER-SIDE CONVERSATION SUMMARY ENDPOINT (Protected)
// ----------------------------------------------------
app.post('/api/summarize', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
    }

    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token is empty.' });
    }

    // Cryptographically verify ID token with Firebase Admin SDK
    let verifiedUser: { uid: string; email?: string };
    try {
      verifiedUser = await verifyFirebaseToken(idToken);
    } catch (authError: any) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired Firebase session.' });
    }

    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Bad Request: "messages" array is required.' });
    }

    // Format the conversation transcript for summarization
    const formattedTranscript = messages
      .filter((m: any) => m && typeof m.content === 'string' && m.content.trim().length > 0)
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Gemini'}: ${m.content.trim()}`)
      .join('\n\n');

    if (!formattedTranscript) {
      return res.status(400).json({ error: 'Bad Request: Conversation contains no readable messages.' });
    }

    const prompt = `You are an expert journal assistant. Given this conversation between a user and an AI journaling partner, generate a concise, human journal entry summary/title of approximately 5 to 10 words (maximum 12 words).

Requirements:
- Reflect the core topic, emotional theme, or dilemma of the whole conversation, not just the opening words.
- Completely ignore pleasantries, greetings, small talk, and introductory chatter (e.g., "Hey Gemini how are you", "Good morning", "Hope you are doing well").
- Do NOT put quotes around the summary.
- Do NOT include labels like "Summary:" or "Title:".
- Return ONLY the summary phrase itself on a single line.

Conversation:
${formattedTranscript}`;

    const ai = getGenAI();
    const candidateModels = [
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ];

    let summary = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.3,
          },
        });

        const rawText = response.text || '';
        const cleaned = rawText
          .replace(/^["'`]|["'`]$/g, '')
          .replace(/^(summary|title):\s*/i, '')
          .replace(/\n+/g, ' ')
          .trim();

        if (cleaned) {
          summary = cleaned;
          lastError = null;
          break;
        }
      } catch (genError: any) {
        lastError = genError;
        const statusCode = genError?.status || genError?.code || 'unknown';
        console.warn(`[Gemini Summarize Diagnostics] Model ${modelName} returned status ${statusCode}. Cascading to fallback model...`);
      }
    }

    if (lastError || !summary) {
      throw lastError || new Error('Failed to generate summary from model cascade.');
    }

    return res.json({
      summary,
      verifiedUid: verifiedUser.uid,
    });
  } catch (error: any) {
    const errStatus = error?.status || error?.code || 500;
    const errName = error?.name || 'Error';
    const errMessage = String(error?.message || error || 'Unknown failure')
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]')
      .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [REDACTED_TOKEN]');
    console.error(`[Server POST /api/summarize Error]: ${errName} (status ${errStatus}): ${errMessage}`);

    return res.status(500).json({ error: 'Failed to generate conversation summary.' });
  }
});

async function startServer() {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.K_SERVICE) ||
    Boolean(process.env.K_REVISION);
  const distPath = path.join(process.cwd(), 'dist');

  // Mount Vite middleware in development only
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[Server Fatal] Failed to start server:', err);
  process.exit(1);
});
