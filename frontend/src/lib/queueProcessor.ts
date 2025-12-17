import { offlineQueue } from './offlineQueue';
import { api } from './api';
import type { OfflineQueueItem } from '@/types';

export async function processOfflineQueue(): Promise<void> {
  console.log('Processing offline queue...');

  const pending = await offlineQueue.getPending();
  if (pending.length === 0) {
    console.log('No pending operations in queue');
    return;
  }

  console.log(`Found ${pending.length} pending operations`);

  for (const item of pending) {
    try {
      await processQueueItem(item);
    } catch (error) {
      console.error(`Failed to process queue item ${item.id}:`, error);

      // Simple retry: mark as failed after 3 attempts
      if (item.retryCount >= 3) {
        await offlineQueue.updateStatus(item.id, 'failed');
        console.warn(`Queue item ${item.id} failed after 3 attempts`);
      } else {
        await offlineQueue.updateStatus(item.id, 'pending');
      }
    }
  }
}

async function processQueueItem(item: OfflineQueueItem): Promise<void> {
  await offlineQueue.updateStatus(item.id, 'processing');

  switch (item.operationType) {
    case 'qr_scan':
      await api.post('/connections/qr-scan', item.payload);
      break;

    case 'create_connection':
      await api.post('/connections', item.payload);
      break;

    case 'message':
      await api.post('/messages', item.payload);
      break;

    case 'rsvp':
      await api.post(`/sessions/${(item.payload as any).sessionId}/rsvp`, item.payload);
      break;

    case 'rsvp_delete':
      await api.delete(`/sessions/rsvps/${(item.payload as any).rsvpId}`);
      break;

    case 'connection_note':
      await api.patch(
        `/connections/${(item.payload as any).connectionId}`,
        { notes: (item.payload as any).notes }
      );
      break;

    case 'connection_update':
      await api.patch(
        `/connections/${(item.payload as any).connectionId}`,
        (item.payload as any).data
      );
      break;

    default:
      throw new Error(`Unknown operation type: ${item.operationType}`);
  }

  await offlineQueue.updateStatus(item.id, 'completed');
  await offlineQueue.remove(item.id);

  console.log(`Successfully processed: ${item.operationType}`);
}

export async function addToOfflineQueue(
  userId: string,
  operationType: OfflineQueueItem['operationType'],
  payload: Record<string, unknown>
): Promise<string> {
  return await offlineQueue.add(userId, operationType, payload);
}
