import en from "../locales/en.json";

export type TextKey = keyof typeof en;

// All static UI text lives in locales/en.json. Unknown keys fail typecheck.
export const staticContent = (key: TextKey): string => en[key];
