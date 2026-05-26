export const SUBMIT_COST = 1;
export const SIGNUP_BONUS_CREDITS = 20;
export const DAILY_CHECKIN_CREDITS = 1;
export const PAYMENT_ORDER_EXPIRY_MINUTES = 15;

export const PACK_DEFINITIONS = [
  { id: "tier1", price: 10_000, baseCredits: 100, bonusPct: 0 },
  { id: "tier2", price: 20_000, baseCredits: 200, bonusPct: 5 },
  { id: "tier3", price: 50_000, baseCredits: 500, bonusPct: 10 },
  { id: "tier4", price: 100_000, baseCredits: 1000, bonusPct: 15 },
];

export const TRANSACTION_TYPE = {
  SIGNUP_BONUS: "signup_bonus",
  PURCHASE_PACK: "purchase_pack",
  CHARGE_SUBMIT: "charge_submit",
  REFUND_AI_FAIL: "refund_ai_fail",
  DAILY_CHECKIN: "daily_checkin",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

export const PAYMENT_PROVIDER = {
  SEPAY: "sepay",
  ZALOPAY: "zalopay",
};
