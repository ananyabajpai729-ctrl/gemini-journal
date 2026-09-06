import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, BookOpen, User, Sparkles, Database } from 'lucide-react';
import { JournalStorageTester } from './JournalStorageTester';
import { JournalChat } from './JournalChat';

export const AppShell: React.FC = () => {
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'storage'>('chat');
  const [transferredData, setTransferredData] = useState<{
    conversation: string;
    summary: string;
    timestamp: number;
  } | null>(null);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleTransferToStorage = (data: { conversation: string; summary: string }) => {
    setTransferredData({
      conversation: data.conversation,
      summary: data.summary,
      timestamp: Date.now(),
    });
    setActiveTab('storage');
  };

  return (
    <div id="authenticated-app-shell" className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      {/* Top Application Bar */}
      <header id="app-shell-navbar" className="w-full bg-white border-b border-stone-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center font-medium shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-stone-900 tracking-tight text-base">Personal Gemini Journal</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                Private Session
              </span>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div id="user-profile-badge" className="flex items-center gap-2.5 sm:gap-3">
              {user?.photoURL ? (
                <img
                  id="user-avatar-img"
                  src={user.photoURL}
                  alt={user.displayName || 'User profile'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-stone-200 object-cover"
                />
              ) : (
                <div
                  id="user-avatar-placeholder"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-semibold text-xs"
                >
                  <User className="w-4 h-4" />
                </div>
              )}

              <div className="hidden md:flex flex-col text-left">
                <span id="user-display-name" className="text-sm font-medium text-stone-900 leading-tight">
                  {user?.displayName || 'Authenticated User'}
                </span>
                <span id="user-email-text" className="text-xs text-stone-500 truncate max-w-[170px]">
                  {user?.email}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              id="logout-btn"
              type="button"
              onClick={handleSignOut}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{loggingOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <div className="border-b border-stone-200 bg-white/60 backdrop-blur-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-6">
          <button
            id="tab-chat-btn"
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`py-3 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Gemini Brainstorming</span>
          </button>
          <button
            id="tab-storage-btn"
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`py-3 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'storage'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-stone-600" />
            <span>Firestore Journal Storage</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Canvas */}
      <main id="app-shell-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col">
        {activeTab === 'chat' ? (
          <JournalChat onSaveAsJournal={handleTransferToStorage} />
        ) : (
          <JournalStorageTester
            initialData={transferredData}
            onClearInitialData={() => setTransferredData(null)}
          />
        )}
      </main>

      {/* Footer */}
      <footer id="app-shell-footer" className="border-t border-stone-200 bg-white py-4 px-6 text-center text-xs text-stone-500">
        Personal Gemini Journal • Server-Side Gemini 3.8 Flash • Per-UID Firestore Isolation
      </footer>
    </div>
  );
};
