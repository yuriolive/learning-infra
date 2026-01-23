import { BigNumberInput } from "@medusajs/types";

export const convertToDecimal = (amount: BigNumberInput): number => {
  if (typeof amount === 'number') {
      return amount / 100;
  }
  if (typeof amount === 'string') {
      return Number(amount) / 100;
  }
  // If it's BigNumber object from some lib, it usually has toString or toNumber
  // We'll try toString
  return Number(String(amount)) / 100;
};

export const convertFromDecimal = (amount: number): number => {
    return Math.round(amount * 100);
}
