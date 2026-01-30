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

    let finalInstallments = installments;
    if (installments === -1 && customInstallments) {
      const parsed = parseInt(customInstallments);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
        finalInstallments = parsed;
      } else {
        return;
      }
    }

    // --- LÓGICA DE FATURA INTEGRADA ---
    let calculatedInvoiceMonth: string | undefined = undefined;
    
    if (type === 'expense' && isCardPayment && cardId) {
      const selectedCard = cards.find(c => c.id === cardId);
      // Se não achar o fechamento, assume dia 25 como padrão
      const closingDay = selectedCard?.closingDay || 25;
      
      // Usa a função do seu dateUtils para decidir o mês financeiro
      calculatedInvoiceMonth = getInvoiceMonth(date, closingDay);
    }
    // ----------------------------------

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
        invoiceMonth: calculatedInvoiceMonth, // Aqui o dado vai corrigido para o storage
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const installmentOptions = [
    { value: '1', label: '1x (à vista)' },
    { value: '2', label: '2x' },
    { value: '3', label: '3x' },
    { value: '6', label: '6x' },
    { value: '10', label: '10x' },
    { value: '12', label: '12x' },
    { value: '-1', label: 'Outro...' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Nova Transação</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(90vh-100px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'expense' ? 'default' : 'outline'}
                className={cn('flex-1', type === 'expense' && 'bg-destructive')}
                onClick={() => setType('expense')}
              >
                Despesa
              </Button>
              <Button
                type="button"
                variant={type === 'income' ? 'default' : 'outline'}
                className={cn('flex-1', type === 'income' && 'bg-emerald-600')}
                onClick={() => setType('income')}
              >
                Receita
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">R$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="pl-10 text-lg font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Supermercado"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {type === 'expense' && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Data da Compra</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            {type === 'expense' && cards.length > 0 && (
              <div className="p-4 border rounded-xl space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label>Pagamento no cartão?</Label>
                  <Switch checked={isCardPayment} onCheckedChange={setIsCardPayment} />
                </div>

                {isCardPayment && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label>Selecione o Cartão</Label>
                      <Select value={cardId} onValueChange={setCardId}>
                        <SelectTrigger><SelectValue placeholder="Escolha um cartão" /></SelectTrigger>
                        <SelectContent>
                          {cards.map(card => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.name} {card.last4 && `(•••• ${card.last4})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Parcelas</Label>
                      <Select value={String(installments)} onValueChange={v => setInstallments(parseInt(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {installmentOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Confirmar Lançamento'}
            </Button>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
