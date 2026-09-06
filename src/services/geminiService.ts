import { ChatMessage } from '../types/chat';

/**
 * Sends a chat message along with conversation history to the server-side
 * Gemini proxy endpoint. Requires an authenticated Firebase ID token.
 */
export async function sendChatMessage(
  idToken: string,
  userMessage: string,
  history: ChatMessage[]
): Promise<string> {
  if (!idToken) {
    throw new Error('Authentication required to converse with Gemini.');
  }

  // Format relevant history for the server
  const sanitizedHistory = history.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      userMessage,
      messages: sanitizedHistory,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Failed to receive response from Gemini.');
  }

  return data.text;
}

/**
 * Requests a concise 5-10 word journal summary/topic for the conversation
 * via the server-side Gemini endpoint.
 */
export async function generateJournalSummary(
  idToken: string,
  messages: ChatMessage[]
): Promise<string> {
  if (!idToken) {
    throw new Error('Authentication required to generate summary.');
  }

  const sanitizedMessages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const response = await fetch('/api/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      messages: sanitizedMessages,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Failed to generate summary.');
  }

  return data.summary;
}

