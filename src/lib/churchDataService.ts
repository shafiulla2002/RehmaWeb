/**
 * Rhema Church - Real-time Admin Church Data Service Adapter
 * Provides typed live Firestore subscriptions for administrative dashboard
 * without coupling directly to Firebase SDK internals.
 */

import { subscribeChurchCollection, fetchChurchCollection, fetchChurchDocument } from './firebaseCrud';

export const subscribeChurchData = subscribeChurchCollection;
export const fetchChurchData = fetchChurchCollection;
export const fetchChurchItem = fetchChurchDocument;
