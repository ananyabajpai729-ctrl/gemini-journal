import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChatMessage } from '../types/chat';
import { sendChatMessage, generateJournalSummary } from '../services/geminiService';
import { formatChatTranscript, generateSensibleTitle } from '../utils/transcriptHelper';
import {
  Send,
  Sparkles,
  User,
  AlertCircle,
  RotateCcw,
  Bot,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface JournalChatProps {
  onSaveAsJournal?: (data: { conversation: string; summary: string }) => void;
}

export const JournalChat: React.FC<JournalChatProps> = ({ onSaveAsJournal }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading || !user) return;

    const userText = input.trim();
    setInput('');
    setError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Obtain authentic, cryptographic ID token for server-side authorization
      const idToken = await user.getIdToken();
      const botResponseText = await sendChatMessage(idToken, userText, messages);

      const botMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: botResponseText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to Gemini. Please try again.');
    } finally {
      setLoading(false);
      // Refocus textarea on desktop
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearThread = () => {
    if (messages.length === 0) return;
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    setMessages([]);
    setError(null);
    setConfirmClear(false);
  };

  const handleTransferToJournal = async () => {
    if (messages.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    setError(null);

    const conversationLog = formatChatTranscript(messages);
    let summaryText = '';

    try {
      if (user) {
        const idToken = await user.getIdToken();
        summaryText = await generateJournalSummary(idToken, messages);
      }
    } catch (err: any) {
      console.warn('[JournalChat] Server-side summary generation failed, falling back to local extractor:', err);
    }

    if (!summaryText || !summaryText.trim()) {
      summaryText = generateSensibleTitle(messages);
    }

    setIsSummarizing(false);

    if (onSaveAsJournal) {
      onSaveAsJournal({
        conversation: conversationLog,
        summary: summaryText.trim(),
      });
    }
  };

  return (
    <div id="gemini-journal-chat" className="flex flex-col h-[650px] bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Chat Header */}
      <div id="chat-header" className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 border border-amber-200/80 flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-stone-900">Gemini Brainstorming Partner</h3>
              <span className="text-[10px] bg-stone-200/70 text-stone-700 font-medium px-2 py-0.5 rounded-full">
                Multi-Turn
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Private journaling reflection powered by high-availability server-side Gemini
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              {onSaveAsJournal && (
                <button
                  id="save-to-journal-btn"
                  type="button"
                  onClick={handleTransferToJournal}
                  disabled={isSummarizing || loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSummarizing ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-300" />
                      <span>Generating Summary...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Send to Journal Form</span>
                    </>
                  )}
                </button>
              )}
              <button
                id="clear-thread-btn"
                type="button"
                onClick={handleClearThread}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  confirmClear
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/60'
                }`}
                title={confirmClear ? 'Click again to confirm clearing chat' : 'Clear conversation'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {confirmClear && <span>Confirm clear?</span>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div id="chat-messages-container" className="flex-1 overflow-y-auto p-6 space-y-5 bg-stone-50/30">
        {messages.length === 0 ? (
          <div id="chat-empty-state" className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mb-3 border border-stone-200/60">
              <Bot className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-stone-900 mb-1">Begin Your Reflection</h4>
            <p className="text-xs text-stone-500 leading-relaxed mb-6">
              Share a thought, dilemma, or idea you're working through. Gemini maintains multi-turn context throughout your session.
            </p>

            <div className="grid gap-2 w-full text-left">
              {[
                "What perspective am I missing on my current workload?",
                "Help me unpack a decision I've been postponing this week.",
                "Let's brainstorm creative ways to structure my morning routines.",
              ].map((starter, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInput(starter)}
                  className="text-xs text-stone-600 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-xl px-3.5 py-2.5 transition-colors text-left"
                >
                  "{starter}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              id={`chat-msg-${msg.id}`}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              {msg.role === 'user' ? (
                user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Me'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-stone-200 object-cover shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-stone-800 text-stone-100 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 text-amber-900 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-stone-900 text-stone-100 rounded-tr-xs'
                    : 'bg-white border border-stone-200 text-stone-800 shadow-2xs rounded-tl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span
                    className={`font-medium text-[11px] ${
                      msg.role === 'user' ? 'text-stone-300' : 'text-stone-500'
                    }`}
                  >
                    {msg.role === 'user' ? 'You' : 'Gemini'}
                  </span>
                  <span
                    className={`text-[10px] ${
                      msg.role === 'user' ? 'text-stone-400' : 'text-stone-400'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {loading && (
          <div id="gemini-generating-indicator" className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 text-amber-900 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin text-amber-700" />
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs text-stone-600 text-xs flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
              <span className="font-medium text-stone-600">Gemini is reflecting...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Notice */}
      {error && (
        <div id="chat-error-banner" className="mx-6 mb-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-800 text-xs font-semibold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Input Form */}
      <div id="chat-input-area" className="p-4 bg-white border-t border-stone-200">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2.5">
          <div className="flex-1 relative">
            <textarea
              id="gemini-chat-input"
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reflection or question (Shift+Enter for new line)..."
              disabled={loading}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-400 focus:bg-white resize-none text-stone-900 placeholder:text-stone-400"
            />
          </div>
          <button
            id="send-message-btn"
            type="submit"
            disabled={loading || !input.trim()}
            className="h-10 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500 px-1">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-stone-400" />
            <span>Server-side encrypted credential proxy</span>
          </div>
          <span>Shift + Enter for new line</span>
        </div>
      </div>
    </div>
  );
};
