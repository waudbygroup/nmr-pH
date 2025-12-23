import { useState, useEffect, useCallback } from 'react';

/**
 * Debounce hook.
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Parse chemical shifts from text input.
 * One shift per line, numbers only.
 */
function parseShifts(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => parseFloat(line))
    .filter(value => !isNaN(value));
}

/**
 * ShiftInputArea component.
 * Text area for entering observed chemical shifts for a single nucleus.
 */
export function ShiftInputArea({
  nucleus,
  value,
  onChange,
  debounceMs = 500
}) {
  const [text, setText] = useState('');

  // Initialize text from value
  useEffect(() => {
    if (value && value.length > 0) {
      setText(value.join('\n'));
    }
  }, []); // Only on mount

  const debouncedText = useDebounce(text, debounceMs);

  // Parse and propagate changes after debounce
  useEffect(() => {
    const shifts = parseShifts(debouncedText);
    onChange(shifts);
  }, [debouncedText, onChange]);

  const handleChange = useCallback((e) => {
    setText(e.target.value);
  }, []);

  const nucleusLabel = nucleus.replace(/(\d+)/, '<sup>$1</sup>');

  return (
    <div className="shift-input-area">
      <label
        htmlFor={`shifts-${nucleus}`}
        dangerouslySetInnerHTML={{
          __html: `<sup>${nucleus.match(/^\d+/)?.[0] || ''}</sup>${nucleus.replace(/^\d+/, '')} Chemical Shifts (ppm)`
        }}
      />
      <textarea
        id={`shifts-${nucleus}`}
        value={text}
        onChange={handleChange}
        placeholder={`Enter ${nucleus} shifts, one per line:\n2.45\n3.82\n3.15`}
        rows={6}
        spellCheck={false}
      />
      <div className="shift-count">
        {parseShifts(text).length} peaks entered
      </div>
    </div>
  );
}

export default ShiftInputArea;
