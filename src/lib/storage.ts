import { defaultAdapter, StorageAdapter } from './storageAdapter';
import { migrateSchemaOnce } from './migrations/migrateSchemaOnce';
import { getMonthFromDate, getInvoiceMonth } from './dateUtils';

export type Maybe<T> = T | undefined;

export interface Transaction {
  id: string;
  amount: number;
  date: string; 
  description?: string;
  category?: string;
  type: 'income' | 'expense';
  isCardPayment?: boolean;
  cardId?: string;
  installments?: number;
  currentInstallment?: number;
  parentId?: string;
  createdAt?: string;
  invoiceMonth?: string;
  isRecurring?: boolean;
  recurrenceType?: 'weekly' | 'monthly' | 'yearly';
  recurrenceEndDate?: string;
  recurrenceId?: string; // Groups all recurring instances
  // For card-to-card payments (paying one card with another)
  isCardToCardPayment?: boolean;
  sourceCardId?: string; // The card being used to pay
  targetCardId?: string; // The card being paid off
}

export interface CreditCard {
  id: string;
  name: string;
  last4?: string;
  limit?: number;
  color?: string;
  closingDay?: number; 
  dueDay?: number;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  currency: string;
  currencySymbol: string;
  locale?: string;
}

const TRANSACTIONS_KEY = 'transactions';
const CARDS_KEY = 'creditCards';
const SETTINGS_KEY = 'app_settings';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  currency: 'BRL',
  currencySymbol: 'R$',
};

const categories = [
  { id: 'income', name: 'Receita', icon: 'TrendingUp', type: 'income', color: 'hsl(152, 55%, 50%)' },
  { id: 'food', name: 'Alimentação', icon: 'UtensilsCrossed', type: 'expense', color: 'hsl(38, 90%, 55%)' },
  { id: 'transport', name: 'Transporte', icon: 'Car', type: 'expense', color: 'hsl(200, 75%, 55%)' },
  { id: 'housing', name: 'Moradia', icon: 'Home', type: 'expense', color: 'hsl(280, 60%, 65%)' },
  { id: 'health', name: 'Saúde', icon: 'Heart', type: 'expense', color: 'hsl(0, 65%, 55%)' },
  { id: 'education', name: 'Educação', icon: 'GraduationCap', type: 'expense', color: 'hsl(45, 80%, 55%)' },
  { id: 'leisure', name: 'Lazer', icon: 'Gamepad2', type: 'expense', color: 'hsl(320, 60%, 55%)' },
  { id: 'other', name: 'Outros', icon: 'MoreHorizontal', type: 'expense', color: 'hsl(180, 55%, 50%)' },
];

export function getCategories() {
  return categories;
}

export function getCategoryById(id: string) {
  return categories.find(c => c.id === id) || categories.find(c => c.id === 'other');
}

// Settings
export async function getSettings(): Promise<AppSettings> {
  const settings = await defaultAdapter.getItem<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
  return settings ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await defaultAdapter.setItem(SETTINGS_KEY, settings);
}

// Credit Cards
export async function getCreditCards(): Promise<CreditCard[]> {
  return (await defaultAdapter.getItem<CreditCard[]>(CARDS_KEY, [])) ?? [];
}

export async function getCreditCardById(id: string): Promise<CreditCard | undefined> {
  const cards = await getCreditCards();
  return cards.find(c => c.id === id);
}

export async function addCreditCard(card: CreditCard): Promise<void> {
  const cards = await getCreditCards();
  cards.push(card);
  await defaultAdapter.setItem(CARDS_KEY, cards);
}

export async function updateCreditCard(card: CreditCard): Promise<void> {
  const cards = await getCreditCards();
  const index = cards.findIndex(c => c.id === card.id);
  if (index !== -1) {
    cards[index] = card;
    await defaultAdapter.setItem(CARDS_KEY, cards);
  }
}

export async function deleteCreditCard(id: string): Promise<void> {
  const cards = await getCreditCards();
  const filtered = cards.filter(c => c.id !== id);
  await defaultAdapter.setItem(CARDS_KEY, filtered);
}

export async function getCardPurchases(cardId: string, month?: string): Promise<Transaction[]> {
  const txs = Object.values(await listTransactionObjects());
  return txs.filter(tx => {
    if (tx.cardId !== cardId || !tx.isCardPayment) return false;
    if (month && tx.invoiceMonth) {
      return tx.invoiceMonth === month;
    }
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getCardMonthlyTotal(cardId: string, month: string): Promise<number> {
  const purchases = await getCardPurchases(cardId, month);
  return purchases.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
}

// Transactions
export async function listTransactionObjects(): Promise<Record<string, Transaction>> {
  return (await defaultAdapter.getItem<Record<string, Transaction>>(TRANSACTIONS_KEY, {})) ?? {};
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const txs = Object.values(await listTransactionObjects());
  return txs.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getTransactionsByMonth(month: string): Promise<Transaction[]> {
  const txs = Object.values(await listTransactionObjects());
  return txs
    .filter(tx => {
      if (tx.isCardPayment && tx.invoiceMonth) {
        return tx.invoiceMonth === month;
      }
      return getMonthFromDate(tx.date) === month;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getTransactionById(id: string): Promise<Transaction | undefined> {
  const txs = await listTransactionObjects();
  return txs[id];
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  const txs = await listTransactionObjects();
  tx.createdAt = tx.createdAt ?? new Date().toISOString();
  txs[tx.id] = tx;
  await defaultAdapter.setItem(TRANSACTIONS_KEY, txs);
}

export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  const txs = await listTransactionObjects();
  for (const tx of transactions) {
    tx.createdAt = tx.createdAt ?? new Date().toISOString();
    txs[tx.id] = tx;
  }
  await defaultAdapter.setItem(TRANSACTIONS_KEY, txs);
}

export async function updateTransaction(tx: Transaction): Promise<void> {
  await saveTransaction(tx);
}

export async function deleteTransaction(id: string): Promise<void> {
  const txs = await listTransactionObjects();
  delete txs[id];
  await defaultAdapter.setItem(TRANSACTIONS_KEY, txs);
}

export async function deleteTransactionsByParentId(parentId: string): Promise<void> {
  const txs = await listTransactionObjects();
  // Delete the parent and all children
  const idsToDelete = Object.values(txs)
    .filter(tx => tx.id === parentId || tx.parentId === parentId)
    .map(tx => tx.id);
  
  for (const id of idsToDelete) {
    delete txs[id];
  }
  await defaultAdapter.setItem(TRANSACTIONS_KEY, txs);
}

export async function deleteTransactionsFromDate(
  parentIdOrRecurrenceId: string, 
  fromDate: string,
  isRecurrence: boolean = false
): Promise<void> {
  const txs = await listTransactionObjects();
  const idsToDelete: string[] = [];
  
  for (const tx of Object.values(txs)) {
    const matches = isRecurrence 
      ? tx.recurrenceId === parentIdOrRecurrenceId
      : (tx.id === parentIdOrRecurrenceId || tx.parentId === parentIdOrRecurrenceId);
    
    if (matches && tx.date >= fromDate) {
      idsToDelete.push(tx.id);
    }
  }
  
  for (const id of idsToDelete) {
    delete txs[id];
  }
  await defaultAdapter.setItem(TRANSACTIONS_KEY, txs);
}

export async function deleteTransactionsByRecurrenceId(recurrenceId: string): Promise<void> {
  const txs = await listTransactionObjects();
  const idsToDelete = Object.values(txs)
    .filter(tx => tx.recurrenceId === recurrenceId)
    .map(tx => tx.id);
  
  for (const id of idsToDelete) {
    delete txs[id];
  }
  await defaultAdapter.setItem(TRANSACTIONS_KEY, txs);
}

// Monthly Totals
export async function getMonthlyTotals(month: string): Promise<{ income: number; expense: number }> {
  const txs = await getTransactionsByMonth(month);
  let income = 0;
  let expense = 0;
  
  for (const tx of txs) {
    if (tx.type === 'income') {
      income += Math.abs(tx.amount);
    } else {
      expense += Math.abs(tx.amount);
    }
  }
  
  return { income, expense };
}

export async function getCategoryTotals(month: string): Promise<Record<string, number>> {
  const txs = await getTransactionsByMonth(month);
  const totals: Record<string, number> = {};
  
  for (const tx of txs) {
    if (tx.type === 'expense' && tx.category) {
      totals[tx.category] = (totals[tx.category] || 0) + Math.abs(tx.amount);
    }
  }
  
  return totals;
}

// Get all months that have transactions
export async function getMonthsWithTransactions(): Promise<string[]> {
  const txs = Object.values(await listTransactionObjects());
  const months = new Set<string>();
  
  for (const tx of txs) {
    if (tx.isCardPayment && tx.invoiceMonth) {
      months.add(tx.invoiceMonth);
    }
    months.add(getMonthFromDate(tx.date));
  }
  
  return Array.from(months).sort();
}

// Export/Import
export async function exportAllData(): Promise<string> {
  const [transactions, cards, settings] = await Promise.all([
    listTransactionObjects(),
    getCreditCards(),
    getSettings(),
  ]);
  
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    transactions,
    creditCards: cards,
    settings,
  };
  
  return JSON.stringify(data, null, 2);
}

export async function importAllData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);
  
  if (data.transactions) {
    await defaultAdapter.setItem(TRANSACTIONS_KEY, data.transactions);
  }
  if (data.creditCards) {
    await defaultAdapter.setItem(CARDS_KEY, data.creditCards);
  }
  if (data.settings) {
    await defaultAdapter.setItem(SETTINGS_KEY, data.settings);
  }
}

// Clear all data
export async function clearAllData(): Promise<void> {
  await defaultAdapter.clear();
}

export default {
  getCreditCards,
  getCreditCardById,
  addCreditCard,
  updateCreditCard,
  deleteCreditCard,
  saveTransaction,
  saveTransactions,
  getTransactionsByMonth,
  getAllTransactions,
  listTransactionObjects,
  deleteTransaction,
  deleteTransactionsByParentId,
  getMonthlyTotals,
  getCategoryTotals,
  getSettings,
  saveSettings,
  exportAllData,
  importAllData,
};
