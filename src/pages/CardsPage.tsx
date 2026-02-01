import { useState } from 'react';
import { Plus, CreditCard as CardIcon, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreditCards, useCardDetails } from '@/hooks/useCreditCards';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, getCurrentMonth, formatMonthYear } from '@/lib/formatters';
import { getInvoiceDueDate, formatDateBR } from '@/lib/dateUtils';
import { TransactionList } from '@/components/transactions/TransactionList';
import { AddCardSheet } from '@/components/cards/AddCardSheet';
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog';
import { EditTransactionDialog } from '@/components/transactions/EditTransactionDialog';
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet';
import { CreditCard, Transaction } from '@/lib/storage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CARD_COLORS = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-orange-500 to-red-600',
  'from-cyan-500 to-blue-600',
];

function CardItem({
  card,
  index,
  isSelected,
  onClick,
}: {
  card: CreditCard;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { monthlyTotal, availableLimit } = useCardDetails(card.id);
  const colorClass = CARD_COLORS[index % CARD_COLORS.length];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left transition-transform ${isSelected ? 'scale-[1.02]' : ''}`}
    >
      <div
        className={`relative h-40 rounded-2xl bg-gradient-to-br ${colorClass} p-5 shadow-lg overflow-hidden`}
      >
        {/* Card Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 h-16 w-16 rounded-full border-4 border-white/30" />
          <div className="absolute top-8 right-8 h-16 w-16 rounded-full border-4 border-white/20" />
        </div>

        <div className="relative h-full flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <CardIcon className="h-8 w-8 text-white/80" />
            <div className="text-right">
              <p className="text-xs text-white/70">Fatura {formatMonthYear(getCurrentMonth())}</p>
              <p className="text-lg font-bold text-white">
                {formatCurrency(monthlyTotal)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold">{card.name}</p>
            <div className="flex items-center justify-between">
              <p className="text-white/80 font-mono text-sm">
                •••• •••• •••• {card.last4 || '****'}
              </p>
              <div className="text-right text-xs text-white/70">
                {card.closingDay && <p>Fecha dia {card.closingDay}</p>}
                {card.limit && (
                  <p>Limite: {formatCurrency(availableLimit)} disponível</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function CardsPage() {
  const { cards, loading, createCard, removeCard } = useCreditCards();
  const { updateTransaction, removeTransaction, refresh } = useTransactions();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);
  
  // Transaction management states
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [pendingEditType, setPendingEditType] = useState<'single' | 'fromThis' | 'all'>('single');

  const selectedCard = cards.find(c => c.id === selectedCardId);
  const currentMonth = getCurrentMonth();
  const { purchases, monthlyTotal, availableLimit, refresh: refreshCard } = useCardDetails(selectedCardId || '', currentMonth);
  
  // Calculate due date for display
  const dueDate = selectedCard?.closingDay && selectedCard?.dueDay 
    ? getInvoiceDueDate(getCurrentMonth(), selectedCard.closingDay, selectedCard.dueDay)
    : null;

  const handleDeleteCard = async () => {
    if (cardToDelete) {
      await removeCard(cardToDelete.id);
      if (selectedCardId === cardToDelete.id) {
        setSelectedCardId(null);
      }
      setCardToDelete(null);
    }
  };

  // Transaction handlers
  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
  };

  const handleConfirmDelete = async (id: string, deleteType: 'single' | 'fromThis' | 'all') => {
    await removeTransaction(id, deleteType);
    setTransactionToDelete(null);
    refreshCard();
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    
    const hasMultiple = 
      (transaction.installments && transaction.installments > 1) || 
      transaction.parentId ||
      transaction.recurrenceId;
    
    if (hasMultiple) {
      setEditDialogOpen(true);
    } else {
      setShowEditSheet(true);
    }
  };

  const handleEditConfirm = (editType: 'single' | 'fromThis' | 'all') => {
    setPendingEditType(editType);
    setEditDialogOpen(false);
    setShowEditSheet(true);
  };

  const handleSubmitEdit = async (
    tx: Omit<Transaction, 'id' | 'createdAt'>
  ) => {
    if (transactionToEdit) {
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
      refreshCard();
    }
  };

  const handleEditSheetClose = (open: boolean) => {
    setShowEditSheet(open);
    if (!open) {
      setTransactionToEdit(null);
      setPendingEditType('single');
    }
  };

  return (
    <PageContainer
      header={
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cartões</h1>
          <Button onClick={() => setShowAddSheet(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>
      }
    >
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="space-y-6 pb-4">
          {/* Cards List */}
          {cards.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CardIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum cartão cadastrado</p>
                <Button className="mt-4" onClick={() => setShowAddSheet(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Cartão
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {cards.map((card, index) => (
                <CardItem
                  key={card.id}
                  card={card}
                  index={index}
                  isSelected={selectedCardId === card.id}
                  onClick={() =>
                    setSelectedCardId(selectedCardId === card.id ? null : card.id)
                  }
                />
              ))}
            </div>
          )}

          {/* Selected Card Details */}
          {selectedCard && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Detalhes - {selectedCard.name}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setCardToDelete(selectedCard)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              </div>

              {/* Card Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Fatura Atual</p>
                    <p className="text-xl font-bold">{formatCurrency(monthlyTotal)}</p>
                    {dueDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Vence em {formatDateBR(dueDate)}
                      </p>
                    )}
                  </CardContent>
                </Card>
                {selectedCard.limit && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Disponível</p>
                      <p className="text-xl font-bold text-success">
                        {formatCurrency(availableLimit)}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Purchases */}
              <Card>
                <CardContent className="pt-4">
                  <h3 className="font-medium mb-3">Compras Recentes</h3>
                  <TransactionList
                    transactions={purchases.slice(0, 10)}
                    onDelete={handleDeleteTransaction}
                    onEdit={handleEditTransaction}
                    showActions
                    emptyMessage="Nenhuma compra neste cartão"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Card Sheet */}
      <AddCardSheet
        open={showAddSheet}
        onOpenChange={setShowAddSheet}
        onSubmit={createCard}
      />

      {/* Delete Card Confirmation */}
      <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cartão "{cardToDelete?.name}"? As
              transações vinculadas a este cartão não serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCard}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Transaction Sheet */}
      <AddTransactionSheet
        open={showEditSheet}
        onOpenChange={handleEditSheetClose}
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
