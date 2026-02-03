import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, DollarSign, Pencil } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCardDetails, useCreditCards } from '@/hooks/useCreditCards';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, getCurrentMonth, formatMonthYear, generateId } from '@/lib/formatters';
import { getInvoiceDueDate, formatDateBR, getInvoiceMonth } from '@/lib/dateUtils';
import { TransactionList } from '@/components/transactions/TransactionList';
import { MonthSelector } from '@/components/transactions/MonthSelector';
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog';
import { EditTransactionDialog } from '@/components/transactions/EditTransactionDialog';
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet';
import { PayInvoiceSheet } from '@/components/cards/PayInvoiceSheet';
import { EditCardSheet } from '@/components/cards/EditCardSheet';
import { Transaction, saveTransaction, getCreditCardById, updateCreditCard, CreditCard } from '@/lib/storage';
import { calculateInvoiceMonth } from '@/lib/invoiceUtils';
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

export default function CardStatementPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { cards, removeCard, editCard, refresh: refreshCards } = useCreditCards();
  const { updateTransaction, removeTransaction } = useTransactions();
  
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showDeleteCard, setShowDeleteCard] = useState(false);
  const [showPayInvoice, setShowPayInvoice] = useState(false);
  const [showEditCard, setShowEditCard] = useState(false);
  
  // Transaction management states
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [pendingEditType, setPendingEditType] = useState<'single' | 'fromThis' | 'all'>('single');

  const card = cards.find(c => c.id === cardId);
  const { purchases, monthlyTotal, availableLimit, refresh: refreshCard } = useCardDetails(cardId || '', selectedMonth);
  
  // Calculate due date for display
  const dueDate = card?.closingDay && card?.dueDay 
    ? getInvoiceDueDate(selectedMonth, card.closingDay, card.dueDay)
    : null;

  // Redirect if card not found
  useEffect(() => {
    if (!cardId || (cards.length > 0 && !card)) {
      navigate('/cards');
    }
  }, [cardId, card, cards.length, navigate]);

  const handleDeleteCard = async () => {
    if (card) {
      await removeCard(card.id);
      setShowDeleteCard(false);
      navigate('/cards');
    }
  };

  const handleEditCard = async (updatedCard: CreditCard) => {
    await editCard(updatedCard);
    refreshCards();
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

  // Handle invoice payment (including card-to-card)
  const handlePayInvoice = async (data: {
    amount: number;
    date: string;
    paymentSource: 'cash' | 'debit' | 'credit';
    sourceCardId?: string;
  }) => {
    if (!card) return;

    // Calculate the due date for the invoice being paid.
    // IMPORTANT: Always compute from the card config (with safe defaults) so that
    // card-to-card payments are scheduled on the target card's due date (not on the
    // day the user performed the payment).
    const targetClosingDay = Number(card.closingDay ?? 25);
    const targetDueDay = Number(card.dueDay ?? 5);
    const invoiceDueDate = getInvoiceDueDate(selectedMonth, targetClosingDay, targetDueDay);

    // If paying with another card, create the transaction on that card's invoice
    if (data.paymentSource === 'credit' && data.sourceCardId) {
      const sourceCard = await getCreditCardById(data.sourceCardId);
      if (sourceCard) {
        // Use the due date of the card being paid to calculate which invoice month on source card
        const sourceClosingDay = Number(sourceCard.closingDay ?? 25);
        const sourceInvoiceMonth = calculateInvoiceMonth(invoiceDueDate, sourceClosingDay);
        
        // Create expense on source card (this card is paying, so it incurs the debt)
        // The transaction date is the due date of the paid card's invoice
        const paymentTx: Transaction = {
          id: generateId(),
          amount: -Math.abs(data.amount),
          date: invoiceDueDate, // Use the due date of the paid invoice
          description: `Pagamento fatura ${card.name}`,
          category: 'other',
          type: 'expense',
          isCardPayment: true,
          cardId: data.sourceCardId,
          invoiceMonth: sourceInvoiceMonth,
          isCardToCardPayment: true,
          sourceCardId: data.sourceCardId,
          targetCardId: card.id,
          // Mark as invoice payment for tracking
          isInvoicePayment: true,
          paidInvoiceCardId: card.id,
          paidInvoiceMonth: selectedMonth,
        };
        await saveTransaction(paymentTx);
        
        // Update source card limit (consume limit)
        if (typeof sourceCard.limit === 'number') {
          await updateCreditCard({ ...sourceCard, limit: sourceCard.limit - Math.abs(data.amount) });
        }
      }
    } else {
      // Paying with cash or debit - create a marker transaction to track the payment
      const paymentMarkerTx: Transaction = {
        id: generateId(),
        amount: -Math.abs(data.amount),
        date: data.date,
        description: `Pagamento fatura ${card.name} (${data.paymentSource === 'cash' ? 'Dinheiro' : 'Débito'})`,
        category: 'other',
        type: 'expense',
        // Mark as invoice payment for tracking (but not as card payment)
        isInvoicePayment: true,
        paidInvoiceCardId: card.id,
        paidInvoiceMonth: selectedMonth,
      };
      await saveTransaction(paymentMarkerTx);
    }
    
    // Restore limit on the card being paid
    if (typeof card.limit === 'number') {
      const newLimit = card.limit + Math.abs(data.amount);
      await updateCreditCard({ ...card, limit: newLimit });
    }
    
    refreshCard();
  };

  if (!card) {
    return null;
  }

  return (
    <PageContainer
      header={
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/cards')}
              className="-ml-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{card.name}</h1>
              <p className="text-sm text-muted-foreground">
                •••• {card.last4 || '****'} • Fecha dia {card.closingDay || '--'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEditCard(true)}
            >
              <Pencil className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowDeleteCard(true)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      }
    >
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="space-y-4 pb-4">
          {/* Month Navigation */}
          <MonthSelector 
            month={selectedMonth} 
            onMonthChange={setSelectedMonth} 
          />

          {/* Card Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Fatura {formatMonthYear(selectedMonth)}</p>
                <p className="text-xl font-bold">{formatCurrency(monthlyTotal)}</p>
                {dueDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Vence em {formatDateBR(dueDate)}
                  </p>
                )}
              </CardContent>
            </Card>
            {card.limit && (
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

          {/* Pay Invoice Button */}
          {monthlyTotal > 0 && (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setShowPayInvoice(true)}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Pagar Fatura
            </Button>
          )}

          {/* Purchases */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-medium mb-3">Compras do período</h3>
              <TransactionList
                transactions={purchases}
                onDelete={handleDeleteTransaction}
                onEdit={handleEditTransaction}
                showActions
                emptyMessage="Nenhuma compra neste período"
              />
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Delete Card Confirmation */}
      <AlertDialog open={showDeleteCard} onOpenChange={setShowDeleteCard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cartão "{card.name}"? As
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

      {/* Pay Invoice Sheet */}
      <PayInvoiceSheet
        open={showPayInvoice}
        onOpenChange={setShowPayInvoice}
        invoiceTotal={monthlyTotal}
        cardId={card.id}
        cardName={card.name}
        invoiceMonth={selectedMonth}
        cards={cards}
        onSubmit={handlePayInvoice}
      />

      {/* Edit Card Sheet */}
      <EditCardSheet
        open={showEditCard}
        onOpenChange={setShowEditCard}
        card={card}
        cards={cards}
        onSubmit={handleEditCard}
      />
    </PageContainer>
  );
}
