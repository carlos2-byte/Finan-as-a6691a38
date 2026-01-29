import { defaultAdapter, StorageAdapter } from './storageAdapter';
import { migrateSchemaOnce } from './migrations/migrateSchemaOnce';

export type Maybe<T> = T | undefined;

/* =========================
 * TRANSACTIONS
 * ========================= */
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
  parentId?: string; // For installment grouping
  createdAt?: string;
}

const TRANSACTIONS_KEY = 'transactions';

/* =========================
 * CREDIT CARDS
 * ========================= */
export interface CreditCard {
  id: string;
  name: string;
  last4?: string;
  limit?: number;
  color?: string;
}

const CARDS_KEY = 'creditCards';

/* =========================
 * CATEGORIES
 * ========================= */
export interface Category {
  id: string;
  name: string;
  icon?: string;
  type: 'income' | 'expense';
  color?: string;
}

export function getCategories(): Category[] {
  return [
    { id: 'income', name: 'Receita', icon: 'TrendingUp', type: 'income', color: 'hsl(152, 55%, 50%)' },
    { id: 'food', name: 'Alimentação', icon: 'UtensilsCrossed', type: 'expense', color: 'hsl(38, 90%, 55%)' },
    { id: 'transport', name: 'Transporte', icon: 'Car', type: 'expense', color: 'hsl(200, 75%, 55%)' },
    { id: 'housing', name: 'Moradia', icon: 'Home', type: 'expense', color: 'hsl(280, 60%, 65%)' },
    { id: 'health', name: 'Saúde', icon: 'Heart', type: 'expense', color: 'hsl(0, 65%, 55%)' },
    { id: 'education', name: 'Educação', icon: 'GraduationCap', type: 'expense', color: 'hsl(220, 70%, 55%)' },
    { id: 'leisure', name: 'Lazer', icon: 'Gamepad2', type: 'expense', color: 'hsl(320, 60%, 55%)' },
    { id: 'other', name: 'Outros', icon: 'MoreHorizontal', type: 'expense', color: 'hsl(180, 55%, 50%)' },
  ];
}

export function getCategoryById(id: string): Category | undefined {
  return getCategories().find(c => c.id === id);
}

/* =========================
 * APP SETTINGS
 * ========================= */
export interface AppSettings {
  theme: 'light' | 'dark';
  currency: string;
  currencySymbol: string;
  locale: string;
}

const SETTINGS_KEY = 'appSettings';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  currency: 'BRL',
  currencySymbol: 'R$',
  locale: 'pt-BR',
};

/* =========================
 * MIGRATIONS
 * ========================= */
async function ensureMigrations(adapter: StorageAdapter = defaultAdapter) {
  try {
    await migrateSchemaOnce(adapter);
  } catch (err) {
    console.warn('Migration failed', err);
  }
}

/* =========================
 * RAW GET / SET
 * ========================= */
export async function getRaw<T = unknown>(
  key: string,
  adapter: StorageAdapter = defaultAdapter
): Promise<Maybe<T>> {
  return adapter.getItem<T>(key, undefined as unknown as T);
}

export async function setRaw<T = unknown>(
  key: string,
  value: T,
  adapter: StorageAdapter = defaultAdapter
): Promise<void> {
  return adapter.setItem<T>(key, value);
}

/* =========================
 * TRANSACTION HELPERS
 * ========================= */
export async function listTransactionObjects(): Promise<Record<string, Transaction>> {
  await ensureMigrations();
  return (
    (await defaultAdapter.getItem<Record<string, Transaction>>(TRANSACTIONS_KEY, {})) ??
    {}
  );
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const txs = await listTransactionObjects();
  return Object.values(txs).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
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

export async function deleteTransaction(id: string): Promise<void> {
  const txs = await listTransactionObjects();
  delete txs[id];
  await defaultAdapter.setItem(TRANSACTIONS_KEY, txs);
}

export async function deleteTransactionsByParentId(parentId: string): Promise<void> {
  const txs = await listTransactionObjects();
  const filtered = Object.fromEntries(
    Object.entries(txs).filter(([_, tx]) => tx.parentId !== parentId && tx.id !== parentId)
  );
  await defaultAdapter.setItem(TRANSACTIONS_KEY, filtered);
}

export async function getTransactionsByMonth(month: string): Promise<Transaction[]> {
  const txs = Object.values(await listTransactionObjects());
  return txs
    .filter(tx => tx.date.startsWith(month))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/* =========================
 * CREDIT CARD HELPERS
 * ========================= */
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
  if (index >= 0) {
    cards[index] = card;
    await defaultAdapter.setItem(CARDS_KEY, cards);
  }
}

export async function deleteCreditCard(cardId: string): Promise<void> {
  const cards = await getCreditCards();
  const updated = cards.filter(c => c.id !== cardId);
  await defaultAdapter.setItem(CARDS_KEY, updated);
}

export async function getCardPurchases(cardId: string): Promise<Transaction[]> {
  const txs = Object.values(await listTransactionObjects());
  return txs
    .filter(tx => tx.isCardPayment && tx.cardId === cardId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getCardMonthlyTotal(cardId: string, month: string): Promise<number> {
  const purchases = await getCardPurchases(cardId);
  return purchases
    .filter(tx => tx.date.startsWith(month))
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
}

/* =========================
 * ANALYTICS HELPERS
 * ========================= */
export async function getMonthlyTotals(month: string): Promise<{ income: number; expense: number }> {
  const txs = await getTransactionsByMonth(month);
  const income = txs
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const expense = txs
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
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

/* =========================
 * SETTINGS
 * ========================= */
export async function getSettings(): Promise<AppSettings> {
  const settings = await defaultAdapter.getItem<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  await defaultAdapter.setItem<AppSettings>(SETTINGS_KEY, { ...current, ...settings });
}

export async function initializeSettings(): Promise<AppSettings> {
  const existing = await getSettings();
  await saveSettings(existing);
  return existing;
}

/* =========================
 * EXPORT / IMPORT
 * ========================= */
export async function exportAllData(): Promise<string> {
  const transactions = await listTransactionObjects();
  const cards = await getCreditCards();
  const settings = await getSettings();
  
  const data = {
    version: 1,
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
    await saveSettings(data.settings);
  }
}

/* =========================
 * EXPORT DEFAULT
 * ========================= */
export default {
  getRaw,
  setRaw,
  listTransactionObjects,
  getAllTransactions,
  saveTransaction,
  saveTransactions,
  deleteTransaction,
  deleteTransactionsByParentId,
  getTransactionsByMonth,
  getCategories,
  getCategoryById,
  getCreditCards,
  getCreditCardById,
  addCreditCard,
  updateCreditCard,
  deleteCreditCard,
  getCardPurchases,
  getCardMonthlyTotal,
  getMonthlyTotals,
  getCategoryTotals,
  getSettings,
  saveSettings,
  initializeSettings,
  exportAllData,
  importAllData,
};
