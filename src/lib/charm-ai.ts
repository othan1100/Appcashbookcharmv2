export type AiLang = "en" | "so";

export type SuggestionGroup = {
  key: string;
  label: Record<AiLang, string>;
  items: Record<AiLang, string[]>;
};

/** Prompt starters covering the whole CashbookCharm workflow. */
export const SUGGESTION_GROUPS: SuggestionGroup[] = [
  {
    key: "dashboard",
    label: { en: "Dashboard", so: "Dashboard" },
    items: {
      en: [
        "Give me a summary of my business this month",
        "What is my cash in vs cash out today?",
        "How is this month compared to last month?",
        "What is my current balance across all cashbooks?",
        "Show my top 5 expense categories this month",
      ],
      so: [
        "Ii soo koob ganacsigayga bishaan",
        "Lacagta soo gashay iyo tii baxday maanta intee le'eg?",
        "Bishaan iyo bishii hore sidee isugu dhigmaan?",
        "Hadhaaga guud ee dhammaan buugaagta lacagta waa imisa?",
        "I tus 5-ta qaybood ee ugu kharash badan bishaan",
      ],
    },
  },
  {
    key: "transactions",
    label: { en: "Transactions", so: "Dhaqdhaqaaqa lacagta" },
    items: {
      en: [
        "List my last 10 transactions",
        "How much did I spend this week?",
        "Which payment method do I use most?",
        "Show all cash-out entries above $100 this month",
        "What was my biggest transaction this year?",
      ],
      so: [
        "I tus 10-kii dhaqdhaqaaq ee ugu dambeeyay",
        "Immisa ayaan bixiyay usbuucaan?",
        "Habka lacag bixinta ee aan ugu badan isticmaalo waa kee?",
        "I tus dhammaan lacagaha baxay ee ka badan $100 bishaan",
        "Dhaqdhaqaaqa ugu weyn ee sanadkan waa kee?",
      ],
    },
  },
  {
    key: "customers",
    label: { en: "Customers & payments", so: "Macaamiisha & lacag bixinta" },
    items: {
      en: [
        "Who still owes me money?",
        "Did Cali pay this month?",
        "Which customer owes the most?",
        "Show payments received from customers this week",
        "Who has not paid in the last 30 days?",
      ],
      so: [
        "Yaa wali i deyn ah?",
        "Cali ma bixiyay bishaan?",
        "Macmiilka ugu deynta badan waa kee?",
        "I tus lacagaha macaamiisha laga helay usbuucaan",
        "Yaa aan wax bixin 30-kii maalmood ee la soo dhaafay?",
      ],
    },
  },
  {
    key: "invoices",
    label: { en: "Invoices & receipts", so: "Rasiidada & Invoice" },
    items: {
      en: [
        "Which transactions have receipts attached?",
        "Prepare an invoice summary for Ahmed",
        "What should I include in this month's statement?",
        "List entries missing a receipt or note",
      ],
      so: [
        "Dhaqdhaqaaqyada rasiidka ku lifaaqan yahay waa kuwee?",
        "Ii diyaari koobid invoice ah oo Ahmed ah",
        "Maxaan ku darsadaa bayaanka bishaan?",
        "I tus qoraallada aan rasiid ama faallo lahayn",
      ],
    },
  },
  {
    key: "reports",
    label: { en: "Reports & growth", so: "Warbixinno & korriin" },
    items: {
      en: [
        "How much profit did I make this month?",
        "What is my average daily income?",
        "Which category is growing fastest?",
        "How can I improve my cash flow?",
      ],
      so: [
        "Faa'iidada bishaan waa imisa?",
        "Dakhliga celceliska maalintii waa imisa?",
        "Qaybta ugu kobaca badan waa tee?",
        "Sidee baan u wanaajin karaa socodka lacagta?",
      ],
    },
  },
];

export const UI_TEXT = {
  title: { en: "CHARM AI", so: "CHARM AI" },
  subtitle: {
    en: "Your bookkeeping assistant — answers from your real records",
    so: "Kaaliyahaaga xisaabaadka — jawaabo ka yimid diiwaankaaga dhabta ah",
  },
  greeting: { en: "How can I help with your books?", so: "Sidee kaa caawiyaa xisaabaadkaaga?" },
  placeholder: {
    en: "Ask me anything about your finances…",
    so: "Wax kasta oo maaliyaddaada ku saabsan i weydii…",
  },
  newChat: { en: "New chat", so: "Wada hadal cusub" },
  history: { en: "Chat history", so: "Taariikhda wadahadalka" },
  thinking: { en: "Checking your records…", so: "Waan eegayaa diiwaankaaga…" },
  send: { en: "Send", so: "Dir" },
  empty: { en: "No conversations yet", so: "Wali wadahadal ma jiro" },
  delete: { en: "Delete", so: "Tirtir" },
} as const;

export function tt<K extends keyof typeof UI_TEXT>(key: K, lang: AiLang) {
  return UI_TEXT[key][lang];
}
