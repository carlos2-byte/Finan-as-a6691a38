import { Investment, getDailyYieldEstimate, getMonthlyYieldEstimate, getInvestmentTaxInfo, YieldHistory } from '@/lib/investments';
import { useInvestmentDetails } from '@/hooks/useInvestments';
import { formatCurrency } from '@/lib/formatters';
import { formatDateBR } from '@/lib/dateUtils';
import { ExportButtons } from '@/components/ExportButtons';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, Calendar, DollarSign, Receipt, PiggyBank } from 'lucide-react';

interface InvestmentDetailSheetProps {
  investment: Investment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvestmentDetailSheet({ investment, open, onOpenChange }: InvestmentDetailSheetProps) {
  const { history } = useInvestmentDetails(investment?.id ?? '');

  if (!investment) return null;

  const getDaysSinceStart = () => {
    const start = new Date(investment.startDate + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.floor((now.getTime() - start.getTime()) / 86400000);
  };

  const days = getDaysSinceStart();
  const dailyYield = getDailyYieldEstimate(investment.currentAmount, investment.yieldRate, investment.cdiBonusPercent, days, investment.taxMode);
  const monthlyYield = getMonthlyYieldEstimate(investment.currentAmount, investment.yieldRate, investment.cdiBonusPercent, days, investment.taxMode);
  const taxInfo = getInvestmentTaxInfo(investment);
  const isDailyTax = investment.taxMode === 'daily';

  // Accumulated totals from history
  const totalGrossYield = history.reduce((sum, h) => sum + h.grossAmount, 0);
  const totalTaxDeducted = history.reduce((sum, h) => sum + h.taxAmount, 0);
  const totalNetYield = history.reduce((sum, h) => sum + h.netAmount, 0);

  // Net value = deposited + net yield
  const netValue = investment.totalDeposited + totalNetYield;

  // File name for export
  const safeName = investment.name.replace(/[^a-zA-Z0-9]/g, '_');
  const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  const filename = `Investimento_${safeName}_${today}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl px-0">
        <SheetHeader className="px-4 pb-2">
          <SheetTitle>Detalhes do Investimento</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(90vh-140px)] px-4">
          <div id="investment-detail-report" className="space-y-4 pb-4">
            {/* Header / Investment Info */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <PiggyBank className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-bold text-lg">{investment.name}</h3>
                    {investment.type && (
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded">{investment.type}</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Valor Inicial</p>
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(investment.initialAmount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Data de Início</p>
                      <p className="text-sm font-semibold">{formatDateBR(investment.startDate)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Taxa</p>
                    <p className="text-sm font-semibold">{investment.yieldRate}% a.a.</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Dias investido</p>
                    <p className="text-sm font-semibold">{days} dias</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rendimentos */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <h4 className="font-semibold">Rendimentos</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">
                      {isDailyTax ? 'Rend. Líquido/Dia' : 'Rendimento/Dia'}
                    </p>
                    <p className="text-sm font-semibold text-success tabular-nums">+{formatCurrency(dailyYield.net)}</p>
                    {dailyYield.gross !== dailyYield.net && (
                      <p className="text-[10px] text-muted-foreground tabular-nums">Bruto: {formatCurrency(dailyYield.gross)}</p>
                    )}
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">
                      {isDailyTax ? 'Rend. Líquido/Mês' : 'Rendimento/Mês'}
                    </p>
                    <p className="text-sm font-semibold text-success tabular-nums">+{formatCurrency(monthlyYield.net)}</p>
                    {monthlyYield.gross !== monthlyYield.net && (
                      <p className="text-[10px] text-muted-foreground tabular-nums">Bruto: {formatCurrency(monthlyYield.gross)}</p>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-success/10 rounded-lg">
                  <p className="text-[10px] text-muted-foreground">Total Rendimento Acumulado</p>
                  <p className="text-lg font-bold text-success tabular-nums">+{formatCurrency(totalNetYield)}</p>
                  {totalGrossYield !== totalNetYield && (
                    <p className="text-xs text-muted-foreground tabular-nums">Bruto: {formatCurrency(totalGrossYield)}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Impostos */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-semibold">Impostos</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Alíquota IR</p>
                    <p className="text-sm font-semibold tabular-nums">{taxInfo.rateLabel}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isDailyTax ? 'Descontado diariamente' : 'Descontado no saque'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">
                      {isDailyTax ? 'IR est. no saque' : 'IR estimado (saque)'}
                    </p>
                    <p className="text-sm font-semibold text-destructive tabular-nums">
                      -{formatCurrency(isDailyTax ? 0 : taxInfo.estimatedTax)}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-[10px] text-muted-foreground">Total Imposto Descontado</p>
                  <p className="text-lg font-bold text-destructive tabular-nums">-{formatCurrency(totalTaxDeducted)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Resultado Final */}
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-bold text-center">Resultado Final</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total Depositado</p>
                    <p className="text-xs font-semibold tabular-nums">{formatCurrency(investment.totalDeposited)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Rend. Acumulado</p>
                    <p className="text-xs font-semibold text-success tabular-nums">+{formatCurrency(totalNetYield)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Imposto Total</p>
                    <p className="text-xs font-semibold text-destructive tabular-nums">-{formatCurrency(totalTaxDeducted)}</p>
                  </div>
                </div>
                <div className="text-center pt-2 border-t border-primary/20">
                  <p className="text-xs text-muted-foreground">Valor Líquido Atual</p>
                  <p className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(netValue)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    = Depositado + Rendimento − Imposto
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Yield History */}
            {history.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-semibold mb-3">Histórico Recente</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {history.slice(0, 15).map(h => (
                      <div key={h.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground">{formatDateBR(h.date)}</span>
                        <div className="flex gap-3">
                          <span className="text-success tabular-nums">+{formatCurrency(h.netAmount)}</span>
                          {h.taxAmount > 0 && (
                            <span className="text-destructive tabular-nums">-{formatCurrency(h.taxAmount)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Export Actions */}
        <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3 safe-bottom">
          <ExportButtons elementId="investment-detail-report" filename={filename} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
