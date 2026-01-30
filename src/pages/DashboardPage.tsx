import { useState, useMemo } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthSelector } from '@/components/transactions/MonthSelector';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, getCurrentMonth } from '@/lib/formatters';
import { getCategories } from '@/lib/storage';
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DashboardPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const { transactions, totals, categoryTotals, loading } = useTransactions(month);

  // Category breakdown for current month
  const categoryData = useMemo(() => {
    const categories = getCategories().filter(c => c.type === 'expense');
    return categories
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        value: categoryTotals[cat.id] || 0,
        color: cat.color,
      }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categoryTotals]);

  const totalExpenses = totals.expense;
  const balance = totals.income - totals.expense;

  return (
    <PageContainer
      header={
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Relatório</h1>
          <MonthSelector month={month} onMonthChange={setMonth} />
        </div>
      }
    >
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-6 pb-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-success/10 border-success/20">
              <CardContent className="pt-4 px-3">
                <TrendingUp className="h-5 w-5 text-success mb-1" />
                <p className="text-[10px] text-muted-foreground">Receitas</p>
                <p className="text-sm font-bold text-success tabular-nums">
                  {formatCurrency(totals.income)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="pt-4 px-3">
                <TrendingDown className="h-5 w-5 text-destructive mb-1" />
                <p className="text-[10px] text-muted-foreground">Despesas</p>
                <p className="text-sm font-bold text-destructive tabular-nums">
                  {formatCurrency(totals.expense)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="pt-4 px-3">
                <PiggyBank className="h-5 w-5 text-primary mb-1" />
                <p className="text-[10px] text-muted-foreground">Saldo</p>
                <p className="text-sm font-bold text-primary tabular-nums">
                  {formatCurrency(balance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Total Expenses */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total de Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive tabular-nums">
                {formatCurrency(totalExpenses)}
              </p>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                  ))}
                </div>
              ) : categoryData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Sem despesas neste mês
                </p>
              ) : (
                <div className="space-y-4">
                  {categoryData.map(cat => {
                    const percentage = totalExpenses > 0 
                      ? ((cat.value / totalExpenses) * 100).toFixed(1)
                      : '0';
                    
                    return (
                      <div key={cat.id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: cat.color }}
                            />
                            <span>{cat.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium tabular-nums">
                              {formatCurrency(cat.value)}
                            </span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              ({percentage}%)
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: cat.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Summary List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumo das Transações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Total de receitas</span>
                  <span className="font-medium text-success tabular-nums">
                    +{formatCurrency(totals.income)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Total de despesas</span>
                  <span className="font-medium text-destructive tabular-nums">
                    -{formatCurrency(totals.expense)}
                  </span>
                </div>
                <div className="flex justify-between py-2 font-medium">
                  <span>Saldo do mês</span>
                  <span className={balance >= 0 ? 'text-success' : 'text-destructive'}>
                    {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </PageContainer>
  );
}
