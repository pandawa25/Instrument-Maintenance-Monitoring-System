import { useEffect, useState } from 'react';

/**
 * Men-debounce sebuah value — berguna supaya efek yang mahal (mis. request API
 * dari input pencarian) tidak dipicu di SETIAP keystroke, cuma setelah user
 * berhenti mengetik selama `delayMs`.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
