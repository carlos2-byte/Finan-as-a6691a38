import { Transaction, getCategoryById } from '@/lib/storage';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  UtensilsCrossed,
  Car,
  Home,
  Heart,
  GraduationCap,
  Gamepad2,
  MoreHorizontal,
  CreditCard,
  Trash2,
  Repeat,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  UtensilsCrossed,
  Car,
  Home,
  Heart,
  GraduationCap,
  Gamepad2,
  MoreHorizontal,
};

interface TransactionItemProps {
  transaction: Transaction;
  onDelete?: (transaction: Transaction) => void;
  onEdit?: (transaction: Transaction) => void;
  showActions?: boolean;
}

export function TransactionItem({ 
  transaction, 
  onDelete,
  onEdit,
  showActions = false,
}: TransactionItemProps) {
  const category = getCategoryById(transaction.category || 'other');
  const Icon = category?.icon ? iconMap[category.icon] || MoreHorizontal : MoreHorizontal;
  const isIncome = transaction.type === 'income';
  const isRecurring = !!transaction.recurrenceId;
  const isInstallment = transaction.installments && transaction.installments > 1;

  return (
    <div className="flex items-center gap-3 py-3 group">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: category?.color ? `${category.color}20` : 'hsl(var(--muted))' }}
      >
        <Icon
          className="h-5 w-5"
          style={{ color: category?.color || 'hsl(var(--muted-foreground))' }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">
            {transaction.description || category?.name || 'Transação'}
          </p>
          {transaction.isCardPayment && (
            <CreditCard className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          {isRecurring && (
            <Repeat className="h-3 w-3 text-primary shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDate(transaction.date)}</span>
          {isInstallment && (
            <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px]">
              {transaction.currentInstallment}/{transaction.installments}
            </span>
          )}
          {isRecurring && (
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">
              recorrente
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            'font-semibold text-sm tabular-nums',
            isIncome ? 'text-success' : 'text-foreground'
          )}
        >
          {isIncome ? '+' : ''}{formatCurrency(transaction.amount)}
        </span>
        
        {showActions && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(transaction)}
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onDelete(transaction)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
