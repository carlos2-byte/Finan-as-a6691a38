/**
 * Projected Balance Logic
 * 
 * Features:
 * 1. Balance decreases as bills come due (based on expense dates)
 * 2. Daily yield is added to income balance
 * 3. At month end, positive balance is transferred to authorized investment
 */

import { getTransactionsByMonth, Transaction } from './storage';
import { getInvestmentsForCoverage, calculateDailyYield, calculateNetYield } from './investments';
import { getLocalDateString, parseLocalDate, getLocalMonth, addDaysToDate } from './dateUtils';

/**
 * Calculate projected balance for each day of the month
 * Returns the current day's projected balance and daily yield
 */
export async function calculateProjectedBalance(
  month: string,
  baseIncome: number,
  baseExpense: number
): Promise<{
  projectedBalance: number;
  dailyYield: number;
  remainingExpenses: number;
  paidExpenses: number;
}> {
  const today = getLocalDateString();
  const currentMonth = getLocalMonth();
  
  // Get all transactions for the month
  const transactions = await getTransactionsByMonth(month);
  
  // Separate income and expenses
  const incomes = transactions.filter(tx => tx.type === 'income');
  const expenses = transactions.filter(tx => tx.type === 'expense');
  
  // Calculate paid expenses (date <= today) and remaining expenses (date > today)
  let paidExpenses = 0;
  let remainingExpenses = 0;
  
  for (const expense of expenses) {
    const amount = Math.abs(expense.amount);
    if (expense.date <= today) {
      paidExpenses += amount;
    } else {
      remainingExpenses += amount;
    }
  }
  
  // Calculate total income received (date <= today)
  let receivedIncome = 0;
  for (const income of incomes) {
    if (income.date <= today) {
      receivedIncome += Math.abs(income.amount);
    }
  }
  
  // Current actual balance (what we have right now)
  const currentBalance = receivedIncome - paidExpenses;
  
  // Projected balance (accounting for future expenses)
  const projectedBalance = currentBalance - remainingExpenses;
  
  // Calculate daily yield based on current balance (if positive)
  let dailyYield = 0;
  if (currentBalance > 0) {
    // Get the authorized investment's yield rate to apply to income balance
    const coverageInvestments = await getInvestmentsForCoverage();
    if (coverageInvestments.length > 0) {
      const yieldRate = coverageInvestments[0].yieldRate;
      const grossYield = calculateDailyYield(currentBalance, yieldRate);
      const { net } = calculateNetYield(grossYield);
      dailyYield = net;
    }
  }
  
  return {
    projectedBalance,
    dailyYield,
    remainingExpenses,
    paidExpenses,
  };
}

/**
 * Get the balance at a specific date in the month
 * Useful for showing balance progression
 */
export async function getBalanceAtDate(
  month: string,
  targetDate: string
): Promise<number> {
  const transactions = await getTransactionsByMonth(month);
  
  let balance = 0;
  for (const tx of transactions) {
    if (tx.date <= targetDate) {
      if (tx.type === 'income') {
        balance += Math.abs(tx.amount);
      } else {
        balance -= Math.abs(tx.amount);
      }
    }
  }
  
  return balance;
}

/**
 * Calculate the accumulated daily yield for the current month
 * Based on daily balances and the investment yield rate
 */
export async function calculateAccumulatedYield(month: string): Promise<number> {
  const today = getLocalDateString();
  const currentMonth = getLocalMonth();
  
  // Only calculate for current or past months
  if (month > currentMonth) {
    return 0;
  }
  
  // Get coverage investment for yield rate
  const coverageInvestments = await getInvestmentsForCoverage();
  if (coverageInvestments.length === 0) {
    return 0;
  }
  
  const yieldRate = coverageInvestments[0].yieldRate;
  
  // Determine the range of dates to calculate
  const monthStart = `${month}-01`;
  const isCurrentMonth = month === currentMonth;
  const endDate = isCurrentMonth ? today : getLastDayOfMonth(month);
  
  // Get all transactions for the month
  const transactions = await getTransactionsByMonth(month);
  
  // Calculate yield for each day
  let totalYield = 0;
  let currentDate = monthStart;
  
  while (currentDate <= endDate) {
    // Calculate balance at end of previous day
    const previousDay = addDaysToDate(currentDate, -1);
    let balance = 0;
    
    for (const tx of transactions) {
      if (tx.date <= previousDay) {
        if (tx.type === 'income') {
          balance += Math.abs(tx.amount);
        } else {
          balance -= Math.abs(tx.amount);
        }
      }
    }
    
    // Only add yield if balance is positive
    if (balance > 0) {
      const grossYield = calculateDailyYield(balance, yieldRate);
      const { net } = calculateNetYield(grossYield);
      totalYield += net;
    }
    
    currentDate = addDaysToDate(currentDate, 1);
  }
  
  return totalYield;
}

/**
 * Get the last day of a month as YYYY-MM-DD
 */
function getLastDayOfMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  // Create date for first day of next month, then subtract 1 day
  const lastDay = new Date(year, monthNum, 0);
  return getLocalDateString(lastDay);
}

/**
 * Check if we're at the end of the month (last day)
 */
export function isEndOfMonth(): boolean {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return today.getMonth() !== tomorrow.getMonth();
}

/**
 * Get days until end of month
 */
export function getDaysUntilMonthEnd(): number {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return lastDay.getDate() - today.getDate();
}
