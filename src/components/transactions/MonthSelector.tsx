import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMonthYear, getPreviousMonth, getNextMonth, getCurrentMonth } from '@/lib/formatters';

interface MonthSelectorProps {
  month: string;
  onMonthChange: (month: string) => void;
}

export function MonthSelector({ month, onMonthChange }: MonthSelectorProps) {
  const currentMonth = getCurrentMonth();
  const isCurrentMonth = month === currentMonth;

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onMonthChange(getPreviousMonth(month))}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <button
        onClick={() => onMonthChange(currentMonth)}
        className="text-lg font-semibold capitalize hover:text-primary transition-colors"
      >
        {formatMonthYear(month)}
        {!isCurrentMonth && (
          <span className="ml-2 text-xs text-muted-foreground">(ir para atual)</span>
        )}
      </button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onMonthChange(getNextMonth(month))}
        disabled={month >= currentMonth}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
