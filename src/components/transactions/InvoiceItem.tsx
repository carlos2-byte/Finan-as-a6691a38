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
      className="w-full flex items-center gap-3 py-3 text-left hover:bg-muted/50 rounded-lg transition-colors -mx-2 px-2"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10"
      >
        <FileText className="h-5 w-5 text-destructive" />
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">
            Fatura {invoice.cardName}
          </p>
          <CreditCard className="h-3 w-3 text-muted-foreground shrink-0" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Venc. {formatDateShortBR(invoice.dueDate)}</span>
          <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
            {invoice.transactions.length} {invoice.transactions.length === 1 ? 'compra' : 'compras'}
          </span>
        </div>
      </div>

      <span className="font-semibold text-sm tabular-nums text-foreground whitespace-nowrap shrink-0 pl-2">
        -{formatCurrency(invoice.total)}
      </span>
    </button>
  );
}