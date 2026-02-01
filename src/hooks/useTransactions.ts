import { useState, useEffect, useCallback } from 'react';
import {
  Transaction,
  getAllTransactions,
  getTransactionsByMonth,
  saveTransaction,
  saveTransactions,
  deleteTransaction,
  deleteTransactionsByParentId,
  deleteTransactionsFromDate,
  deleteTransactionsByRecurrenceId,
  getMonthlyTotals,
  getCategoryTotals,
  getCreditCardById,
  updateCreditCard,
  getTransactionById,
} from '@/lib/storage';
import { generateId, getCurrentMonth } from '@/lib/formatters';
import { addMonthsToDate, addWeeksToDate, addYearsToDate, getInvoiceMonth, getLocalDateString } from '@/lib/dateUtils';

interface AddTransactionOptions {
  installments?: number;
  isInstallmentTotal?: boolean; // true = valor é o total, false = valor é da parcela
  isRecurring?: boolean;
  recurrenceType?: 'weekly' | 'monthly' | 'yearly';
  recurrenceEndDate?: string;
}

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
      tx: Omit<Transaction, 'id' | 'createdAt'>,
      options: AddTransactionOptions = {}
    ) => {
      const { 
        installments = 1, 
        isInstallmentTotal = true,
        isRecurring = false,
        recurrenceType = 'monthly',
        recurrenceEndDate,
      } = options;

      // Get card info if it's a card payment
      let closingDay = 25;
      let card = null;
      if (tx.isCardPayment && tx.cardId) {
        card = await getCreditCardById(tx.cardId);
        if (card?.closingDay) {
          closingDay = card.closingDay;
        }
      }

      // Helper to consume card limit
      const consumeCardLimit = async (amount: number) => {
        if (card && card.limit && tx.type === 'expense') {
          const newLimit = card.limit - Math.abs(amount);
          await updateCreditCard({ ...card, limit: newLimit });
          card.limit = newLimit; // Update local reference for subsequent calls
        }
      };

      // Handle recurring transactions
      if (isRecurring && recurrenceEndDate) {
        const recurrenceId = generateId();
        const recurringTransactions: Transaction[] = [];
        let currentDate = tx.date;
        let totalAmount = 0;
        
        while (currentDate <= recurrenceEndDate) {
          let invoiceMonth: string | undefined;
          if (tx.isCardPayment) {
            invoiceMonth = getInvoiceMonth(currentDate, closingDay);
          }

          recurringTransactions.push({
            ...tx,
            id: generateId(),
            amount: tx.type === 'expense' ? -Math.abs(tx.amount) : Math.abs(tx.amount),
            date: currentDate,
            isRecurring: true,
            recurrenceType,
            recurrenceId,
            invoiceMonth,
          });
          
          totalAmount += Math.abs(tx.amount);

          // Calculate next date based on recurrence type
          switch (recurrenceType) {
            case 'weekly':
              currentDate = addWeeksToDate(currentDate, 1);
              break;
            case 'yearly':
              currentDate = addYearsToDate(currentDate, 1);
              break;
            case 'monthly':
            default:
              currentDate = addMonthsToDate(currentDate, 1);
              break;
          }
        }

        await saveTransactions(recurringTransactions);
        await consumeCardLimit(totalAmount);
      } else if (installments > 1) {
        // Create installment transactions
        const parentId = generateId();
        const installmentTransactions: Transaction[] = [];
        
        // Calculate amount per installment
        const installmentAmount = isInstallmentTotal 
          ? tx.amount / installments 
          : tx.amount;
        
        const totalAmount = isInstallmentTotal ? tx.amount : tx.amount * installments;

        for (let i = 0; i < installments; i++) {
          const installmentDate = addMonthsToDate(tx.date, i);
          
          let invoiceMonth: string | undefined;
          if (tx.isCardPayment) {
            invoiceMonth = getInvoiceMonth(installmentDate, closingDay);
          }

          installmentTransactions.push({
            ...tx,
            id: i === 0 ? parentId : generateId(),
            parentId: i === 0 ? undefined : parentId,
            amount: tx.type === 'expense' ? -Math.abs(installmentAmount) : Math.abs(installmentAmount),
            date: installmentDate,
            installments,
            currentInstallment: i + 1,
            description: `${tx.description || ''} (${i + 1}/${installments})`.trim(),
            invoiceMonth,
          });
        }

        await saveTransactions(installmentTransactions);
        await consumeCardLimit(totalAmount);
      } else {
        // Single transaction
        let invoiceMonth: string | undefined;
        if (tx.isCardPayment) {
          invoiceMonth = getInvoiceMonth(tx.date, closingDay);
        }

        const newTx: Transaction = {
          ...tx,
          id: generateId(),
          amount: tx.type === 'expense' ? -Math.abs(tx.amount) : Math.abs(tx.amount),
          invoiceMonth,
        };
        await saveTransaction(newTx);
        await consumeCardLimit(Math.abs(tx.amount));
      }

      await loadTransactions();
    },
    [loadTransactions]
  );

  const updateTransactionItem = useCallback(
    async (
      id: string, 
      updates: Partial<Transaction>,
      updateType: 'single' | 'fromThis' | 'all' = 'single'
    ) => {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      if (updateType === 'single') {
        await saveTransaction({ ...tx, ...updates });
      } else if (updateType === 'fromThis') {
        // Update this and all future installments/recurrences
        const allTxs = await getAllTransactions();
        const relatedTxs = allTxs.filter(t => {
          if (tx.recurrenceId) {
            return t.recurrenceId === tx.recurrenceId && t.date >= tx.date;
          }
          if (tx.parentId || tx.installments) {
            const parentId = tx.parentId || tx.id;
            return (t.id === parentId || t.parentId === parentId) && t.date >= tx.date;
          }
          return t.id === tx.id;
        });

        for (const relatedTx of relatedTxs) {
          await saveTransaction({ ...relatedTx, ...updates });
        }
      } else if (updateType === 'all') {
        // Update all related transactions
        const allTxs = await getAllTransactions();
        const relatedTxs = allTxs.filter(t => {
          if (tx.recurrenceId) {
            return t.recurrenceId === tx.recurrenceId;
          }
          if (tx.parentId || tx.installments) {
            const parentId = tx.parentId || tx.id;
            return t.id === parentId || t.parentId === parentId;
          }
          return t.id === tx.id;
        });

        for (const relatedTx of relatedTxs) {
          await saveTransaction({ ...relatedTx, ...updates });
        }
      }

      await loadTransactions();
    },
    [loadTransactions, transactions]
  );

  const removeTransaction = useCallback(
    async (
      id: string, 
      deleteType: 'single' | 'fromThis' | 'all' = 'single'
    ) => {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      // Helper function to restore card limit for a transaction
      const restoreCardLimit = async (transaction: Transaction) => {
        if (transaction.isCardPayment && transaction.cardId) {
          const card = await getCreditCardById(transaction.cardId);
          if (card && card.limit) {
            const restoredLimit = (card.limit || 0) + Math.abs(transaction.amount);
            await updateCreditCard({ ...card, limit: restoredLimit });
          }
        }
      };

      if (deleteType === 'single') {
        await restoreCardLimit(tx);
        await deleteTransaction(id);
      } else if (deleteType === 'fromThis') {
        // Delete this and all future
        const allTxs = await getAllTransactions();
        const toDelete = allTxs.filter(t => {
          if (tx.recurrenceId) {
            return t.recurrenceId === tx.recurrenceId && t.date >= tx.date;
          }
          if (tx.parentId || (tx.installments && tx.installments > 1)) {
            const parentId = tx.parentId || tx.id;
            return (t.id === parentId || t.parentId === parentId) && t.date >= tx.date;
          }
          return t.id === tx.id;
        });
        
        // Restore limits for all transactions being deleted
        for (const t of toDelete) {
          await restoreCardLimit(t);
        }
        
        if (tx.recurrenceId) {
          await deleteTransactionsFromDate(tx.recurrenceId, tx.date, true);
        } else if (tx.parentId) {
          await deleteTransactionsFromDate(tx.parentId, tx.date, false);
        } else if (tx.installments && tx.installments > 1) {
          await deleteTransactionsFromDate(tx.id, tx.date, false);
        } else {
          await deleteTransaction(id);
        }
      } else if (deleteType === 'all') {
        // Delete all related
        const allTxs = await getAllTransactions();
        const toDelete = allTxs.filter(t => {
          if (tx.recurrenceId) {
            return t.recurrenceId === tx.recurrenceId;
          }
          if (tx.parentId || (tx.installments && tx.installments > 1)) {
            const parentId = tx.parentId || tx.id;
            return t.id === parentId || t.parentId === parentId;
          }
          return t.id === tx.id;
        });
        
        // Restore limits for all transactions being deleted
        for (const t of toDelete) {
          await restoreCardLimit(t);
        }
        
        if (tx.recurrenceId) {
          await deleteTransactionsByRecurrenceId(tx.recurrenceId);
        } else if (tx.parentId) {
          await deleteTransactionsByParentId(tx.parentId);
        } else if (tx.installments && tx.installments > 1) {
          await deleteTransactionsByParentId(tx.id);
        } else {
          await deleteTransaction(id);
        }
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
    updateTransaction: updateTransactionItem,
    removeTransaction,
    refresh: loadTransactions,
  };
}
