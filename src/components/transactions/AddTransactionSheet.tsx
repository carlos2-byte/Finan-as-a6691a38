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
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getCategories, CreditCard, Transaction } from '@/lib/storage';
import { getLocalDateString, getInvoiceMonth, addMonthsToDate, addYearsToDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Repeat, Calendar, CreditCard as CardIcon } from 'lucide-react';

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    tx: Omit<Transaction, 'id' | 'createdAt'>,
    options?: {
      installments?: number;
      isInstallmentTotal?: boolean;
      isRecurring?: boolean;
      recurrenceType?: 'weekly' | 'monthly' | 'yearly';
      recurrenceEndDate?: string;
    }
  ) => Promise<void>;
  cards: CreditCard[];
}

const categories = getCategories();

export function AddTransactionSheet({ open, onOpenChange, onSubmit, cards }: AddTransactionSheetProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [date, setDate] = useState(getLocalDateString());
  const [isCardPayment, setIsCardPayment] = useState(false);
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const [isInstallmentTotal, setIsInstallmentTotal] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setType('expense');
      setAmount('');
      setDescription('');
      setCategory('other');
      setDate(getLocalDateString());
      setIsCardPayment(false);
      setCardId('');
      setInstallments(1);
      setIsInstallmentTotal(true);
      setIsRecurring(false);
      setRecurrenceType('monthly');
      setRecurrenceEndDate('');
    }
  }, [open]);

  // Calculate default end date for recurrence (1 year from now)
  useEffect(() => {
    if (isRecurring && !recurrenceEndDate) {
      setRecurrenceEndDate(addYearsToDate(date, 1));
    }
  }, [isRecurring, date, recurrenceEndDate]);

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
      await onSubmit(
        {
          amount: parsedAmount,
          description: description.trim(),
          category: type === 'income' ? 'income' : category,
          type,
          date,
          isCardPayment,
          cardId: isCardPayment ? cardId : undefined,
          invoiceMonth,
        },
        {
          installments: installments > 1 ? installments : undefined,
          isInstallmentTotal: installments > 1 ? isInstallmentTotal : undefined,
          isRecurring,
          recurrenceType: isRecurring ? recurrenceType : undefined,
          recurrenceEndDate: isRecurring ? recurrenceEndDate : undefined,
        }
      );
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader><SheetTitle>Nova Transação</SheetTitle></SheetHeader>
        <ScrollArea className="h-full pr-4">
          <form onSubmit={handleSubmit} className="space-y-4 mt-4 pb-10">
            {/* Type Toggle */}
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant={type === 'expense' ? 'default' : 'outline'} 
                className="flex-1" 
                onClick={() => setType('expense')}
              >
                Despesa
              </Button>
              <Button 
                type="button" 
                variant={type === 'income' ? 'default' : 'outline'} 
                className="flex-1" 
                onClick={() => setType('income')}
              >
                Receita
              </Button>
            </div>
            
            {/* Amount */}
            <div className="space-y-2">
              <Label>Valor</Label>
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

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Ex: Almoço, Uber, Netflix..." 
              />
            </div>

            {/* Category (only for expenses) */}
            {type === 'expense' && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            {/* Recurring Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <Label>Transação Recorrente</Label>
              </div>
              <Switch 
                checked={isRecurring} 
                onCheckedChange={(checked) => {
                  setIsRecurring(checked);
                  if (checked) {
                    setInstallments(1);
                    setIsCardPayment(false);
                  }
                }} 
              />
            </div>

            {/* Recurrence Options */}
            {isRecurring && (
              <div className="space-y-4 p-3 border rounded-lg bg-muted/10">
                <div className="space-y-2">
                  <Label>Repetir</Label>
                  <Select value={recurrenceType} onValueChange={(v: 'weekly' | 'monthly' | 'yearly') => setRecurrenceType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanalmente</SelectItem>
                      <SelectItem value="monthly">Mensalmente</SelectItem>
                      <SelectItem value="yearly">Anualmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Até quando?</Label>
                  <Input 
                    type="date" 
                    value={recurrenceEndDate} 
                    onChange={e => setRecurrenceEndDate(e.target.value)}
                    min={date}
                  />
                </div>
              </div>
            )}

            {/* Card Payment (only for non-recurring expenses) */}
            {type === 'expense' && !isRecurring && cards.length > 0 && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-2">
                  <CardIcon className="h-4 w-4 text-muted-foreground" />
                  <Label>Pagar com cartão?</Label>
                </div>
                <Switch checked={isCardPayment} onCheckedChange={setIsCardPayment} />
              </div>
            )}

            {/* Card Options */}
            {isCardPayment && !isRecurring && (
              <div className="space-y-4 p-3 border rounded-lg bg-muted/10">
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {cards.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Input 
                    type="number" 
                    min="1"
                    max="999"
                    value={installments} 
                    onChange={e => setInstallments(parseInt(e.target.value) || 1)} 
                  />
                </div>

                {/* Ask if amount is per installment or total */}
                {installments > 1 && (
                  <div className="space-y-2">
                    <Label>O valor informado é:</Label>
                    <RadioGroup 
                      value={isInstallmentTotal ? 'total' : 'installment'} 
                      onValueChange={(v) => setIsInstallmentTotal(v === 'total')}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="total" id="total" />
                        <Label htmlFor="total" className="font-normal">
                          Valor total (será dividido em {installments}x)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="installment" id="installment" />
                        <Label htmlFor="installment" className="font-normal">
                          Valor da parcela (cada parcela de R$ {amount || '0,00'})
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
