import { useState, useMemo } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { BalanceCard } from '@/components/home/BalanceCard';
import { MonthSelector } from '@/components/transactions/MonthSelector';
import { TransactionList } from '@/components/transactions/TransactionList';
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet';
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { getCurrentMonth } from '@/lib/formatters';
import { Transaction } from '@/lib/storage';

export default function HomePage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const { transactions, loading, totals, balance, addTransaction, removeTransaction } = 
    useTransactions(month);
  const { cards } = useCreditCards();

  // Filter transactions by search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const query = searchQuery.toLowerCase();
    return transactions.filter(tx =>
      tx.description?.toLowerCase().includes(query) ||
      tx.category?.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  const handleDelete = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
  };

  const handleConfirmDelete = (id: string, deleteType: 'single' | 'fromThis' | 'all') => {
    removeTransaction(id, deleteType);
    setTransactionToDelete(null);
  };

  return (
    <PageContainer
      header={
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">FinançasPRO</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
            >
              {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </Button>
          </div>

          {showSearch && (
            <Input
              placeholder="Buscar transações..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="animate-fade-in"
              autoFocus
            />
          )}

          <MonthSelector month={month} onMonthChange={setMonth} />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Balance Card */}
        <BalanceCard
          balance={balance}
          income={totals.income}
          expense={totals.expense}
          loading={loading}
        />

        {/* Transactions */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Transações</h2>
          <ScrollArea className="h-[calc(100vh-420px)]">
            <TransactionList
              transactions={filteredTransactions}
              loading={loading}
              onDelete={handleDelete}
              showActions
              emptyMessage={
                searchQuery
                  ? 'Nenhuma transação encontrada para esta busca'
                  : 'Nenhuma transação neste mês'
              }
            />
          </ScrollArea>
        </section>
      </div>

      {/* FAB - Add Transaction */}
      <Button
        size="lg"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
        onClick={() => setShowAddSheet(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add Transaction Sheet */}
      <AddTransactionSheet
        open={showAddSheet}
        onOpenChange={setShowAddSheet}
        onSubmit={addTransaction}
        cards={cards}
      />

      {/* Delete Transaction Dialog */}
      <DeleteTransactionDialog
        transaction={transactionToDelete}
        open={!!transactionToDelete}
        onOpenChange={(open) => !open && setTransactionToDelete(null)}
        onDelete={handleConfirmDelete}
      />
    </PageContainer>
  );
}
