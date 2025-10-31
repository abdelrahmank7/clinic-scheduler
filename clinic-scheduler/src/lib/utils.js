// clinic-scheduler/src/lib/utils.js

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Add the formatCurrency function here
export const formatCurrency = (value) => {
  return value == null || isNaN(value)
    ? "$0.00"
    : value.toLocaleString("en-US", { style: "currency", currency: "USD" });
};
