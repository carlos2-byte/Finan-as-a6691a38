import { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SalaryAccount, SalaryIncomeEntry } from '@/lib/salaryAccounts';
import { getLocalDateString, getMonthFromDate } from '@/lib/dateUtils';

interface AddSalaryIncomeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: SalaryAccount | null;
  onSubmit: (
    entry: Omit<SalaryIncomeEntry, 'id'>,
    options?: {
      installments?: number;
      isInstallmentTotal?: boolean;
      isRecurring?: boolean;
      recurrenceType?: 'weekly' | 'monthly' | 'yearly';
    }
  ) => Promise<void>;
}

export function AddSalaryIncomeSheet({ open, onOpenChange, account, onSubmit }: AddSalaryIncomeSheetProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recurrence/installment state
  const [entryType, setEntryType] = useState<'single' | 'recurring' | 'installment'>('single');
  const [recurrenceType, setRecurrenceType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [installments, setInstallments] = useState('2');
  const [isInstallmentTotal, setIsInstallmentTotal] = useState(true);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setDate(getLocalDateString());
    setEntryType('single');
    setRecurrenceType('monthly');
    setInstallments('2');
    setIsInstallmentTotal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const options = entryType === 'recurring'
        ? { isRecurring: true, recurrenceType }
        : entryType === 'installment'
        ? { installments: parseInt(installments), isInstallmentTotal }
        : undefined;

      await onSubmit(
        {
          accountId: account.id,
          amount: parsedAmount,
          date,
          description: description.trim() || 'Salário',
          month: getMonthFromDate(date),
        },
        options
      );
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;
  const installmentCount = parseInt(installments) || 2;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Lançar Receita - {account?.name}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pb-6">
          <div className="space-y-2">
            <Label>Valor</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
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

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Salário, Bônus..."
            />
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Entry type selector */}
          <div className="space-y-3">
            <Label>Tipo de lançamento</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'single', label: 'Normal' },
                { value: 'recurring', label: 'Recorrente' },
                { value: 'installment', label: 'Parcelada' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEntryType(opt.value as any)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    entryType === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recurrence options */}
          {entryType === 'recurring' && (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
              <Label>Frequência</Label>
              <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Será gerada automaticamente por até 5 anos.
              </p>
            </div>
          )}

          {/* Installment options */}
          {entryType === 'installment' && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label>Número de parcelas</Label>
                <Input
                  type="number"
                  min="2"
                  max="60"
                  value={installments}
                  onChange={e => setInstallments(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>O valor informado é:</Label>
                <RadioGroup
                  value={isInstallmentTotal ? 'total' : 'installment'}
                  onValueChange={v => setIsInstallmentTotal(v === 'total')}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="total" id="total" />
                    <Label htmlFor="total" className="font-normal text-sm">
                      Valor total (será dividido em {installmentCount}x)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="installment" id="perInstallment" />
                    <Label htmlFor="perInstallment" className="font-normal text-sm">
                      Valor por parcela
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              {parsedAmount > 0 && (
                <p className="text-xs text-muted-foreground border-t pt-2">
                  {isInstallmentTotal
                    ? `${installmentCount}x de R$ ${(parsedAmount / installmentCount).toFixed(2)}`
                    : `Total: R$ ${(parsedAmount * installmentCount).toFixed(2)}`}
                </p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Lançar Receita'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
