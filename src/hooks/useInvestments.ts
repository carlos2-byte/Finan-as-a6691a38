import { useState, useEffect, useCallback } from 'react';
import {
  Investment,
  getInvestments,
  createInvestment,
  deleteInvestment,
  addToInvestment,
  withdrawFromInvestment,
  getTotalInvested,
  getDefaultYieldRate,
  setDefaultYieldRate,
  processMonthlyYields,
  getYieldHistory,
  YieldHistory,
} from '@/lib/investments';
import { getLocalMonth } from '@/lib/dateUtils';

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalInvested, setTotalInvested] = useState(0);
  const [defaultRate, setDefaultRate] = useState(6.5);
  const [loading, setLoading] = useState(true);

  const loadInvestments = useCallback(async () => {
    setLoading(true);
    try {
      const [invests, total, rate] = await Promise.all([
        getInvestments(),
        getTotalInvested(),
        getDefaultYieldRate(),
      ]);
      setInvestments(invests);
      setTotalInvested(total);
      setDefaultRate(rate);

      // Process yields for current month
      await processMonthlyYields(getLocalMonth());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvestments();
  }, [loadInvestments]);

  const create = useCallback(async (
    name: string,
    amount: number,
    yieldRate?: number,
    startDate?: string
  ) => {
    const investment = await createInvestment(name, amount, yieldRate, startDate);
    await loadInvestments();
    return investment;
  }, [loadInvestments]);

  const remove = useCallback(async (id: string) => {
    await deleteInvestment(id);
    await loadInvestments();
  }, [loadInvestments]);

  const deposit = useCallback(async (id: string, amount: number) => {
    await addToInvestment(id, amount);
    await loadInvestments();
  }, [loadInvestments]);

  const withdraw = useCallback(async (id: string, amount: number) => {
    const result = await withdrawFromInvestment(id, amount);
    await loadInvestments();
    return result;
  }, [loadInvestments]);

  const updateDefaultRate = useCallback(async (rate: number) => {
    await setDefaultYieldRate(rate);
    setDefaultRate(rate);
  }, []);

  return {
    investments,
    totalInvested,
    defaultRate,
    loading,
    create,
    remove,
    deposit,
    withdraw,
    updateDefaultRate,
    refresh: loadInvestments,
  };
}

export function useInvestmentDetails(investmentId: string) {
  const [history, setHistory] = useState<YieldHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!investmentId) return;
    
    setLoading(true);
    getYieldHistory(investmentId)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [investmentId]);

  return { history, loading };
}
