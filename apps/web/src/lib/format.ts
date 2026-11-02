import { config } from "../config";

const currency = new Intl.NumberFormat(config.locale, {
  style: "currency",
  currency: config.currency,
});
const percent = new Intl.NumberFormat(config.locale, {
  style: "percent",
  maximumFractionDigits: 2,
});

// Display only. The vendor returns the numbers; the UI never calculates commission.
export const formatCurrency = (value: number) => currency.format(value);
export const formatPercent = (fraction: number) => percent.format(fraction);
