import { Transaction } from '@/lib/storage';
import { ConsolidatedInvoice } from '@/lib/invoiceUtils';
import { StatementItem, isConsolidatedInvoice } from '@/hooks/useStatement';
import { TransactionItem } from './TransactionItem';
import { InvoiceItem } from './InvoiceItem';
import { Skeleton } from '@/components/ui/skeleton';

interface StatementListProps {
  items: StatementItem[];
  loading?: boolean;
  onDeleteTransaction?: (transaction: Transaction) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onInvoiceClick?: (invoice: ConsolidatedInvoice) => void;
  showActions?: boolean;
  emptyMessage?: string;
}

export function StatementList({
  items,
  loading = false,
  onDeleteTransaction,
  onEditTransaction,
  onInvoiceClick,
  showActions = false,
  emptyMessage = 'Nenhuma transação encontrada',
}: StatementListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {items.map(item => {
        if (isConsolidatedInvoice(item)) {
          return (
            <InvoiceItem
              key={item.id}
              invoice={item}
              onClick={onInvoiceClick}
            />
          );
        }
        
        return (
          <TransactionItem
            key={item.id}
            transaction={item}
            onDelete={onDeleteTransaction}
            onEdit={onEditTransaction}
            showActions={showActions}
          />
        );
      })}
    </div>
  );
}
