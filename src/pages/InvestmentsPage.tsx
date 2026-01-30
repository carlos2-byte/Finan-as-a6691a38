import { useState } from 'react';
import { Plus, TrendingUp, Trash2, ArrowDownToLine, ArrowUpFromLine, Percent } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useInvestments } from '@/hooks/useInvestments';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, getCurrentMonth } from '@/lib/formatters';
import { formatDateBR } from '@/lib/dateUtils';
import { Investment } from '@/lib/investments';
import { toast } from '@/hooks/use-toast';

export default function InvestmentsPage() {
  const { 
    investments, 
    totalInvested, 
    defaultRate, 
    loading, 
    create, 
    remove, 
    deposit, 
    withdraw, 
    updateDefaultRate 
  } = useInvestments();
  const { addTransaction } = useTransactions(getCurrentMonth());

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showRateSheet, setShowRateSheet] = useState(false);
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);
  const [showDepositSheet, setShowDepositSheet] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [investmentToDelete, setInvestmentToDelete] = useState<Investment | null>(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newRate, setNewRate] = useState('');
  const [actionAmount, setActionAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newAmount.replace(',', '.'));
    if (!newName.trim() || isNaN(amount) || amount <= 0) return;

    setIsSubmitting(true);
    try {
      const rate = newRate ? parseFloat(newRate.replace(',', '.')) : undefined;
      await create(newName.trim(), amount, rate);
      toast({ title: 'Investimento criado!' });
      setNewName('');
      setNewAmount('');
      setNewRate('');
      setShowAddSheet(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestment) return;
    
    const amount = parseFloat(actionAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    setIsSubmitting(true);
    try {
      await deposit(selectedInvestment.id, amount);
      toast({ title: 'Depósito realizado!' });
      setActionAmount('');
      setShowDepositSheet(false);
      setSelectedInvestment(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestment) return;
    
    const amount = parseFloat(actionAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    if (amount > selectedInvestment.currentAmount) {
      toast({ title: 'Valor excede o saldo disponível', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await withdraw(selectedInvestment.id, amount);
      if (result?.success) {
        // Create income transaction with exact description
        await addTransaction({
          amount: result.amount,
          description: 'Investment withdrawal',
          type: 'income',
          date: new Date().toISOString().split('T')[0],
          category: 'income',
        });
        toast({ title: 'Resgate realizado!' });
      }
      setActionAmount('');
      setShowWithdrawSheet(false);
      setSelectedInvestment(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(newRate.replace(',', '.'));
    if (isNaN(rate) || rate < 0) return;

    await updateDefaultRate(rate);
    toast({ title: 'Taxa atualizada!' });
    setNewRate('');
    setShowRateSheet(false);
  };

  const handleDelete = async () => {
    if (!investmentToDelete) return;
    await remove(investmentToDelete.id);
    toast({ title: 'Investimento excluído' });
    setInvestmentToDelete(null);
  };

  return (
    <PageContainer
      header={
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Investimentos</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRateSheet(true)}>
              <Percent className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setShowAddSheet(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          </div>
        </div>
      }
    >
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="space-y-6 pb-4">
          {/* Total Card */}
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Investido</p>
                  <p className="text-2xl font-bold text-primary tabular-nums">
                    {formatCurrency(totalInvested)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Taxa padrão: {defaultRate}% ao ano
              </p>
            </CardContent>
          </Card>

          {/* Investments List */}
          {investments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum investimento cadastrado</p>
                <Button className="mt-4" onClick={() => setShowAddSheet(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Investimento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {investments.map(inv => (
                <Card key={inv.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{inv.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          Início: {formatDateBR(inv.startDate)} • {inv.yieldRate}% a.a.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-8 w-8"
                        onClick={() => setInvestmentToDelete(inv)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Saldo atual</p>
                        <p className="text-xl font-bold tabular-nums">
                          {formatCurrency(inv.currentAmount)}
                        </p>
                        {inv.currentAmount !== inv.initialAmount && (
                          <p className="text-xs text-success">
                            +{formatCurrency(inv.currentAmount - inv.initialAmount)} rendimento
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvestment(inv);
                            setShowDepositSheet(true);
                          }}
                        >
                          <ArrowDownToLine className="h-4 w-4 mr-1" />
                          Depositar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvestment(inv);
                            setShowWithdrawSheet(true);
                          }}
                        >
                          <ArrowUpFromLine className="h-4 w-4 mr-1" />
                          Resgatar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Investment Sheet */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle>Novo Investimento</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Tesouro Selic, CDB"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Inicial</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  placeholder="0,00"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Taxa de Rendimento (% a.a.) - opcional</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={newRate}
                onChange={e => setNewRate(e.target.value)}
                placeholder={`Padrão: ${defaultRate}%`}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Investimento'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Rate Sheet */}
      <Sheet open={showRateSheet} onOpenChange={setShowRateSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle>Taxa Padrão de Rendimento</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleUpdateRate} className="space-y-4">
            <div className="space-y-2">
              <Label>Taxa Anual (%)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={newRate}
                onChange={e => setNewRate(e.target.value)}
                placeholder={`Atual: ${defaultRate}%`}
              />
              <p className="text-xs text-muted-foreground">
                Novos investimentos usarão esta taxa por padrão
              </p>
            </div>
            <Button type="submit" className="w-full">
              Salvar
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Deposit Sheet */}
      <Sheet open={showDepositSheet} onOpenChange={setShowDepositSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle>Depositar em {selectedInvestment?.name}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div className="space-y-2">
              <Label>Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={actionAmount}
                  onChange={e => setActionAmount(e.target.value)}
                  placeholder="0,00"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Depositando...' : 'Confirmar Depósito'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Withdraw Sheet */}
      <Sheet open={showWithdrawSheet} onOpenChange={setShowWithdrawSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle>Resgatar de {selectedInvestment?.name}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Saldo disponível: {formatCurrency(selectedInvestment?.currentAmount || 0)}
            </p>
            <div className="space-y-2">
              <Label>Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={actionAmount}
                  onChange={e => setActionAmount(e.target.value)}
                  placeholder="0,00"
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O valor resgatado será adicionado como receita com descrição "Investment withdrawal"
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Resgatando...' : 'Confirmar Resgate'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!investmentToDelete} onOpenChange={() => setInvestmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir investimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{investmentToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
