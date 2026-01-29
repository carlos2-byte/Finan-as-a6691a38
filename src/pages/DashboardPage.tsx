import { useState, useMemo } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, getCurrentMonth, getPreviousMonth, getMonthsInRange, formatMonthYear } from '@/lib/formatters';
import { getCategories, getCategoryById } from '@/lib/storage';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

type Period = '1m' | '3m' | '6m' | '12m';

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('3m');
  const currentMonth = getCurrentMonth();
  
  // Calculate months to show based on period
  const monthsToShow = useMemo(() => {
    const monthCount = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[period];
    let startMonth = currentMonth;
    for (let i = 0; i < monthCount - 1; i++) {
      startMonth = getPreviousMonth(startMonth);
    }
    return getMonthsInRange(startMonth, currentMonth);
  }, [period, currentMonth]);

  const { transactions, totals, categoryTotals, loading } = useTransactions();

  // Calculate chart data for each month
  const chartData = useMemo(() => {
    const monthlyData: Record<string, { income: number; expense: number }> = {};
    
    // Initialize all months
    monthsToShow.forEach(month => {
      monthlyData[month] = { income: 0, expense: 0 };
    });

    // Aggregate transactions
    transactions.forEach(tx => {
      const txMonth = tx.date.slice(0, 7);
      if (monthlyData[txMonth]) {
        if (tx.type === 'income') {
          monthlyData[txMonth].income += tx.amount;
        } else {
          monthlyData[txMonth].expense += Math.abs(tx.amount);
        }
      }
    });

    return monthsToShow.map(month => ({
      month: formatMonthYear(month).split(' ')[0].slice(0, 3),
      Receitas: monthlyData[month].income,
      Despesas: monthlyData[month].expense,
    }));
  }, [transactions, monthsToShow]);

  // Category breakdown for current month
  const categoryData = useMemo(() => {
    const categories = getCategories().filter(c => c.type === 'expense');
    return categories
      .map(cat => ({
        name: cat.name,
        value: categoryTotals[cat.id] || 0,
        color: cat.color,
      }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categoryTotals]);

  const totalExpenses = Object.values(categoryTotals).reduce((sum, v) => sum + v, 0);

  return (
    <PageContainer
      header={
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 mês</SelectItem>
              <SelectItem value="3m">3 meses</SelectItem>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="space-y-6">
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
                {formatCurrency(totals.income - totals.expense)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart - Monthly Evolution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Sem despesas neste mês
              </p>
            ) : (
              <div className="space-y-3">
                {categoryData.map(cat => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{cat.name}</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(cat.value)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(cat.value / totalExpenses) * 100}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
