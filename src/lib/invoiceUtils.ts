/**
 * Invoice utilities for credit card billing logic
 * 
 * Invoice period: From (F+1) of previous month to (F) of current month
 * where F = closing day defined by user
 */

import { Transaction, CreditCard, getCreditCards, getAllTransactions } from './storage';
import { 
  parseLocalMonth, 
  getLocalDateString, 
  getLocalMonth,
  getNextMonthLocal,
  getPreviousMonthLocal,
  parseLocalDate,
} from './dateUtils';

export interface ConsolidatedInvoice {
  id: string;
  cardId: string;
  cardName: string;
  invoiceMonth: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD
  total: number;
  transactions: Transaction[];
  type: 'expense' | 'income';
  isConsolidatedInvoice: true;
}

/**
 * Calculate which invoice month a transaction belongs to based on closing day
 * 
 * Rule: Transactions from (F+1) of previous month to (F) of current month
 * belong to the invoice of that month.
 * 
 * Example: Closing day 25
 * - Transaction on Jan 20 -> January invoice (before closing)
 * - Transaction on Jan 26 -> February invoice (after closing)
 */
export function calculateInvoiceMonth(transactionDate: string, closingDay: number): string {
  const date = parseLocalDate(transactionDate);
  const day = date.getDate();
  const transactionMonth = getLocalMonth(date);
  
  if (day <= closingDay) {
    // Before or on closing day -> current month invoice
    return transactionMonth;
  } else {
    // After closing day -> next month invoice
    return getNextMonthLocal(transactionMonth);
  }
}

/**
 * Calculate the due date for an invoice
 * 
 * Rule: If dueDay > closingDay, due date is in the invoice month
 * If dueDay <= closingDay, due date is in the month after invoice month
 */
export function calculateDueDate(invoiceMonth: string, closingDay: number, dueDay: number): string {
  const invoiceDate = parseLocalMonth(invoiceMonth);
  
  if (dueDay > closingDay) {
    // Due day is after closing day in the same month
    invoiceDate.setDate(dueDay);
    return getLocalDateString(invoiceDate);
  } else {
    // Due day is before or equal to closing day, so it's in the next month
    invoiceDate.setMonth(invoiceDate.getMonth() + 1);
    invoiceDate.setDate(dueDay);
    return getLocalDateString(invoiceDate);
  }
}

/**
 * Get all consolidated invoices for a specific month
 * Returns invoices that have their due date in the specified month
 */
export async function getConsolidatedInvoicesForMonth(
  targetMonth: string
): Promise<ConsolidatedInvoice[]> {
  const cards = await getCreditCards();
  const allTransactions = await getAllTransactions();
  
  const invoices: ConsolidatedInvoice[] = [];
  
  for (const card of cards) {
    if (!card.closingDay || !card.dueDay) continue;
    
    // Get all card transactions
    const cardTransactions = allTransactions.filter(
      tx => tx.isCardPayment && tx.cardId === card.id && tx.type === 'expense'
    );
    
    // Group by invoice month
    const byInvoiceMonth = new Map<string, Transaction[]>();
    
    for (const tx of cardTransactions) {
      const invoiceMonth = tx.invoiceMonth || calculateInvoiceMonth(tx.date, card.closingDay);
      const existing = byInvoiceMonth.get(invoiceMonth) || [];
      existing.push(tx);
      byInvoiceMonth.set(invoiceMonth, existing);
    }
    
    // Find invoices whose due date falls in the target month
    for (const [invoiceMonth, transactions] of byInvoiceMonth) {
      const dueDate = calculateDueDate(invoiceMonth, card.closingDay, card.dueDay);
      const dueDateMonth = getLocalMonth(parseLocalDate(dueDate));
      
      if (dueDateMonth === targetMonth) {
        const total = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        
        if (total > 0) {
          invoices.push({
            id: `invoice-${card.id}-${invoiceMonth}`,
            cardId: card.id,
            cardName: card.name,
            invoiceMonth,
            dueDate,
            total,
            transactions,
            type: 'expense',
            isConsolidatedInvoice: true,
          });
        }
      }
    }
  }
  
  return invoices;
}

/**
 * Get transactions for the main statement view
 * - Excludes individual card transactions
 * - Includes consolidated invoices as single entries on their due dates
 */
export async function getStatementTransactions(
  targetMonth: string
): Promise<(Transaction | ConsolidatedInvoice)[]> {
  const allTransactions = await getAllTransactions();
  
  // Filter out card transactions (they'll be shown as consolidated invoices)
  const nonCardTransactions = allTransactions.filter(tx => {
    // Include if not a card payment
    if (!tx.isCardPayment) {
      // Check if transaction date is in target month
      const txMonth = getLocalMonth(parseLocalDate(tx.date));
      return txMonth === targetMonth;
    }
    return false;
  });
  
  // Get consolidated invoices for this month
  const invoices = await getConsolidatedInvoicesForMonth(targetMonth);
  
  // Combine and sort by date (due date for invoices, transaction date for others)
  const combined: (Transaction | ConsolidatedInvoice)[] = [
    ...nonCardTransactions,
    ...invoices,
  ];
  
  combined.sort((a, b) => {
    const dateA = 'dueDate' in a ? a.dueDate : a.date;
    const dateB = 'dueDate' in b ? b.dueDate : b.date;
    return dateB.localeCompare(dateA);
  });
  
  return combined;
}

/**
 * Calculate statement totals (excluding card transaction details, including invoice totals)
 */
export async function getStatementTotals(
  targetMonth: string
): Promise<{ income: number; expense: number }> {
  const items = await getStatementTransactions(targetMonth);
  
  let income = 0;
  let expense = 0;
  
  for (const item of items) {
    if ('isConsolidatedInvoice' in item && item.isConsolidatedInvoice) {
      // Consolidated invoice
      expense += item.total;
    } else {
      // Regular transaction
      const tx = item as Transaction;
      if (tx.type === 'income') {
        income += Math.abs(tx.amount);
      } else {
        expense += Math.abs(tx.amount);
      }
    }
  }
  
  return { income, expense };
}
