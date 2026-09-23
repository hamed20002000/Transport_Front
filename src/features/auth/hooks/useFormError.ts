import { useCallback, useEffect, useRef, useState } from 'react';

export function useFormError() {
  const [error, updateError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const clearError = useCallback(() => {
    clearTimeout(timer.current);
    updateError('');
  }, []);

  const setError = useCallback((message: string) => {
    clearTimeout(timer.current);
    updateError(message);
    if (message) timer.current = setTimeout(() => updateError(''), 10_000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { error, setError, clearError };
}
