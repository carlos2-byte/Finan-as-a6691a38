import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard } from '@/lib/storage';

interface EditCardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CreditCard | null;
  onSubmit: (card: CreditCard) => Promise<void>;
}

export function EditCardSheet({ open, onOpenChange, card, onSubmit }: EditCardSheetProps) {
  const [name, setName] = useState('');
  const [last4, setLast4] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('25');
  const [dueDay, setDueDay] = useState('5');
  const [canPayOtherCards, setCanPayOtherCards] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (card && open) {
      setName(card.name);
      setLast4(card.last4 || '');
      setLimit(card.limit?.toString() || '');
      setClosingDay(card.closingDay?.toString() || '25');
      setDueDay(card.dueDay?.toString() || '5');
      setCanPayOtherCards(card.canPayOtherCards !== false);
    }
  }, [card, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card || !name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...card,
        name: name.trim(),
        last4: last4.trim() || undefined,
        limit: limit ? parseFloat(limit.replace(',', '.')) : undefined,
        closingDay: parseInt(closingDay),
        dueDay: parseInt(dueDay),
        canPayOtherCards,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle>Editar Cartão</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="editCardName">Nome do Cartão</Label>
            <Input id="editCardName" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editLast4">Últimos 4 dígitos (opcional)</Label>
            <Input 
              id="editLast4" 
              value={last4} 
              onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} 
              placeholder="0000"
              maxLength={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editLimit">Limite (opcional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <Input 
                id="editLimit" 
                type="text"
                inputMode="decimal"
                value={limit} 
                onChange={e => setLimit(e.target.value)} 
                placeholder="0,00"
                className="pl-10"
              />
            </div>
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

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Pode pagar outros cartões</Label>
              <p className="text-xs text-muted-foreground">
                Permitir usar este cartão para pagar faturas de outros cartões
              </p>
            </div>
            <Switch 
              checked={canPayOtherCards} 
              onCheckedChange={setCanPayOtherCards}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
