import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { BalanceCard } from '@/components/home/BalanceCard';
import { CoverageAlert } from '@/components/home/CoverageAlert';
import { TransferAlert } from '@/components/home/TransferAlert';
import { MonthSelector } from '@/components/transactions/MonthSelector';
import { StatementList } from '@/components/transactions/StatementList';
import { StatementFilter, FilterOptions } from '@/components/transactions/StatementFilter';
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet';
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog';
import { EditTransactionDialog } from '@/components/transactions/EditTransactionDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStatement, isConsolidatedInvoice } from '@/hooks/useStatement';
import { useTransactions, TransferResult } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useInvestments } from '@/hooks/useInvestments';
import { getCurrentMonth } from '@/lib/formatters';
import { Transaction } from '@/lib/storage';
import { ConsolidatedInvoice } from '@/lib/invoiceUtils';
import { checkAndRecordMonthEndBalance } from '@/lib/balanceTransfer';
import { applyTodaysCoverageIfNeeded } from '@/lib/investmentCoverage';

export default function HomePage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(getCurrentMonth());
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({ types: [], categories: [] });
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pendingEditType, setPendingEditType] = useState<'single' | 'fromThis' | 'all'>('single');
  
  // Alert states
  const [coverageInfo, setCoverageInfo] = useState<{ amount: number; investmentName: string } | null>(null);
  const [transferInfo, setTransferInfo] = useState<{ amount: number; investmentName: string } | null>(null);

  // Use the new statement hook for display
  const { items, loading, totals, balance, balanceData, refresh: refreshStatement } = useStatement(month);
  
  // Keep useTransactions for CRUD operations
  const { addTransaction, updateTransaction, removeTransaction } = useTransactions(month);
  const { cards } = useCreditCards();
  const { refresh: refreshInvestments } = useInvestments();

  // Check and record month-end balance when viewing past months
  useEffect(() => {
    const checkMonthEnd = async () => {
      await checkAndRecordMonthEndBalance(month);
    };
    checkMonthEnd();
  }, [month]);

  // Check and apply coverage for today's due items
  useEffect(() => {
    const checkAndApplyCoverage = async () => {
      if (loading || items.length === 0) return;
      
      // Apply coverage only on the exact date expenses/invoices are due
      const result = await applyTodaysCoverageIfNeeded(items);
      
      if (result) {
        // Show alert
        setCoverageInfo({
          amount: result.amount,
          investmentName: result.investmentName,
        });
        
        // Refresh data
        refreshStatement();
        refreshInvestments();
      }
    };

    checkAndApplyCoverage();
  }, [items, loading, refreshStatement, refreshInvestments]);

  // Get available categories from items
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    items.forEach(item => {
      if (isConsolidatedInvoice(item)) {
        item.transactions.forEach(tx => {
          if (tx.category) categories.add(tx.category);
        });
      } else if (item.category) {
        categories.add(item.category);
      }
    });
    return Array.from(categories).sort();
  }, [items]);

  // Filter items by search query and filters
  const filteredItems = useMemo(() => {
    let result = items;

    // Apply type filters
    if (filters.types.length > 0) {
      result = result.filter(item => {
        if (isConsolidatedInvoice(item)) {
          return filters.types.includes('card');
        }
        if (item.type === 'income' && filters.types.includes('income')) return true;
        if (item.type === 'expense' && filters.types.includes('expense')) return true;
        return false;
      });
    }

    // Apply category filters
    if (filters.categories.length > 0) {
      result = result.filter(item => {
        if (isConsolidatedInvoice(item)) {
          return item.transactions.some(tx => 
            tx.category && filters.categories.includes(tx.category)
          );
        }
        return item.category && filters.categories.includes(item.category);
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
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
    }

    return result;
  }, [items, searchQuery, filters]);

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
      // New transaction - check for automatic transfer
      const transferResult = await addTransaction(tx, options);
      
      // Show transfer alert if transfer happened
      if (transferResult && transferResult.transferred && transferResult.amount && transferResult.investmentName) {
        setTransferInfo({
          amount: transferResult.amount,
          investmentName: transferResult.investmentName,
        });
        refreshInvestments();
      }
      
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
        {/* Coverage Alert */}
        {coverageInfo && (
          <CoverageAlert
            amount={coverageInfo.amount}
            investmentName={coverageInfo.investmentName}
            onDismiss={() => setCoverageInfo(null)}
          />
        )}

        {/* Transfer Alert */}
        {transferInfo && (
          <TransferAlert
            amount={transferInfo.amount}
            investmentName={transferInfo.investmentName}
            onDismiss={() => setTransferInfo(null)}
          />
        )}

        {/* Balance Card */}
        <BalanceCard
          currentBalance={balanceData?.currentBalance ?? balance}
          projectedExpenses={balanceData?.projectedExpenses ?? 0}
          income={totals.income}
          expense={totals.expense}
          loading={loading}
          dailyYield={balanceData?.dailyYield ?? 0}
        />

        {/* Statement */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Extrato</h2>
            <StatementFilter
              cards={cards}
              availableCategories={availableCategories}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>
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
        className="fixed bottom-24 left-4 h-14 w-14 rounded-full shadow-lg z-40"
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
