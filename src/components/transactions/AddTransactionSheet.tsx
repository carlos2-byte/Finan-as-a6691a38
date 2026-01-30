const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const parsedAmount = parseFloat(amount.replace(',', '.'));
  if (isNaN(parsedAmount) || parsedAmount <= 0) return;

  // 1. Obter o valor final de parcelas
  let finalInstallments = installments;
  if (installments === -1 && customInstallments) {
    const parsed = parseInt(customInstallments);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
      finalInstallments = parsed;
    } else {
      return;
    }
  }

  // --- NOVA LÓGICA DE CARTÃO ---
  let finalDate = date; // Data que será salva

  if (type === 'expense' && isCardPayment && cardId) {
    const selectedCard = cards.find(c => c.id === cardId);
    
    if (selectedCard && selectedCard.closingDay) {
      const [year, month, day] = date.split('-').map(Number);
      const purchaseDate = new Date(year, month - 1, day);
      
      // Se o dia da compra ultrapassou o fechamento, move para o próximo mês
      if (day > selectedCard.closingDay) {
        purchaseDate.setMonth(purchaseDate.getMonth() + 1);
        
        // Atualiza a string da data para o storage (mantendo o dia ou ajustando para o vencimento)
        // Dica: Para relatórios de fatura, o que importa é o Mês/Ano de destino
        const nextMonth = purchaseDate.getMonth() + 1;
        const nextYear = purchaseDate.getFullYear();
        finalDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  // -----------------------------

  setIsSubmitting(true);
  try {
    await onSubmit({
      amount: parsedAmount,
      description: description.trim() || undefined,
      category: type === 'income' ? 'income' : category,
      type,
      date: finalDate, // Usando a data ajustada
      isCardPayment: type === 'expense' && isCardPayment,
      cardId: type === 'expense' && isCardPayment ? cardId : undefined,
      installments: finalInstallments > 1 ? finalInstallments : undefined,
    });
    resetForm();
    onOpenChange(false);
  } finally {
    setIsSubmitting(false);
  }
};
