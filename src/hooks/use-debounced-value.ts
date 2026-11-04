import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay: number): [T, (val: T) => void] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [inputValue, setInputValue] = useState<T>(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, delay]);

  return [debouncedValue, setInputValue];
}