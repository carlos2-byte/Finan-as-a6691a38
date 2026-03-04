import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lightbulb, X } from 'lucide-react';
import { optimizePayments, getActiveSalaryAccounts } from '@/lib/salaryAccounts';
import { formatCurrency } from '@/lib/formatters';

interface PaymentSuggestionAlertProps {
  expense: { id: string; amount: number; description?: string; mandatoryAccountId?: string } | null;
  onDismiss: () => void;
}

interface Suggestion {
  accountName: string;
  amount: number;
}

export function PaymentSuggestionAlert({ expense, onDismiss }: PaymentSuggestionAlertProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [hasAccounts, setHasAccounts] = useState(false);

  useEffect(() => {
    if (!expense) {
      setSuggestions([]);
      return;
    }

    const loadSuggestions = async () => {
      const accounts = await getActiveSalaryAccounts();
      setHasAccounts(accounts.length > 0);
      if (accounts.length === 0) return;

      const results = await optimizePayments([
        { id: expense.id, amount: expense.amount, mandatoryAccountId: expense.mandatoryAccountId },
      ]);

      setSuggestions(results.map(r => ({ accountName: r.accountName, amount: r.amount })));
    };

    loadSuggestions();
  }, [expense]);

  if (!expense || !hasAccounts || suggestions.length === 0) return null;

  return (
    <Alert className="bg-accent/30 border-accent/50 relative animate-fade-in">
      <Lightbulb className="h-4 w-4 text-accent-foreground" />
      <AlertDescription className="pr-8">
        <p className="text-sm font-medium mb-1">💡 Sugestão de pagamento</p>
        <p className="text-xs text-muted-foreground mb-2">
          Para "{expense.description || 'Despesa'}" ({formatCurrency(Math.abs(expense.amount))}):
        </p>
        <div className="space-y-1">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="font-medium">{s.accountName}</span>
              <span>{formatCurrency(s.amount)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 italic">
          Esta é apenas uma sugestão. Nenhuma transferência será realizada automaticamente.
        </p>
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={onDismiss}
      >
        <X className="h-3 w-3" />
      </Button>
    </Alert>
  );
}
