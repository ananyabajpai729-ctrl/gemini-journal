import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { JournalEntry } from '../types/journal';
import {
  createJournal,
  subscribeJournals,
  updateJournal,
  deleteJournal,
  testCrossUserAccess,
} from '../services/journalService';
import {
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  ShieldAlert,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Database,
  Lock,
} from 'lucide-react';

interface JournalStorageTesterProps {
  initialData?: { conversation: string; summary: string; timestamp?: number } | null;
  onClearInitialData?: () => void;
  initialConversation?: string;
  onClearInitialConversation?: () => void;
}

export const JournalStorageTester: React.FC<JournalStorageTesterProps> = ({
  initialData,
  onClearInitialData,
  initialConversation,
  onClearInitialConversation,
}) => {
  const { user } = useAuth();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New entry form state initialized directly to prevent blank unmount/remount issues
  const [conversation, setConversation] = useState(
    () => initialData?.conversation || initialConversation || ''
  );
  const [summary, setSummary] = useState(
    () => initialData?.summary || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastLoadedTimestampRef = useRef<number | null>(initialData?.timestamp ?? null);

  // Sync conversation and summary if a new transfer occurs
  useEffect(() => {
    if (initialData && initialData.conversation) {
      if (initialData.timestamp !== undefined && initialData.timestamp !== lastLoadedTimestampRef.current) {
        lastLoadedTimestampRef.current = initialData.timestamp;
        setConversation(initialData.conversation);
        setSummary(initialData.summary || '');
        setEditingId(null);
      } else if (!lastLoadedTimestampRef.current && (!conversation || !summary)) {
        lastLoadedTimestampRef.current = initialData.timestamp ?? Date.now();
        setConversation(initialData.conversation);
        setSummary(initialData.summary || '');
      }
    } else if (initialConversation && !initialData) {
      setConversation(initialConversation);
    }
  }, [initialData, initialConversation]);

  // Edit entry state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editConversation, setEditConversation] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Security test state
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingSecurity, setIsTestingSecurity] = useState(false);

  // Subscribe to authenticated user's journals
  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    const unsubscribe = subscribeJournals(
      user.uid,
      (data) => {
        setJournals(data);
        setLoading(false);
      },
      (err) => {
        setError(`Firestore Read Error: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    if (!conversation.trim() || !summary.trim()) {
      setError('Both Conversation and Summary fields are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setActionSuccess(null);

    try {
      await createJournal(user.uid, {
        conversation: conversation.trim(),
        summary: summary.trim(),
      });
      setConversation('');
      setSummary('');
      if (onClearInitialData) {
        onClearInitialData();
      }
      if (onClearInitialConversation) {
        onClearInitialConversation();
      }
      setActionSuccess('Journal entry successfully stored under users/' + user.uid + '/journals');
    } catch (err: any) {
      setError(`Failed to create entry: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (entry: JournalEntry) => {
    if (!entry.id) return;
    setEditingId(entry.id);
    setEditConversation(entry.conversation);
    setEditSummary(entry.summary);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !editingId) return;

    setIsUpdating(true);
    setError(null);
    setActionSuccess(null);

    try {
      await updateJournal(user.uid, editingId, {
        conversation: editConversation.trim(),
        summary: editSummary.trim(),
      });
      setEditingId(null);
      setActionSuccess('Journal entry updated successfully.');
    } catch (err: any) {
      setError(`Failed to update entry: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (journalId?: string) => {
    if (!user?.uid) {
      setError('You must be signed in to delete journal entries.');
      return;
    }
    if (!journalId) {
      setError('Cannot delete: Missing journal entry ID.');
      return;
    }
    if (deletingId) return;

    setDeletingId(journalId);
    setError(null);
    setActionSuccess(null);

    try {
      await deleteJournal(user.uid, journalId);
      if (editingId === journalId) {
        setEditingId(null);
        setEditConversation('');
        setEditSummary('');
      }
      setActionSuccess('Journal entry deleted from Firestore.');
    } catch (err: any) {
      setError(`Failed to delete entry: ${err.message || err}`);
    } finally {
      setDeletingId(null);
    }
  };

  const runSecurityRuleTest = async () => {
    setIsTestingSecurity(true);
    setTestResult(null);
    try {
      const fakeVictimUID = 'unauthorized_victim_uid_abc987';
      const result = await testCrossUserAccess(fakeVictimUID);
      setTestResult(result);
    } finally {
      setIsTestingSecurity(false);
    }
  };

  return (
    <div id="journal-storage-tester" className="space-y-8 w-full">
      {/* Path & Security Header Info */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-stone-700" />
              <h2 className="text-lg font-semibold text-stone-900 tracking-tight">
                Firestore Persistence & Per-User Isolation
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Data Model: <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-800 font-mono text-[11px]">users/{'{userId}'}/journals/{'{journalId}'}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-stone-100 text-stone-700 px-2.5 py-1 rounded-md border border-stone-200">
              UID: {user?.uid}
            </span>
          </div>
        </div>

        {/* Security Rule Verifier Action */}
        <div className="mt-4 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
          <div className="text-xs text-stone-600">
            <span className="font-medium text-stone-800">Security Rule Enforcement: </span>
            Firestore rules strictly mandate <code className="font-mono bg-stone-200/80 px-1 py-0.5 rounded">request.auth.uid == userId</code>.
          </div>
          <button
            id="test-security-rules-btn"
            type="button"
            onClick={runSecurityRuleTest}
            disabled={isTestingSecurity}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-800 hover:bg-stone-900 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-60 shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isTestingSecurity ? 'Testing Rules...' : 'Verify Cross-User Lockdown'}</span>
          </button>
        </div>

        {/* Security Test Result Banner */}
        {testResult && (
          <div
            id="security-test-result"
            className={`mt-3 p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {testResult.success ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{testResult.success ? 'Security Verified:' : 'Security Warning:'}</p>
              <p className="mt-0.5 font-mono text-[11px]">{testResult.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div id="storage-error-banner" className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div id="storage-success-banner" className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create / Edit Form Card */}
      <div id="journal-editor-form-card" className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-semibold text-stone-900 mb-4 flex items-center gap-2">
          {editingId ? (
            <>
              <Edit2 className="w-4 h-4 text-amber-600" />
              <span>Update Journal Entry</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 text-stone-700" />
              <span>Create New Journal Entry</span>
            </>
          )}
        </h3>

        {editingId ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Summary
              </label>
              <input
                id="edit-journal-summary"
                type="text"
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="Brief summary or title"
                className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Conversation
              </label>
              <textarea
                id="edit-journal-conversation"
                rows={4}
                value={editConversation}
                onChange={(e) => setEditConversation(e.target.value)}
                placeholder="Write your conversation thoughts or reflection..."
                className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 font-sans"
                required
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                id="save-update-btn"
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 bg-stone-900 text-white hover:bg-stone-800 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Save Updates'}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-4 py-2 border border-stone-300 hover:bg-stone-100 rounded-lg text-xs font-medium text-stone-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Summary
              </label>
              <input
                id="new-journal-summary"
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="E.g., Reflection on today's priorities and focus"
                className="w-full text-sm px-3.5 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Conversation
              </label>
              <textarea
                id="new-journal-conversation"
                rows={5}
                value={conversation}
                onChange={(e) => setConversation(e.target.value)}
                placeholder="Write your conversation thoughts or reflection..."
                className="w-full text-sm px-3.5 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 font-sans"
                required
              />
            </div>
            <div className="pt-1 flex items-center gap-3">
              <button
                id="create-journal-btn"
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving to Firestore...' : 'Store Journal Entry'}</span>
              </button>
              {(conversation || summary) && (
                <button
                  id="reset-journal-form-btn"
                  type="button"
                  onClick={() => {
                    setConversation('');
                    setSummary('');
                    if (onClearInitialData) onClearInitialData();
                    if (onClearInitialConversation) onClearInitialConversation();
                  }}
                  className="px-3 py-2 border border-stone-200 hover:bg-stone-100 rounded-lg text-xs font-medium text-stone-600 transition-colors cursor-pointer"
                >
                  Reset Form
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Entries List (Read, Update, Delete) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-stone-700" />
            <span>Your Stored Journal Entries ({journals.length})</span>
          </h3>
          <span className="text-xs text-stone-500">Live synchronized via Firestore Snapshot</span>
        </div>

        {loading ? (
          <div className="p-8 text-center bg-white border border-stone-200 rounded-2xl text-xs text-stone-500">
            Loading your journals from Firestore...
          </div>
        ) : journals.length === 0 ? (
          <div className="p-10 text-center bg-white border border-dashed border-stone-300 rounded-2xl">
            <p className="text-sm font-medium text-stone-700">No journal entries yet</p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Add your first entry above or converse with Gemini to explore and store thoughts.
            </p>
          </div>
        ) : (
          <div className="grid gap-3.5">
            {journals.map((entry) => (
              <div
                key={entry.id}
                id={`journal-entry-${entry.id}`}
                className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs hover:border-stone-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                  <h4 className="font-semibold text-stone-900 text-sm">{entry.summary}</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[11px] text-stone-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        id={`edit-btn-${entry.id}`}
                        type="button"
                        onClick={() => startEdit(entry)}
                        className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded transition-colors"
                        title="Edit Entry"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`delete-btn-${entry.id}`}
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer disabled:opacity-40"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <p className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
                    {entry.conversation}
                  </p>
                </div>

                <div className="mt-3 pt-2 text-[10px] font-mono text-stone-400 border-t border-stone-50 flex items-center justify-between">
                  <span>Document ID: {entry.id}</span>
                  <span>Path: users/{user?.uid}/journals/{entry.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
