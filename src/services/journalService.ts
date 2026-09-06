import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { JournalEntry } from '../types/journal';

/**
 * Creates a journal entry under users/{userId}/journals
 * Enforces that userId matches the authenticated user's UID.
 */
export async function createJournal(
  userId: string,
  entry: { conversation: string; summary: string }
): Promise<string> {
  if (!userId) throw new Error('User ID is required.');

  const journalsRef = collection(db, 'users', userId, 'journals');
  const newEntry = {
    conversation: entry.conversation,
    summary: entry.summary,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(journalsRef, newEntry);
  return docRef.id;
}

/**
 * Subscribes to journals for a specific user under users/{userId}/journals
 */
export function subscribeJournals(
  userId: string,
  onData: (journals: JournalEntry[]) => void,
  onError: (error: Error) => void
) {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const journalsRef = collection(db, 'users', userId, 'journals');
  const q = query(journalsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: JournalEntry[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<JournalEntry, 'id'>),
      }));
      onData(items);
    },
    (err) => {
      console.error('Firestore subscription error:', err);
      onError(err);
    }
  );
}

/**
 * Updates an existing journal entry under users/{userId}/journals/{journalId}
 */
export async function updateJournal(
  userId: string,
  journalId: string,
  updates: { conversation?: string; summary?: string }
): Promise<void> {
  if (!userId || !journalId) throw new Error('User ID and Journal ID are required.');

  const currentAuthUid = auth.currentUser?.uid;
  if (currentAuthUid && currentAuthUid !== userId) {
    throw new Error('Unauthorized: You can only update journal entries belonging to your account.');
  }

  const journalDocRef = doc(db, 'users', userId, 'journals', journalId);
  await updateDoc(journalDocRef, updates);
}

/**
 * Deletes a journal entry under users/{userId}/journals/{journalId}
 */
export async function deleteJournal(userId: string, journalId: string): Promise<void> {
  if (!userId || !journalId) throw new Error('User ID and Journal ID are required.');

  const currentAuthUid = auth.currentUser?.uid;
  if (currentAuthUid && currentAuthUid !== userId) {
    throw new Error('Unauthorized: You can only delete journal entries belonging to your account.');
  }

  const journalDocRef = doc(db, 'users', userId, 'journals', journalId);
  await deleteDoc(journalDocRef);
}

/**
 * Security Rule verification helper:
 * Deliberately attempts to query another user's collection path to verify
 * that Firestore Security Rules reject cross-user access at the backend layer.
 */
export async function testCrossUserAccess(foreignUserId: string): Promise<{ success: boolean; message: string }> {
  try {
    const foreignRef = collection(db, 'users', foreignUserId, 'journals');
    await getDocs(foreignRef);
    return {
      success: false,
      message: 'SECURITY VIOLATION: Cross-user query succeeded! Rules failed to block unauthorized read.',
    };
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
      return {
        success: true,
        message: 'BLOCKED BY SECURITY RULES: Firestore returned PERMISSION_DENIED as expected.',
      };
    }
    return {
      success: false,
      message: `Request failed with error: ${err.message}`,
    };
  }
}
