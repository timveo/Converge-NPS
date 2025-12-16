import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

// Shared state across all hook instances to avoid duplicate polling
let globalUnreadCount = 0;
const listeners: Set<(count: number) => void> = new Set();
let pollingInterval: ReturnType<typeof setInterval> | null = null;

const fetchUnreadCount = async () => {
  try {
    const response = await api.get<{ count: number }>('/messages/unread-count');
    globalUnreadCount = response.count;
    listeners.forEach(listener => listener(globalUnreadCount));
  } catch (error) {
    console.error('Failed to fetch unread count', error);
  }
};

const startPolling = () => {
  if (pollingInterval) return;

  // Fetch immediately
  fetchUnreadCount();

  // Poll every 30 seconds
  pollingInterval = setInterval(fetchUnreadCount, 30000);
};

const stopPolling = () => {
  if (pollingInterval && listeners.size === 0) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

/**
 * Hook to get unread message count with shared polling across components
 * Uses a singleton pattern to avoid duplicate API calls
 */
export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(globalUnreadCount);

  useEffect(() => {
    // Add this component's setter to listeners
    listeners.add(setUnreadCount);

    // Start polling if this is the first listener
    if (listeners.size === 1) {
      startPolling();
    } else {
      // If polling is already running, set initial value
      setUnreadCount(globalUnreadCount);
    }

    return () => {
      listeners.delete(setUnreadCount);
      stopPolling();
    };
  }, []);

  // Function to manually refresh the count (e.g., after reading messages)
  const refresh = () => {
    fetchUnreadCount();
  };

  return { unreadCount, refresh };
}
