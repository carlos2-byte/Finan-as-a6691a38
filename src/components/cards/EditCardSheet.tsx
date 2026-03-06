import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard } from '@/lib/storage';
import { AccountSelector } from '@/components/salary/AccountSelector';
import { CurrencyInput, parseCurrencyValue } from '@/components/ui/currency-input';

/** Format a number to the Brazilian currency input format */
function numberToCurrencyStr(num: number): string {
  if (!num || num === 0) return '';
  const fixed = Math.abs(num).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedInt},${decPart}`;
}

interface EditCardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CreditCard | null;
  cards?: CreditCard[];
  onSubmit: (card: CreditCard) => Promise<void>;
}

export function EditCardSheet({ open, onOpenChange, card, cards = [], onSubmit }: EditCardSheetProps) {
  const [name, setName] = useState('');
  const [last4, setLast4] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('25');
  const [dueDay, setDueDay] = useState('5');
  const [canPayOtherCards, setCanPayOtherCards] = useState(true);
  const [defaultPayerCardId, setDefaultPayerCardId] = useState<string>('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mandatoryAccountId, setMandatoryAccountId] = useState('');

  const availablePayerCards = cards.filter(c => 
    c.id !== card?.id && c.canPayOtherCards !== false
  );

  useEffect(() => {
    if (card && open) {
      setName(card.name);
      setLast4(card.last4 || '');
      setLimit(card.limit ? numberToCurrencyStr(card.limit) : '');
      setClosingDay(card.closingDay?.toString() || '25');
      setDueDay(card.dueDay?.toString() || '5');
      setCanPayOtherCards(card.canPayOtherCards !== false);
      setDefaultPayerCardId(card.defaultPayerCardId || '');
      setIsDefault(card.isDefault === true);
      setMandatoryAccountId(card.mandatoryAccountId || '');
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
        limit: limit ? parseCurrencyValue(limit) : undefined,
        closingDay: parseInt(closingDay),
        dueDay: parseInt(dueDay),
        canPayOtherCards,
        defaultPayerCardId: defaultPayerCardId || undefined,
        isDefault: isDefault || undefined,
        mandatoryAccountId: mandatoryAccountId || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Editar Cartão</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pb-6">
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
            <CurrencyInput value={limit} onChange={setLimit} />
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

          {/* Cartão Padrão */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/20">
            <Checkbox
              id="editIsDefault"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
            />
            <Label htmlFor="editIsDefault" className="font-normal cursor-pointer">
              Cartão padrão (será selecionado automaticamente nas despesas)
            </Label>
          </div>

          {/* Default Payer Card Selection */}
          {availablePayerCards.length > 0 && (
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
              <Label>Pagar fatura com outro cartão</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione qual cartão será usado para pagar a fatura deste cartão automaticamente
              </p>
              <Select value={defaultPayerCardId || 'none'} onValueChange={(val) => setDefaultPayerCardId(val === 'none' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum (pagar manualmente)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (pagar manualmente)</SelectItem>
                  {availablePayerCards.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.last4 ? `(•••• ${c.last4})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {defaultPayerCardId && (
                <p className="text-xs text-primary mt-2">
                  ✓ A fatura será lançada automaticamente no cartão selecionado
                </p>
              )}
            </div>
          )}

          {/* Mandatory Salary Account */}
          <AccountSelector
            value={mandatoryAccountId}
            onChange={setMandatoryAccountId}
            label="Conta obrigatória para fatura"
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
