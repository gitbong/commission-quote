import { createApp } from "./app";
import { loadConfig } from "./config";
import { HttpCommissionQuoteClient } from "./modules/commissionQuote";

const config = loadConfig();

const app = createApp({
  commissionQuoteClient: new HttpCommissionQuoteClient({
    baseUrl: config.vendorBaseUrl,
    apiKey: config.vendorApiKey,
    timeoutMs: config.vendorTimeoutMs,
  }),
});

app.listen(config.port, () => {
  console.log(`bff listening on http://localhost:${config.port}`);
});
