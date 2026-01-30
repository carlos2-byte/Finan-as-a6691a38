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
  const [dueDay, setDueDay] = useState('5'); // Novo estado para o Vencimento
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setLast4('');
    setLimit('');
    setClosingDay('25');
    setDueDay('5');
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
        dueDay: parseInt(dueDay), // Enviando o vencimento para o banco/storage
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dias 1 a 28 para evitar problemas com Fevereiro
  const days = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle>Novo Cartão</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Nome e Limite omitidos aqui para brevidade, mantenha os seus */}
          
          <div className="grid grid-cols-2 gap-4">
            {/* Closing Day (Fechamento) */}
            <div className="space-y-2">
              <Label>Fechamento</Label>
              <Select value={closingDay} onValueChange={setClosingDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map(day => (
                    <SelectItem key={`close-${day}`} value={String(day)}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Day (Vencimento) */}
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Select value={dueDay} onValueChange={setDueDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map(day => (
                    <SelectItem key={`due-${day}`} value={String(day)}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground italic">
            Dica: Se comprar no dia {closingDay}, a conta chega no dia {dueDay} do próximo mês.
          </p>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Salvando...' : 'Adicionar Cartão'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
