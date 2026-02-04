import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Banknote, Wallet, CreditCard as CardIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { getLocalDateString } from '@/lib/dateUtils';
import { CreditCard as CreditCardType } from '@/lib/storage';

interface PayInvoiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceTotal: number;
  cardId: string;
  cardName: string;
  invoiceMonth: string;
  cards: CreditCardType[];
  onSubmit: (data: {
    amount: number;
    date: string;
    paymentSource: 'cash' | 'debit' | 'credit';
    sourceCardId?: string;
  }) => Promise<void>;
}

export function PayInvoiceSheet({
  open,
  onOpenChange,
  invoiceTotal,
  cardId,
  cardName,
  invoiceMonth,
  cards,
  onSubmit,
}: PayInvoiceSheetProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [paymentSource, setPaymentSource] = useState<'cash' | 'debit' | 'credit'>('cash');
  const [sourceCardId, setSourceCardId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out the card being paid and cards that cannot pay other cards
  const availableSourceCards = cards.filter(c => 
    c.id !== cardId && c.canPayOtherCards !== false
  );

  useEffect(() => {
    if (open) {
      setAmount(invoiceTotal.toFixed(2).replace('.', ','));
      setDate(getLocalDateString());
      setPaymentSource('cash');
      setSourceCardId('');
    }
  }, [open, invoiceTotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount: parsedAmount,
        date,
        paymentSource,
        sourceCardId: paymentSource === 'credit' ? sourceCardId : undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Pagar Fatura</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 pb-6">
          {/* Invoice Info */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-1">
            <p className="text-sm text-muted-foreground">Fatura de {cardName}</p>
            <p className="text-2xl font-bold">{formatCurrency(-invoiceTotal)}</p>
            <p className="text-xs text-muted-foreground">Mês: {invoiceMonth}</p>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Valor do Pagamento</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Date */}
          {paymentSource !== 'credit' ? (
            <div className="space-y-2">
              <Label>Data do Pagamento</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          ) : (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Ao pagar com outro cartão, o lançamento será registrado na data de vencimento da fatura do cartão pago.
              </p>
            </div>
          )}

          {/* Payment Source */}
          <div className="space-y-2">
            <Label>Origem do Pagamento</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={paymentSource === 'cash' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3 gap-1"
                onClick={() => setPaymentSource('cash')}
              >
                <Banknote className="h-5 w-5" />
                <span className="text-xs">Dinheiro</span>
              </Button>
              <Button
                type="button"
                variant={paymentSource === 'debit' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3 gap-1"
                onClick={() => setPaymentSource('debit')}
              >
                <Wallet className="h-5 w-5" />
                <span className="text-xs">Débito</span>
              </Button>
              <Button
                type="button"
                variant={paymentSource === 'credit' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3 gap-1"
                onClick={() => setPaymentSource('credit')}
                disabled={availableSourceCards.length === 0}
              >
                <CardIcon className="h-5 w-5" />
                <span className="text-xs">Outro Cartão</span>
              </Button>
            </div>
          </div>

          {/* Source Card Selection (only when paying with another card) */}
          {paymentSource === 'credit' && availableSourceCards.length > 0 && (
            <div className="space-y-2">
              <Label>Cartão de Origem</Label>
              <Select value={sourceCardId} onValueChange={setSourceCardId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {availableSourceCards.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O valor será lançado como despesa no cartão selecionado
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full h-12" 
            disabled={isSubmitting || (paymentSource === 'credit' && !sourceCardId)}
          >
            {isSubmitting ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
