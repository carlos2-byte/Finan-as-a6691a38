/**
 * Investments management
 * Yield is calculated DAILY and added to balance the NEXT DAY
 * Tax of 20% is deducted from yield before adding to balance
 */

import { defaultAdapter } from './storageAdapter';
import { generateId } from './formatters';
import { getLocalDateString, getLocalMonth, parseLocalDate, getMonthsInRangeLocal, addDaysToDate } from './dateUtils';

const INVESTMENTS_KEY = 'investments';
const DEFAULT_YIELD_KEY = 'default_yield_rate';
const YIELD_HISTORY_KEY = 'yield_history';
const LAST_YIELD_PROCESS_KEY = 'last_yield_process_date';

const TAX_RATE = 0.20; // 20% tax on yields

export interface Investment {
  id: string;
  name: string;
  type?: string; // Custom type defined by user
  initialAmount: number;
  currentAmount: number;
  yieldRate: number; // Annual rate in percentage (e.g., 6.5)
  startDate: string; // YYYY-MM-DD
  lastYieldDate?: string; // Last date yield was calculated
  isActive: boolean;
  createdAt: string;
  canCoverNegativeBalance?: boolean; // If true, can be used to cover negative balance
  yieldRateHistory?: YieldRateChange[]; // Track rate changes for prospective calculations
}

export interface YieldRateChange {
  date: string; // YYYY-MM-DD - date the rate changed
  previousRate: number;
  newRate: number;
}

export interface YieldHistory {
  id: string;
  investmentId: string;
  date: string; // YYYY-MM-DD - date the yield was calculated FOR
  appliedDate: string; // YYYY-MM-DD - date the yield was applied (next day)
  grossAmount: number; // Yield before tax
  taxAmount: number; // 20% tax
  netAmount: number; // Yield after tax (added to balance)
  balanceBefore: number;
  balanceAfter: number;
}

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
  startDate?: string,
  type?: string
): Promise<Investment> {
  const investments = await defaultAdapter.getItem<Record<string, Investment>>(INVESTMENTS_KEY, {}) ?? {};
  const defaultRate = await getDefaultYieldRate();
  
  const investment: Investment = {
    id: generateId(),
    name: name.trim(),
    type: type?.trim(),
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
 * Update investment yield rate (prospective only - doesn't recalculate past)
 * Records the change in yieldRateHistory so future calculations use the new rate
 */
export async function updateInvestmentYieldRate(id: string, newRate: number): Promise<void> {
  const investment = await getInvestmentById(id);
  if (!investment) return;
  
  const today = getLocalDateString();
  const previousRate = investment.yieldRate;
  
  // Record the rate change in history
  const rateChange: YieldRateChange = {
    date: today,
    previousRate,
    newRate,
  };
  
  investment.yieldRate = newRate;
  investment.yieldRateHistory = investment.yieldRateHistory || [];
  investment.yieldRateHistory.push(rateChange);
  
  await updateInvestment(investment);
}

/**
 * Toggle investment ability to cover negative balance
 */
export async function toggleCoverNegativeBalance(id: string): Promise<void> {
  const investment = await getInvestmentById(id);
  if (!investment) return;
  
  investment.canCoverNegativeBalance = !investment.canCoverNegativeBalance;
  await updateInvestment(investment);
}

/**
 * Get investments that can cover negative balance
 */
export async function getInvestmentsForCoverage(): Promise<Investment[]> {
  const investments = await getInvestments();
  return investments
    .filter(i => i.isActive && i.canCoverNegativeBalance && i.currentAmount > 0)
    .sort((a, b) => b.currentAmount - a.currentAmount); // Highest balance first
}

/**
 * Use investment to cover negative balance
 * Returns amount used and investment details for creating transaction
 */
export async function useInvestmentForCoverage(
  negativeAmount: number // Positive value of the deficit
): Promise<{ usedAmount: number; investmentName: string; investmentId: string } | null> {
  const investments = await getInvestmentsForCoverage();
  if (investments.length === 0) return null;
  
  // Use the first available investment (highest balance)
  const investment = investments[0];
  const amountToUse = Math.min(negativeAmount, investment.currentAmount);
  
  if (amountToUse <= 0) return null;
  
  // Deduct from investment
  investment.currentAmount -= amountToUse;
  if (investment.currentAmount <= 0) {
    investment.currentAmount = 0;
    investment.isActive = false;
  }
  
  await updateInvestment(investment);
  
  return {
    usedAmount: amountToUse,
    investmentName: investment.name,
    investmentId: investment.id,
  };
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
 * Calculate DAILY yield from annual rate
 * Formula: (annualRate / 100) / 365
 */
export function calculateDailyYield(amount: number, annualRate: number): number {
  const dailyRate = annualRate / 100 / 365;
  return amount * dailyRate;
}

/**
 * Calculate net yield after 20% tax
 */
export function calculateNetYield(grossYield: number): { gross: number; tax: number; net: number } {
  const tax = grossYield * TAX_RATE;
  const net = grossYield - tax;
  return { gross: grossYield, tax, net };
}

/**
 * Process daily yields for all investments
 * This should be called once per day (or catch up for missed days)
 * Yields are calculated for the previous day and added to balance TODAY
 */
export async function processDailyYields(): Promise<number> {
  const today = getLocalDateString();
  const lastProcessDate = await defaultAdapter.getItem<string>(LAST_YIELD_PROCESS_KEY, null);
  
  // If already processed today, skip
  if (lastProcessDate === today) {
    return 0;
  }
  
  const investments = await getInvestments();
  const history = await defaultAdapter.getItem<YieldHistory[]>(YIELD_HISTORY_KEY, []) ?? [];
  
  let totalNetYield = 0;
  
  // Yesterday is the last day we can calculate yields for
  // (yields are applied the next day)
  const yesterday = addDaysToDate(today, -1);
  
  for (const investment of investments) {
    if (!investment.isActive) continue;
    
    // Determine start date for processing
    // For a new investment, start from startDate
    // For existing ones, continue from last processed + 1
    let processStartDate = investment.startDate;
    
    // Check what was the last processed date FOR THIS INVESTMENT
    const investmentHistory = history.filter(h => h.investmentId === investment.id);
    const lastInvestmentYield = investmentHistory
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    
    if (lastInvestmentYield) {
      // Continue from the day after the last processed date
      processStartDate = addDaysToDate(lastInvestmentYield.date, 1);
    }
    
    // Only process up to yesterday (yield applies next day)
    if (processStartDate > yesterday) continue;
    
    // Determine starting balance
    // If we have history, use the last balance
    // Otherwise use the initial amount
    let currentAmount: number;
    if (lastInvestmentYield) {
      currentAmount = lastInvestmentYield.balanceAfter;
    } else {
      currentAmount = investment.initialAmount;
    }
    
    // Get the applicable yield rate for each day
    // (considering rate change history)
    const getYieldRateForDate = (date: string): number => {
      if (!investment.yieldRateHistory || investment.yieldRateHistory.length === 0) {
        return investment.yieldRate;
      }
      
      // Find the rate that was active on this date
      // Rate changes are prospective, so use the rate that was set before or on this date
      let activeRate = investment.yieldRate;
      for (const change of investment.yieldRateHistory.sort((a, b) => a.date.localeCompare(b.date))) {
        if (change.date <= date) {
          activeRate = change.newRate;
        } else {
          break;
        }
      }
      return activeRate;
    };
    
    // Process each day sequentially
    let currentDate = processStartDate;
    
    while (currentDate <= yesterday) {
      // Double-check we haven't processed this date already (prevent duplicates)
      const alreadyProcessed = history.some(
        h => h.investmentId === investment.id && h.date === currentDate
      );
      
      if (!alreadyProcessed) {
        // Get the yield rate for this specific date
        const yieldRate = getYieldRateForDate(currentDate);
        
        // Calculate yield for this day
        const grossYield = calculateDailyYield(currentAmount, yieldRate);
        const { gross, tax, net } = calculateNetYield(grossYield);
        
        const balanceBefore = currentAmount;
        const balanceAfter = currentAmount + net;
        
        // Record yield history
        const yieldRecord: YieldHistory = {
          id: generateId(),
          investmentId: investment.id,
          date: currentDate,
          appliedDate: addDaysToDate(currentDate, 1), // Applied next day
          grossAmount: gross,
          taxAmount: tax,
          netAmount: net,
          balanceBefore,
          balanceAfter,
        };
        
        history.push(yieldRecord);
        currentAmount = balanceAfter;
        totalNetYield += net;
      } else {
        // If already processed, get the balance after for continuity
        const existingRecord = history.find(
          h => h.investmentId === investment.id && h.date === currentDate
        );
        if (existingRecord) {
          currentAmount = existingRecord.balanceAfter;
        }
      }
      
      currentDate = addDaysToDate(currentDate, 1);
    }
    
    // Update investment with new balance
    investment.currentAmount = currentAmount;
    investment.lastYieldDate = yesterday;
    await updateInvestment(investment);
  }
  
  // Save history and last process date
  await defaultAdapter.setItem(YIELD_HISTORY_KEY, history);
  await defaultAdapter.setItem(LAST_YIELD_PROCESS_KEY, today);
  
  return totalNetYield;
}

/**
 * Get yield history for an investment
 */
export async function getYieldHistory(investmentId: string): Promise<YieldHistory[]> {
  const history = await defaultAdapter.getItem<YieldHistory[]>(YIELD_HISTORY_KEY, []) ?? [];
  return history
    .filter(h => h.investmentId === investmentId)
    .sort((a, b) => b.date.localeCompare(a.date));
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
 * Get daily yield estimate for an investment
 */
export function getDailyYieldEstimate(amount: number, annualRate: number): { gross: number; net: number } {
  const gross = calculateDailyYield(amount, annualRate);
  const { net } = calculateNetYield(gross);
  return { gross, net };
}

/**
 * Get monthly yield estimate for an investment (30 days)
 */
export function getMonthlyYieldEstimate(amount: number, annualRate: number): { gross: number; net: number } {
  const dailyGross = calculateDailyYield(amount, annualRate);
  const gross = dailyGross * 30;
  const { net } = calculateNetYield(gross);
  return { gross, net };
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

/**
 * Get total yield for a specific month
 */
export async function getMonthlyYieldTotal(month: string): Promise<{ gross: number; tax: number; net: number }> {
  const history = await defaultAdapter.getItem<YieldHistory[]>(YIELD_HISTORY_KEY, []) ?? [];
  
  let gross = 0;
  let tax = 0;
  let net = 0;
  
  for (const h of history) {
    if (h.date.startsWith(month)) {
      gross += h.grossAmount;
      tax += h.taxAmount;
      net += h.netAmount;
    }
  }
  
  return { gross, tax, net };
}
