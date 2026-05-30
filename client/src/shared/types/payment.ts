export type PaymentStatus = "pending" | "paid" | "cancelled" | "expired";

export type PaymentProvider = "sepay" | "zalopay";

export type CreditPack = {
	id: string;
	price: number;
	credits: number;
	bonusPct: number;
};

export type CustomAmountConfig = {
	vndPerCredit: number;
	minAmount: number;
	maxAmount: number;
};

export type PacksCatalog = {
	packs: CreditPack[];
	activeProvider: PaymentProvider;
	custom: CustomAmountConfig;
};

export type CheckoutResult = {
	orderCode: number;
	checkoutUrl: string;
	qrCode: string;
	provider: PaymentProvider;
	expiresAt: string;
};

export type PackSnapshot = {
	packId: string;
	price: number;
	baseCredits: number;
	bonusPct: number;
};

export type OrderStatus = CheckoutResult & {
	status: PaymentStatus;
	packSnapshot: PackSnapshot;
	paidAt: string | null;
};

export type CheckoutPayload =
	| { type: "pack"; packId: string }
	| { type: "custom"; amount: number };
