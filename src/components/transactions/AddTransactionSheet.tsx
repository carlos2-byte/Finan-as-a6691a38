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
import { getLocalDateString } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tx: Omit<Transaction, 'id' | 'createdAt'> & { installments?: number }) => Promise<void>;
  cards: CreditCard[];
}

export function AddTransactionSheet({
  open,
  onOpenChange,
  onSubmit,
  cards,
}: AddTransactionSheetProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [date, setDate] = useState(getLocalDateString());
  const [isCardPayment, setIsCardPayment] = useState(false);
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const [customInstallments, setCustomInstallments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = getCategories().filter(c => 
    type === 'income' ? c.type === 'income' : c.type === 'expense'
  );

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setDescription('');
    setCategory('other');
    setDate(getLocalDateString());
    setIsCardPayment(false);
    setCardId('');
    setInstallments(1);
    setCustomInstallments('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    // Get final installments value
    let finalInstallments = installments;
    if (installments === -1 && customInstallments) {
      const parsed = parseInt(customInstallments);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
        finalInstallments = parsed;
      } else {
        return; // Invalid custom value
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount: parsedAmount,
        description: description.trim() || undefined,
        category: type === 'income' ? 'income' : category,
        type,
        date,
        isCardPayment: type === 'expense' && isCardPayment,
        cardId: type === 'expense' && isCardPayment ? cardId : undefined,
        installments: finalInstallments > 1 ? finalInstallments : undefined,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Installment options: 1-12 + custom option
  const installmentOptions = [
    { value: '1', label: '1x (à vista)' },
    { value: '2', label: '2x' },
    { value: '3', label: '3x' },
    { value: '4', label: '4x' },
    { value: '5', label: '5x' },
    { value: '6', label: '6x' },
    { value: '7', label: '7x' },
    { value: '8', label: '8x' },
    { value: '9', label: '9x' },
    { value: '10', label: '10x' },
    { value: '11', label: '11x' },
    { value: '12', label: '12x' },
    { value: '-1', label: 'Outro...' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Nova Transação</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-100px)]">
          <form onSubmit={handleSubmit} className="space-y-5 pr-4">
            {/* Type Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'expense' ? 'default' : 'outline'}
                className={cn(
                  'flex-1',
                  type === 'expense' && 'bg-destructive hover:bg-destructive/90'
                )}
                onClick={() => {
                  setType('expense');
                  setCategory('other');
                }}
              >
                Despesa
              </Button>
              <Button
                type="button"
                variant={type === 'income' ? 'default' : 'outline'}
                className={cn(
                  'flex-1',
                  type === 'income' && 'bg-success hover:bg-success/90'
                )}
                onClick={() => {
                  setType('income');
                  setCategory('income');
                }}
              >
                Receita
              </Button>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="pl-10 text-lg font-semibold"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                placeholder="Ex: Supermercado"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Category (expenses only) */}
            {type === 'expense' && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            {/* Card Payment (expenses only) */}
            {type === 'expense' && cards.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isCard">Pagamento no cartão</Label>
                  <Switch
                    id="isCard"
                    checked={isCardPayment}
                    onCheckedChange={setIsCardPayment}
                  />
                </div>

                {isCardPayment && (
                  <div className="space-y-2">
                    <Label>Cartão</Label>
                    <Select value={cardId} onValueChange={setCardId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cartão" />
                      </SelectTrigger>
                      <SelectContent>
                        {cards.map(card => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name} {card.last4 && `•••• ${card.last4}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {/* Installments - available for all transaction types */}
            <div className="space-y-2">
              <Label>Parcelas</Label>
              <Select
                value={String(installments)}
                onValueChange={v => {
                  const val = parseInt(v);
                  setInstallments(val);
                  if (val !== -1) {
                    setCustomInstallments('');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {installmentOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {installments === -1 && (
                <Input
                  type="number"
                  min="1"
                  max="999"
                  placeholder="Número de parcelas (1-999)"
                  value={customInstallments}
                  onChange={e => setCustomInstallments(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting || !amount}
            >
              {isSubmitting ? 'Salvando...' : 'Adicionar'}
            </Button>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
