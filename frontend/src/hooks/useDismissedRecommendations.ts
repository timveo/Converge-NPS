import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'dismissed-recommendations';

interface DismissedData {
  [key: string]: string; // recommendation id -> date dismissed
}

export const useDismissedRecommendations = (category: string) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: DismissedData = JSON.parse(stored);
        const today = new Date().toDateString();
        // Only keep dismissals from today
        const todayDismissals = Object.entries(data)
          .filter(([_, date]) => date === today)
          .map(([id]) => id)
          .filter(id => id.startsWith(`${category}:`));
        setDismissedIds(new Set(todayDismissals.map(id => id.replace(`${category}:`, ''))));
      } catch {
        setDismissedIds(new Set());
      }
    }
  }, [category]);

  const dismiss = useCallback((id: string) => {
    const fullId = `${category}:${id}`;
    const today = new Date().toDateString();

    const stored = localStorage.getItem(STORAGE_KEY);
    let data: DismissedData = {};

    if (stored) {
      try {
        data = JSON.parse(stored);
        // Clean old dismissals
        Object.keys(data).forEach(key => {
          if (data[key] !== today) delete data[key];
        });
      } catch {
        data = {};
      }
    }

    data[fullId] = today;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setDismissedIds(prev => new Set([...prev, id]));
  }, [category]);

  const isDismissed = useCallback((id: string) => dismissedIds.has(id), [dismissedIds]);

  return { dismiss, isDismissed, dismissedIds };
};
