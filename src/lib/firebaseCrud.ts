/**
 * Rhema Church - Reusable Firebase Firestore Integration Services
 * 
 * Standardized single-church Firestore CRUD, subscription, and path utilities.
 * Ensures consistent canonical collection referencing ('Rhema Church/rhema'),
 * timestamp injection, error normalization, and mobile app schema compatibility.
 */

import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  serverTimestamp,
  QueryConstraint,
  DocumentData,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';

export const CANONICAL_CHURCH_COLLECTION = 'Rhema Church';
export const CANONICAL_CHURCH_ID = 'rhema';

/**
 * Returns a strongly-typed CollectionReference scoped to Rhema Church.
 * Path: `Rhema Church/rhema/{subcollection}`
 */
export function getChurchCollection(subcollection: string): CollectionReference<DocumentData> {
  return collection(db, CANONICAL_CHURCH_COLLECTION, CANONICAL_CHURCH_ID, subcollection);
}

/**
 * Returns a strongly-typed DocumentReference scoped to Rhema Church.
 * Path: `Rhema Church/rhema/{subcollection}/{docId}`
 */
export function getChurchDocument(subcollection: string, docId: string): DocumentReference<DocumentData> {
  return doc(db, CANONICAL_CHURCH_COLLECTION, CANONICAL_CHURCH_ID, subcollection, docId);
}

/**
 * Fetches all documents from a church subcollection with optional query constraints.
 */
export async function fetchChurchCollection<T>(
  subcollection: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  try {
    const colRef = getChurchCollection(subcollection);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : query(colRef);
    const snapshot = await getDocs(q);
    const items: T[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...d.data() } as T);
    });
    return items;
  } catch (error) {
    console.error(`[FirebaseService] Error fetching collection "${subcollection}":`, error);
    throw error;
  }
}

/**
 * Fetches a single document from a church subcollection by ID.
 */
export async function fetchChurchDocument<T>(
  subcollection: string,
  docId: string
): Promise<T | null> {
  try {
    const docRef = getChurchDocument(subcollection, docId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as T;
  } catch (error) {
    console.error(`[FirebaseService] Error fetching document "${subcollection}/${docId}":`, error);
    throw error;
  }
}

/**
 * Subscribes to real-time updates for a church subcollection.
 * Returns an unsubscribe callback for clean component unmounts.
 */
export function subscribeChurchCollection<T>(
  subcollection: string,
  onUpdate: (items: T[]) => void,
  onError?: (error: any) => void,
  constraints: QueryConstraint[] = []
): () => void {
  const colRef = getChurchCollection(subcollection);
  const q = constraints.length > 0 ? query(colRef, ...constraints) : query(colRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as T);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn(`[FirebaseService] onSnapshot listener error on "${subcollection}":`, error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribes to real-time updates for a single church document.
 */
export function subscribeChurchDocument<T>(
  subcollection: string,
  docId: string,
  onUpdate: (item: T | null) => void,
  onError?: (error: any) => void
): () => void {
  const docRef = getChurchDocument(subcollection, docId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
      } else {
        onUpdate({ id: snapshot.id, ...snapshot.data() } as T);
      }
    },
    (error) => {
      console.warn(`[FirebaseService] onSnapshot doc listener error on "${subcollection}/${docId}":`, error);
      if (onError) onError(error);
    }
  );
}

/**
 * Creates or overwrites a document in a church subcollection.
 * Injects `createdAt` and `updatedAt` ISO/server timestamps automatically.
 */
export async function createChurchDocument<T extends Record<string, any>>(
  subcollection: string,
  data: T,
  customDocId?: string
): Promise<string> {
  try {
    const colRef = getChurchCollection(subcollection);
    const docRef = customDocId ? doc(colRef, customDocId) : doc(colRef);
    const nowIso = new Date().toISOString();

    const payload = {
      ...data,
      createdAt: data.createdAt || nowIso,
      updatedAt: nowIso,
    };

    await setDoc(docRef, payload, { merge: true });
    return docRef.id;
  } catch (error) {
    console.error(`[FirebaseService] Error creating document in "${subcollection}":`, error);
    throw error;
  }
}

/**
 * Updates an existing document in a church subcollection.
 * Automatically injects `updatedAt` ISO timestamp.
 */
export async function updateChurchDocument<T extends Record<string, any>>(
  subcollection: string,
  docId: string,
  updates: Partial<T>
): Promise<void> {
  try {
    const docRef = getChurchDocument(subcollection, docId);
    const nowIso = new Date().toISOString();

    const payload = {
      ...updates,
      updatedAt: nowIso,
    };

    await updateDoc(docRef, payload as DocumentData);
  } catch (error) {
    console.error(`[FirebaseService] Error updating document "${subcollection}/${docId}":`, error);
    throw error;
  }
}

/**
 * Deletes a document from a church subcollection.
 */
export async function deleteChurchDocument(
  subcollection: string,
  docId: string
): Promise<void> {
  try {
    const docRef = getChurchDocument(subcollection, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`[FirebaseService] Error deleting document "${subcollection}/${docId}":`, error);
    throw error;
  }
}

/**
 * Root Church Document Reference
 * Path: `Rhema Church/rhema`
 */
export function getChurchRootDocument(): DocumentReference<DocumentData> {
  return doc(db, CANONICAL_CHURCH_COLLECTION, CANONICAL_CHURCH_ID);
}

/**
 * Fetches the canonical church profile document.
 */
export async function fetchChurchProfile<T = any>(): Promise<T | null> {
  try {
    const rootRef = getChurchRootDocument();
    const snap = await getDoc(rootRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as T;
  } catch (error) {
    console.error('[FirebaseService] Error fetching church root document:', error);
    throw error;
  }
}

/**
 * Subscribes to real-time updates for the canonical church root document.
 */
export function subscribeChurchProfile<T = any>(
  onUpdate: (item: T | null) => void,
  onError?: (err: any) => void
): () => void {
  const rootRef = getChurchRootDocument();
  return onSnapshot(
    rootRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
      } else {
        onUpdate({ id: snap.id, ...snap.data() } as T);
      }
    },
    (err) => {
      console.warn('[FirebaseService] onSnapshot error on root church doc:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Updates the canonical church profile document.
 */
export async function updateChurchProfile<T extends Record<string, any>>(updates: Partial<T>): Promise<void> {
  try {
    const rootRef = getChurchRootDocument();
    const nowIso = new Date().toISOString();
    await setDoc(rootRef, { ...updates, updatedAt: nowIso }, { merge: true });
  } catch (error) {
    console.error('[FirebaseService] Error updating church root document:', error);
    throw error;
  }
}

