export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  commissionQuotesPath:
    import.meta.env.VITE_COMMISSION_QUOTES_PATH ?? "/api/commission-quotes",
  // The brief does not mention locale and currency. build them as assumption
  locale: "en-AU",
  currency: "AUD",
} as const;
