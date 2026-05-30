export type TransactionType =
	| "signup_bonus"
	| "purchase_pack"
	| "charge_submit"
	| "refund_ai_fail"
	| "daily_checkin";

export type Transaction = {
	_id: string;
	userId: string;
	type: TransactionType;
	amount: number;
	balanceAfter: number;
	reason: string;
	referenceType: "Order" | "Attempt" | "DialogueAttempt" | null;
	referenceId: string | null;
	refundedAt: string | null;
	checkinDate: string | null;
	createdAt: string;
	updatedAt: string;
};
