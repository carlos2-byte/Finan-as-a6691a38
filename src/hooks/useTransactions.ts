import { useState, useEffect, useCallback } from 'react';
import {
  Transaction,
  getAllTransactions,
  getTransactionsByMonth,
  saveTransaction,
  saveTransactions,
  deleteTransaction,
  deleteTransactionsByParentId,
  getMonthlyTotals,
  getCategoryTotals,
} from '@/lib/storage';
import { generateId, getCurrentMonth, getNextMonth } from '@/lib/formatters';

export function useTransactions(month?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});

  const currentMonth = month || getCurrentMonth();

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const txs = month
        ? await getTransactionsByMonth(month)
        : await getAllTransactions();
      setTransactions(txs);

      const monthlyTotals = await getMonthlyTotals(currentMonth);
      setTotals(monthlyTotals);

      const catTotals = await getCategoryTotals(currentMonth);
      setCategoryTotals(catTotals);
    } finally {
      setLoading(false);
    }
  }, [month, currentMonth]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const addTransaction = useCallback(
    async (
      tx: Omit<Transaction, 'id' | 'createdAt'> & { installments?: number }
    ) => {
      const { installments = 1, ...txData } = tx;

      if (installments > 1) {
        // Create installment transactions
        const parentId = generateId();
        const installmentTransactions: Transaction[] = [];
        const baseDate = new Date(txData.date);
        const installmentAmount = txData.amount / installments;

        for (let i = 0; i < installments; i++) {
          const installmentDate = new Date(baseDate);
          installmentDate.setMonth(installmentDate.getMonth() + i);

          installmentTransactions.push({
            ...txData,
            id: i === 0 ? parentId : generateId(),
            parentId: i === 0 ? undefined : parentId,
            amount: txData.type === 'expense' ? -Math.abs(installmentAmount) : installmentAmount,
            date: installmentDate.toISOString().split('T')[0],
            installments,
            currentInstallment: i + 1,
            description: `${txData.description || ''} (${i + 1}/${installments})`.trim(),
          });
        }

        await saveTransactions(installmentTransactions);
      } else {
        const newTx: Transaction = {
          ...txData,
          id: generateId(),
          amount: txData.type === 'expense' ? -Math.abs(txData.amount) : Math.abs(txData.amount),
        };
        await saveTransaction(newTx);
      }

      await loadTransactions();
    },
    [loadTransactions]
  );

  const removeTransaction = useCallback(
    async (id: string, deleteAllInstallments = false) => {
      const tx = transactions.find(t => t.id === id);
      
      if (deleteAllInstallments && tx?.parentId) {
        await deleteTransactionsByParentId(tx.parentId);
      } else if (deleteAllInstallments && tx?.installments && tx.installments > 1) {
        await deleteTransactionsByParentId(id);
      } else {
        await deleteTransaction(id);
      }
      
      await loadTransactions();
    },
    [loadTransactions, transactions]
  );

  const balance = totals.income - totals.expense;

  return {
    transactions,
    loading,
    totals,
    categoryTotals,
    balance,
    addTransaction,
    removeTransaction,
    refresh: loadTransactions,
  };
}
