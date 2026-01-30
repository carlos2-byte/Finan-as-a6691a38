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
  const [dueDay, setDueDay] = useState('5');
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
        dueDay: parseInt(dueDay),
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle>Novo Cartão</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="cardName">Nome do Cartão</Label>
            <Input id="cardName" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fechamento</Label>
              <Select value={closingDay} onValueChange={setClosingDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {days.map(d => <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Select value={dueDay} onValueChange={setDueDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {days.map(d => <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Adicionar Cartão'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
