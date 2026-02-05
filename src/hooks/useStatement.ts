import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@/lib/storage';
import { 
  ConsolidatedInvoice, 
  getStatementTransactions, 
  getStatementTotals 
} from '@/lib/invoiceUtils';
import { getCurrentMonth } from '@/lib/formatters';
import { calculateProjectedBalance } from '@/lib/projectedBalance';
import { getLocalMonth } from '@/lib/dateUtils';

export type StatementItem = Transaction | ConsolidatedInvoice;

export function isConsolidatedInvoice(item: StatementItem): item is ConsolidatedInvoice {
  return 'isConsolidatedInvoice' in item && item.isConsolidatedInvoice === true;
}

interface ProjectedData {
  projectedBalance: number;
  dailyYield: number;
  remainingExpenses: number;
  paidExpenses: number;
}

export function useStatement(month?: string) {
  const [items, setItems] = useState<StatementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [projected, setProjected] = useState<ProjectedData | null>(null);

  const currentMonth = month || getCurrentMonth();

  const loadStatement = useCallback(async () => {
    setLoading(true);
    try {
      const [statementItems, statementTotals] = await Promise.all([
        getStatementTransactions(currentMonth),
        getStatementTotals(currentMonth),
      ]);
      
      setItems(statementItems);
      setTotals(statementTotals);
      
      // Calculate projected balance only for current month
      const viewingCurrentMonth = currentMonth === getLocalMonth();
      if (viewingCurrentMonth) {
        const projectedData = await calculateProjectedBalance(
          currentMonth,
          statementTotals.income,
          statementTotals.expense
        );
        setProjected(projectedData);
      } else {
        setProjected(null);
      }
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const balance = totals.income - totals.expense;

  return {
    items,
    loading,
    totals,
    balance,
    projected,
    refresh: loadStatement,
  };
}
