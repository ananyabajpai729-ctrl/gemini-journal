import { ChatMessage } from '../types/chat';

/**
 * Checks if a phrase is purely greeting, pleasantry, or small talk.
 */
function isSmallTalk(text: string): boolean {
  const t = text.toLowerCase().trim().replace(/^[^\w]+|[^\w]+$/g, '');
  if (!t || t.length < 2) return true;
  if (/^(hey|hi|hello|greetings|yo|sup)(\s+gemini)?$/i.test(t)) return true;
  if (
    /^(hey|hi|hello)?\s*(gemini[,!\s]*)?(how\s+are\s+you|how\s+r\s+u|how's\s+it\s+going|how\s+are\s+things|what's\s+up|good\s+(morning|afternoon|evening)|hope\s+you('re|\s+are)\s+(doing\s+)?well|how\s+is\s+your\s+day)(\s+doing)?(\s+today)?$/i.test(
      t
    )
  )
    return true;
  if (/^(i'm|i\s+am)\s+(good|fine|doing\s+well|great|okay|ok)$/i.test(t)) return true;
  return false;
}

/**
 * Cleans a substantive topic phrase into a concise 5-10 word title.
 */
function cleanTopic(phrase: string): string {
  let cleaned = phrase.trim();
  const prefixes = [
    /^(hey|hi|hello|gemini|good morning|good afternoon|good evening)[,!\s]*/i,
    /^(how are you( doing)?|how's it going|what's up)[,!\s]*/i,
    /^(can you|can we|could you|could we|please help me|help me|i want to|i'd like to|let's)\s+/i,
    /^(actually|so|basically|well)[,!\s]*/i,
    /^(i have been|i've been|i am|i'm)\s+(really\s+|just\s+)?/i,
    /^(talk about|reflect on|journal about|brainstorm|explore|write about|think about|discuss)\s+/i,
    /^(my thoughts on|reflections on|notes on|ideas for|plan for)\s+/i,
    /^(my\s+)/i,
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of prefixes) {
      if (prefix.test(cleaned)) {
        cleaned = cleaned.replace(prefix, '').trim();
        changed = true;
      }
    }
  }

  cleaned = cleaned.replace(/\s+(right now|next week|today|this week|lately|recently)$/i, '').trim();

  const words = cleaned.split(/\s+/);
  let summary = words.length <= 10 ? words.join(' ') : words.slice(0, 9).join(' ');
  summary = summary
    .replace(/[,;:\-–—\s]+$/, '')
    .replace(/\b(and|or|the|a|an|for|with|in|on|at|to|of|about)\s*$/i, '')
    .trim();

  if (!summary || summary.length < 3) {
    return 'Journal Reflection';
  }

  return summary.charAt(0).toUpperCase() + summary.slice(1);
}

/**
 * Generates a sensible short summary (approx 5-10 words) from the conversation locally,
 * ignoring greetings and small talk. Used as an intelligent fallback.
 */
export function generateSensibleTitle(messages: ChatMessage[]): string {
  if (!messages || messages.length === 0) {
    return 'Journal Reflection';
  }

  const candidatePhrases: string[] = [];

  for (const m of messages) {
    if (m.role !== 'user' || !m.content || !m.content.trim()) continue;

    // Split message into sentences or major clauses
    const clauses = m.content
      .split(/[\n.?!]+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    for (const clause of clauses) {
      if (!isSmallTalk(clause) && clause.length > 5) {
        candidatePhrases.push(clause);
      }
    }
  }

  if (candidatePhrases.length === 0) {
    return 'Journal Reflection';
  }

  return cleanTopic(candidatePhrases[0]);
}

/**
 * Formats multi-turn chat messages into a readable journal conversation transcript,
 * preserving both user messages and Gemini responses.
 */
export function formatChatTranscript(messages: ChatMessage[]): string {
  if (!messages || messages.length === 0) {
    return '';
  }

  return messages
    .filter((m) => m.content && m.content.trim().length > 0)
    .map((m) => {
      const speaker = m.role === 'user' ? 'Me' : 'Gemini';
      return `${speaker}: ${m.content.trim()}`;
    })
    .join('\n\n');
}
