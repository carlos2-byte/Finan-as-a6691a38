import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@/lib/storage';
import { 
  ConsolidatedInvoice, 
  getStatementTransactions, 
  getStatementTotals 
} from '@/lib/invoiceUtils';
import { getCurrentMonth } from '@/lib/formatters';

export type StatementItem = Transaction | ConsolidatedInvoice;

export function isConsolidatedInvoice(item: StatementItem): item is ConsolidatedInvoice {
  return 'isConsolidatedInvoice' in item && item.isConsolidatedInvoice === true;
}

export function useStatement(month?: string) {
  const [items, setItems] = useState<StatementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ income: 0, expense: 0 });

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
    refresh: loadStatement,
  };
}
