import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { getCategories, CreditCard, Transaction } from '@/lib/storage';
import { getLocalDateString, getInvoiceMonth } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tx: any) => Promise<void>;
  cards: CreditCard[];
}

export function AddTransactionSheet({ open, onOpenChange, onSubmit, cards }: AddTransactionSheetProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [date, setDate] = useState(getLocalDateString());
  const [isCardPayment, setIsCardPayment] = useState(false);
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setIsCardPayment(false);
    setCardId('');
    setInstallments(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount)) return;

    let invoiceMonth = undefined;
    if (isCardPayment && cardId) {
      const card = cards.find(c => c.id === cardId);
      invoiceMonth = getInvoiceMonth(date, card?.closingDay || 25);
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount: parsedAmount,
        description: description.trim(),
        category: type === 'income' ? 'income' : category,
        type,
        date,
        isCardPayment,
        cardId,
        installments: installments > 1 ? installments : undefined,
        invoiceMonth
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader><SheetTitle>Nova Transação</SheetTitle></SheetHeader>
        <ScrollArea className="h-full pr-4">
          <form onSubmit={handleSubmit} className="space-y-4 mt-4 pb-10">
            <div className="flex gap-2">
              <Button type="button" variant={type === 'expense' ? 'default' : 'outline'} className="flex-1" onClick={() => setType('expense')}>Despesa</Button>
              <Button type="button" variant={type === 'income' ? 'default' : 'outline'} className="flex-1" onClick={() => setType('income')}>Receita</Button>
            </div>
            
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" required />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            {type === 'expense' && cards.length > 0 && (
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <Label>Pagar com cartão?</Label>
                <Switch checked={isCardPayment} onCheckedChange={setIsCardPayment} />
              </div>
            )}

            {isCardPayment && (
              <div className="space-y-4 p-2 border rounded-lg bg-muted/20">
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                  <SelectContent>{cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="Parcelas" value={installments} onChange={e => setInstallments(parseInt(e.target.value))} />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>Salvar</Button>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
