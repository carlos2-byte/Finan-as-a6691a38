import { useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
}

/**
 * Brazilian currency input: auto-formats with 2 decimal places.
 * Typing "1" → "0,01", "12" → "0,12", "123" → "1,23", "1234" → "12,34"
 * Value stored as formatted string (e.g., "1.234,56")
 * Use parseCurrencyValue() to get numeric value for submission.
 */
export function CurrencyInput({ value, onChange, placeholder = '0,00', className, required, id }: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    
    if (raw === '' || raw === '0') {
      onChange('');
      return;
    }

    // Remove leading zeros but keep at least 1 digit
    const cleaned = raw.replace(/^0+/, '') || '0';
    
    // Pad to at least 3 digits for cents
    const padded = cleaned.padStart(3, '0');
    
    const intPart = padded.slice(0, -2);
    const decPart = padded.slice(-2);
    
    // Add thousand separators
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    onChange(`${formattedInt},${decPart}`);
  }, [onChange]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        R$
      </span>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn('pl-10', className)}
        required={required}
      />
    </div>
  );
}

/**
 * Parse a formatted currency string (e.g., "1.234,56") to a number (1234.56).
 * Handles both "1234,56" and "1234.56" formats.
 */
export function parseCurrencyValue(formatted: string): number {
  if (!formatted) return 0;
  // Remove thousand separators (dots), replace comma with dot
  const cleaned = formatted.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
