import { ConsolidatedInvoice } from '@/lib/invoiceUtils';
import { formatCurrency, formatMonthYear } from '@/lib/formatters';
import { formatDateShortBR } from '@/lib/dateUtils';
import { CreditCard, FileText } from 'lucide-react';

interface InvoiceItemProps {
  invoice: ConsolidatedInvoice;
  onClick?: (invoice: ConsolidatedInvoice) => void;
}

export function InvoiceItem({ invoice, onClick }: InvoiceItemProps) {
  return (
    <button
      onClick={() => onClick?.(invoice)}
      className="w-full flex items-center gap-2 py-2 text-left hover:bg-muted/50 rounded-lg transition-colors -mx-1 px-1"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10"
      >
        <FileText className="h-4 w-4 text-destructive" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="font-medium text-sm truncate max-w-[100px]">
            Fatura {invoice.cardName}
          </p>
          <CreditCard className="h-3 w-3 text-muted-foreground shrink-0" />
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="whitespace-nowrap">{formatDateShortBR(invoice.dueDate)}</span>
          <span className="bg-muted px-1 py-0.5 rounded text-[9px]">
            {invoice.transactions.length}x
          </span>
        </div>
      </div>

      <span className="font-semibold text-sm tabular-nums text-foreground whitespace-nowrap">
        -{formatCurrency(invoice.total)}
      </span>
    </button>
  );
}