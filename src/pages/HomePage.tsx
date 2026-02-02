import { useState, useMemo } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { BalanceCard } from '@/components/home/BalanceCard';
import { MonthSelector } from '@/components/transactions/MonthSelector';
import { StatementList } from '@/components/transactions/StatementList';
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet';
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog';
import { EditTransactionDialog } from '@/components/transactions/EditTransactionDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStatement, isConsolidatedInvoice } from '@/hooks/useStatement';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { getCurrentMonth } from '@/lib/formatters';
import { Transaction } from '@/lib/storage';
import { ConsolidatedInvoice } from '@/lib/invoiceUtils';

export default function HomePage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(getCurrentMonth());
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pendingEditType, setPendingEditType] = useState<'single' | 'fromThis' | 'all'>('single');

  // Use the new statement hook for display
  const { items, loading, totals, balance, refresh: refreshStatement } = useStatement(month);
  
  // Keep useTransactions for CRUD operations
  const { addTransaction, updateTransaction, removeTransaction } = useTransactions(month);
  const { cards } = useCreditCards();

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => {
      if (isConsolidatedInvoice(item)) {
        return item.cardName.toLowerCase().includes(query) || 
               item.transactions.some(tx => 
                 tx.description?.toLowerCase().includes(query) ||
                 tx.category?.toLowerCase().includes(query)
               );
      }
      return item.description?.toLowerCase().includes(query) ||
             item.category?.toLowerCase().includes(query);
    });
  }, [items, searchQuery]);

  const handleDelete = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
  };

  const handleConfirmDelete = async (id: string, deleteType: 'single' | 'fromThis' | 'all') => {
    await removeTransaction(id, deleteType);
    setTransactionToDelete(null);
    refreshStatement();
  };

  const handleEdit = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    
    // Check if it's a recurring or installment transaction
    const hasMultiple = 
      (transaction.installments && transaction.installments > 1) || 
      transaction.parentId ||
      transaction.recurrenceId;
    
    if (hasMultiple) {
      // Show dialog asking which ones to edit
      setEditDialogOpen(true);
    } else {
      // Single transaction, edit directly
      setShowAddSheet(true);
    }
  };

  const handleEditConfirm = (editType: 'single' | 'fromThis' | 'all') => {
    setPendingEditType(editType);
    setEditDialogOpen(false);
    setShowAddSheet(true);
  };

  const handleSubmitEdit = async (
    tx: Omit<Transaction, 'id' | 'createdAt'>,
    options?: {
      installments?: number;
      isInstallmentTotal?: boolean;
      isRecurring?: boolean;
      recurrenceType?: 'weekly' | 'monthly' | 'yearly';
      recurrenceEndDate?: string;
    }
  ) => {
    if (transactionToEdit) {
      // Update the transaction(s)
      await updateTransaction(transactionToEdit.id, {
        amount: tx.type === 'expense' ? -Math.abs(tx.amount) : Math.abs(tx.amount),
        description: tx.description,
        category: tx.category,
        type: tx.type,
        date: tx.date,
        isCardPayment: tx.isCardPayment,
        cardId: tx.cardId,
      }, pendingEditType);
      
      setTransactionToEdit(null);
      setPendingEditType('single');
      refreshStatement();
    } else {
      // New transaction
      await addTransaction(tx, options);
      refreshStatement();
    }
  };

  const handleSheetClose = (open: boolean) => {
    setShowAddSheet(open);
    if (!open) {
      setTransactionToEdit(null);
      setPendingEditType('single');
    }
  };

  const handleInvoiceClick = (invoice: ConsolidatedInvoice) => {
    // Navigate to cards page - in the future, could open a modal with invoice details
    navigate('/cards');
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

        {/* Statement */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Extrato</h2>
          <ScrollArea className="h-[calc(100vh-420px)]">
            <StatementList
              items={filteredItems}
              loading={loading}
              onDeleteTransaction={handleDelete}
              onEditTransaction={handleEdit}
              onInvoiceClick={handleInvoiceClick}
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
        onClick={() => {
          setTransactionToEdit(null);
          setShowAddSheet(true);
        }}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add/Edit Transaction Sheet */}
      <AddTransactionSheet
        open={showAddSheet}
        onOpenChange={handleSheetClose}
        onSubmit={handleSubmitEdit}
        cards={cards}
        editingTransaction={transactionToEdit}
      />

      {/* Edit Transaction Dialog (for recurring/installments) */}
      <EditTransactionDialog
        transaction={transactionToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onConfirm={handleEditConfirm}
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
