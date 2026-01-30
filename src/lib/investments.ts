/**
 * Investments management
 */

import { defaultAdapter } from './storageAdapter';
import { generateId } from './formatters';
import { getLocalDateString, getLocalMonth, parseLocalDate, getMonthsInRangeLocal } from './dateUtils';

const INVESTMENTS_KEY = 'investments';
const DEFAULT_YIELD_KEY = 'default_yield_rate';

export interface Investment {
  id: string;
  name: string;
  initialAmount: number;
  currentAmount: number;
  yieldRate: number; // Annual rate in percentage (e.g., 6.5)
  startDate: string; // YYYY-MM-DD
  lastYieldDate?: string; // Last date yield was calculated
  isActive: boolean;
  createdAt: string;
}

export interface YieldHistory {
  id: string;
  investmentId: string;
  month: string; // YYYY-MM
  amount: number;
  yieldAmount: number;
  date: string;
}

const YIELD_HISTORY_KEY = 'yield_history';

/**
 * Get default yield rate
 */
export async function getDefaultYieldRate(): Promise<number> {
  return (await defaultAdapter.getItem<number>(DEFAULT_YIELD_KEY, 6.5)) ?? 6.5;
}

/**
 * Set default yield rate
 */
export async function setDefaultYieldRate(rate: number): Promise<void> {
  await defaultAdapter.setItem(DEFAULT_YIELD_KEY, rate);
}

/**
 * Get all investments
 */
export async function getInvestments(): Promise<Investment[]> {
  const investments = await defaultAdapter.getItem<Record<string, Investment>>(INVESTMENTS_KEY, {});
  return Object.values(investments ?? {}).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get investment by ID
 */
export async function getInvestmentById(id: string): Promise<Investment | null> {
  const investments = await defaultAdapter.getItem<Record<string, Investment>>(INVESTMENTS_KEY, {});
  return investments?.[id] ?? null;
}

/**
 * Create new investment
 */
export async function createInvestment(
  name: string,
  amount: number,
  yieldRate?: number,
  startDate?: string
): Promise<Investment> {
  const investments = await defaultAdapter.getItem<Record<string, Investment>>(INVESTMENTS_KEY, {}) ?? {};
  const defaultRate = await getDefaultYieldRate();
  
  const investment: Investment = {
    id: generateId(),
    name: name.trim(),
    initialAmount: amount,
    currentAmount: amount,
    yieldRate: yieldRate ?? defaultRate,
    startDate: startDate ?? getLocalDateString(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  
  investments[investment.id] = investment;
  await defaultAdapter.setItem(INVESTMENTS_KEY, investments);
  
  return investment;
}

/**
 * Update investment
 */
export async function updateInvestment(investment: Investment): Promise<void> {
  const investments = await defaultAdapter.getItem<Record<string, Investment>>(INVESTMENTS_KEY, {}) ?? {};
  investments[investment.id] = investment;
  await defaultAdapter.setItem(INVESTMENTS_KEY, investments);
}

/**
 * Delete investment
 */
export async function deleteInvestment(id: string): Promise<void> {
  const investments = await defaultAdapter.getItem<Record<string, Investment>>(INVESTMENTS_KEY, {}) ?? {};
  delete investments[id];
  await defaultAdapter.setItem(INVESTMENTS_KEY, investments);
  
  // Also delete yield history
  const history = await defaultAdapter.getItem<YieldHistory[]>(YIELD_HISTORY_KEY, []) ?? [];
  const filtered = history.filter(h => h.investmentId !== id);
  await defaultAdapter.setItem(YIELD_HISTORY_KEY, filtered);
}

/**
 * Add amount to investment
 */
export async function addToInvestment(id: string, amount: number): Promise<void> {
  const investment = await getInvestmentById(id);
  if (!investment) return;
  
  investment.currentAmount += amount;
  await updateInvestment(investment);
}

/**
 * Calculate monthly yield (annual rate / 12)
 */
export function calculateMonthlyYield(amount: number, annualRate: number): number {
  const monthlyRate = annualRate / 12 / 100;
  return amount * monthlyRate;
}

/**
 * Process monthly yields for all investments
 * Returns the total yield generated
 */
export async function processMonthlyYields(month: string): Promise<number> {
  const investments = await getInvestments();
  const history = await defaultAdapter.getItem<YieldHistory[]>(YIELD_HISTORY_KEY, []) ?? [];
  
  let totalYield = 0;
  
  for (const investment of investments) {
    if (!investment.isActive) continue;
    
    // Check if yield already processed for this month
    const existingYield = history.find(
      h => h.investmentId === investment.id && h.month === month
    );
    if (existingYield) continue;
    
    // Check if investment started before or during this month
    const investmentStartMonth = getLocalMonth(parseLocalDate(investment.startDate));
    if (investmentStartMonth > month) continue;
    
    // Calculate yield
    const yieldAmount = calculateMonthlyYield(investment.currentAmount, investment.yieldRate);
    
    // Update investment
    investment.currentAmount += yieldAmount;
    investment.lastYieldDate = getLocalDateString();
    await updateInvestment(investment);
    
    // Record yield history
    const yieldRecord: YieldHistory = {
      id: generateId(),
      investmentId: investment.id,
      month,
      amount: investment.currentAmount - yieldAmount,
      yieldAmount,
      date: getLocalDateString(),
    };
    history.push(yieldRecord);
    
    totalYield += yieldAmount;
  }
  
  await defaultAdapter.setItem(YIELD_HISTORY_KEY, history);
  
  return totalYield;
}

/**
 * Get yield history for an investment
 */
export async function getYieldHistory(investmentId: string): Promise<YieldHistory[]> {
  const history = await defaultAdapter.getItem<YieldHistory[]>(YIELD_HISTORY_KEY, []) ?? [];
  return history
    .filter(h => h.investmentId === investmentId)
    .sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * Get total invested amount across all investments
 */
export async function getTotalInvested(): Promise<number> {
  const investments = await getInvestments();
  return investments
    .filter(i => i.isActive)
    .reduce((sum, i) => sum + i.currentAmount, 0);
}

/**
 * Get total yield for a specific month
 */
export async function getMonthlyYieldTotal(month: string): Promise<number> {
  const history = await defaultAdapter.getItem<YieldHistory[]>(YIELD_HISTORY_KEY, []) ?? [];
  return history
    .filter(h => h.month === month)
    .reduce((sum, h) => sum + h.yieldAmount, 0);
}

/**
 * Withdraw from investment - creates description "Investment withdrawal"
 * Returns the withdrawal details for creating an income transaction
 */
export async function withdrawFromInvestment(
  id: string,
  amount: number
): Promise<{ success: boolean; amount: number; investmentName: string } | null> {
  const investment = await getInvestmentById(id);
  if (!investment || amount > investment.currentAmount) return null;
  
  const withdrawAmount = Math.min(amount, investment.currentAmount);
  investment.currentAmount -= withdrawAmount;
  
  // If fully withdrawn, mark as inactive
  if (investment.currentAmount <= 0) {
    investment.currentAmount = 0;
    investment.isActive = false;
  }
  
  await updateInvestment(investment);
  
  return {
    success: true,
    amount: withdrawAmount,
    investmentName: investment.name,
  };
}
