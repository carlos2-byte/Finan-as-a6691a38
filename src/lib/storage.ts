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
}

export interface CreditCard {
  id: string;
  name: string;
  last4?: string;
  limit?: number;
  color?: string;
  closingDay: number; 
  dueDay: number; // Adicionado campo de vencimento
}

const TRANSACTIONS_KEY = 'transactions';
const CARDS_KEY = 'creditCards';

export function getCategories() {
  return [
    { id: 'income', name: 'Receita', icon: 'TrendingUp', type: 'income', color: 'hsl(152, 55%, 50%)' },
    { id: 'food', name: 'Alimentação', icon: 'UtensilsCrossed', type: 'expense', color: 'hsl(38, 90%, 55%)' },
    { id: 'transport', name: 'Transporte', icon: 'Car', type: 'expense', color: 'hsl(200, 75%, 55%)' },
    { id: 'housing', name: 'Moradia', icon: 'Home', type: 'expense', color: 'hsl(280, 60%, 65%)' },
    { id: 'health', name: 'Saúde', icon: 'Heart', type: 'expense', color: 'hsl(0, 65%, 55%)' },
    { id: 'leisure', name: 'Lazer', icon: 'Gamepad2', type: 'expense', color: 'hsl(320, 60%, 55%)' },
    { id: 'other', name: 'Outros', icon: 'MoreHorizontal', type: 'expense', color: 'hsl(180, 55%, 50%)' },
  ];
}

export async function getCreditCards(): Promise<CreditCard[]> {
  return (await defaultAdapter.getItem<CreditCard[]>(CARDS_KEY, [])) ?? [];
}

export async function addCreditCard(card: CreditCard): Promise<void> {
  const cards = await getCreditCards();
  cards.push(card);
  await defaultAdapter.setItem(CARDS_KEY, cards);
}

export async function listTransactionObjects(): Promise<Record<string, Transaction>> {
  return (await defaultAdapter.getItem<Record<string, Transaction>>(TRANSACTIONS_KEY, {})) ?? {};
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  const txs = await listTransactionObjects();
  tx.createdAt = tx.createdAt ?? new Date().toISOString();
  txs[tx.id] = tx;
  await defaultAdapter.setItem(TRANSACTIONS_KEY, txs);
}

// ... (Mantenha as outras funções de delete e listagem iguais ao seu original)
export default {
  addCreditCard,
  getCreditCards,
  saveTransaction,
  listTransactionObjects,
};
