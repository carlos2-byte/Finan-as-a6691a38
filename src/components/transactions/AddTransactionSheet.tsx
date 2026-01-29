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
import { cn } from '@/lib/utils';

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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCardPayment, setIsCardPayment] = useState(false);
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = getCategories().filter(c => 
    type === 'income' ? c.type === 'income' : c.type === 'expense'
  );

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setDescription('');
    setCategory('other');
    setDate(new Date().toISOString().split('T')[0]);
    setIsCardPayment(false);
    setCardId('');
    setInstallments(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

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
        installments: type === 'expense' && installments > 1 ? installments : undefined,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle>Nova Transação</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
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
                <>
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

                  <div className="space-y-2">
                    <Label>Parcelas</Label>
                    <Select
                      value={String(installments)}
                      onValueChange={v => setInstallments(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                          <SelectItem key={n} value={String(n)}>
                            {n}x {n === 1 ? '(à vista)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </>
          )}

          {/* Installments for non-card transactions */}
          {type === 'expense' && !isCardPayment && (
            <div className="space-y-2">
              <Label>Parcelamento</Label>
              <Select
                value={String(installments)}
                onValueChange={v => setInstallments(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n}x {n === 1 ? '(à vista)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Income installments */}
          {type === 'income' && (
            <div className="space-y-2">
              <Label>Parcelas</Label>
              <Select
                value={String(installments)}
                onValueChange={v => setInstallments(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n}x {n === 1 ? '(única)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
      </SheetContent>
    </Sheet>
  );
}
