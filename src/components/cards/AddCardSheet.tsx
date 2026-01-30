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
import { CreditCard } from '@/lib/storage';

interface AddCardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (card: Omit<CreditCard, 'id'>) => Promise<CreditCard>;
}

export function AddCardSheet({ open, onOpenChange, onSubmit }: AddCardSheetProps) {
  const [name, setName] = useState('');
  const [last4, setLast4] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('25');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setLast4('');
    setLimit('');
    setClosingDay('25');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        last4: last4.trim() || undefined,
        limit: limit ? parseFloat(limit.replace(',', '.')) : undefined,
        closingDay: parseInt(closingDay),
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate days 1-28 for closing day selection
  const closingDays = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle>Novo Cartão</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Card Name */}
          <div className="space-y-2">
            <Label htmlFor="cardName">Nome do Cartão</Label>
            <Input
              id="cardName"
              placeholder="Ex: Nubank, Itaú Visa"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          {/* Last 4 Digits */}
          <div className="space-y-2">
            <Label htmlFor="last4">Últimos 4 dígitos (opcional)</Label>
            <Input
              id="last4"
              placeholder="1234"
              maxLength={4}
              value={last4}
              onChange={e => setLast4(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          {/* Limit */}
          <div className="space-y-2">
            <Label htmlFor="limit">Limite (opcional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="limit"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={limit}
                onChange={e => setLimit(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Closing Day */}
          <div className="space-y-2">
            <Label>Dia de Fechamento da Fatura</Label>
            <Select value={closingDay} onValueChange={setClosingDay}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {closingDays.map(day => (
                  <SelectItem key={day} value={String(day)}>
                    Dia {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Compras após este dia vão para a próxima fatura
            </p>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? 'Salvando...' : 'Adicionar Cartão'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
