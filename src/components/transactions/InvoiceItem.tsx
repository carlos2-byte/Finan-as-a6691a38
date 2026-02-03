import { ConsolidatedInvoice } from '@/lib/invoiceUtils';
import { formatCurrency, formatMonthYear } from '@/lib/formatters';
import { formatDateShortBR } from '@/lib/dateUtils';
import { CreditCard, FileText, ChevronRight, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InvoiceItemProps {
  invoice: ConsolidatedInvoice;
  onClick?: (invoice: ConsolidatedInvoice) => void;
  showDetails?: boolean;
}

export function InvoiceItem({ invoice, onClick, showDetails = true }: InvoiceItemProps) {
  return (
    <button
      onClick={() => onClick?.(invoice)}
      className="w-full flex items-center gap-3 py-4 text-left hover:bg-muted/50 rounded-lg transition-colors -mx-2 px-2 group"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10"
      >
        <FileText className="h-6 w-6 text-destructive" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">
            Fatura {invoice.cardName}
          </p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            <CreditCard className="h-2.5 w-2.5 mr-0.5" />
            {formatMonthYear(invoice.invoiceMonth)}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span>Venc. {formatDateShortBR(invoice.dueDate)}</span>
          <span className="text-muted-foreground/50">•</span>
          <span>{invoice.transactions.length} {invoice.transactions.length === 1 ? 'compra' : 'compras'}</span>
        </div>

        {/* Show real invoice value for transparency */}
        {showDetails && (
          <div className="flex items-center gap-1 mt-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                    <Info className="h-3 w-3" />
                    <span>Valor real da fatura para conferência</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Este é o valor total consolidado da fatura,</p>
                  <p>incluindo todas as compras do período.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="text-right">
          <span className="font-bold text-base tabular-nums text-destructive">
            {formatCurrency(-invoice.total)}
          </span>
          <p className="text-[10px] text-muted-foreground">valor real</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}