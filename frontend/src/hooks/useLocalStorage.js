import { useEffect, useRef, useState } from 'react';

/**
 * Persist React state to localStorage under a namespaced key.
 * Falls back gracefully if localStorage is unavailable (e.g. private mode).
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch (err) {
      console.warn(`Could not read localStorage key "${key}":`, err);
      return initialValue;
    }
  });

  const isFirstRun = useRef(true);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`Could not write localStorage key "${key}":`, err);
    }
  }, [key, value]);

  return [value, setValue];
}
