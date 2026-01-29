import { formatCurrency } from '@/lib/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceCardProps {
  balance: number;
  income: number;
  expense: number;
  loading?: boolean;
}

export function BalanceCard({ balance, income, expense, loading }: BalanceCardProps) {
  return (
    <Card className="bg-gradient-to-br from-primary/20 to-accent/10 border-primary/20">
      <CardContent className="pt-6">
        {/* Main Balance */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-1">Saldo atual</p>
          <p
            className={cn(
              'text-3xl font-bold tabular-nums',
              balance >= 0 ? 'text-success' : 'text-destructive'
            )}
          >
            {loading ? '...' : formatCurrency(balance)}
          </p>
        </div>

        {/* Income / Expense Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Income */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/20">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entradas</p>
              <p className="font-semibold text-success tabular-nums">
                {loading ? '...' : formatCurrency(income)}
              </p>
            </div>
          </div>

          {/* Expense */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/20">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saídas</p>
              <p className="font-semibold text-destructive tabular-nums">
                {loading ? '...' : formatCurrency(expense)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
