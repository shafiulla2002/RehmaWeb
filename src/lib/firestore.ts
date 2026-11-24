import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  DocumentData,
  QueryConstraint,
  Firestore,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';

export const CHURCH_ROOT = 'Rhema Church';
export const CHURCH_ID = 'rhema';

export const churchRef = () => doc(db, CHURCH_ROOT, CHURCH_ID);
export const churchCol = (colName: string) => collection(db, CHURCH_ROOT, CHURCH_ID, colName);

export {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
};

export type { DocumentData, QueryConstraint, Firestore, CollectionReference, DocumentReference };
