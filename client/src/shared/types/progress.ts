export type AttemptHistoryParams = {
	feature?: "all" | "writing" | "wordchain" | "slanghang";
	lessonType?:
		| "all"
		| "grammar"
		| "vocabulary"
		| "listening"
		| "speaking"
		| "reading"
		| "writing";
	page?: number;
	limit?: number;
};

export type AttemptHistoryItem = {
	id: string;
	title: string;
	kind?:
		| "ReverseTranslation"
		| "SeeWrite"
		| "Rewrite"
		| "Exam"
		| "WordChain"
		| "SlangHang";
	score: number;
	completedAt: string;
};

export type SummaryResponse = {
	totalCompletedExercises: number;
	totalDecks: number;
	currentStreak: number;
	totalVocabulary: number;
	writingStats: {
		lessonType: "ReverseTranslation" | "SeeWrite" | "Rewrite" | "Exam";
		totalCompleted: number;
		avgScore: number;
		recentScores: AttemptHistoryItem[];
	}[];
	slangStats: {
		totalCompleted: number;
		avgScores: {
			accuracyScore: number;
			fluencyScore: number;
			completenessScore: number;
			pronunciationScore: number;
			prosodyScore: number;
		};
	};
};

export type AdminSummaryParams = {
	groupBy?: "week" | "month";
	from?: string;
	to?: string;
	allTime?: boolean;
};

export type AdminSummaryResponse = {
	revenueVND: number;
	transactionCount: number;
	totalUsers: number;
	payingUsers: number;
	range: {
		from: string;
		to: string;
		revenueVND: number;
		transactionCount: number;
		newUsers: number;
		payingUsers: number;
	};
	userGrowth: {
		periodStart: string;
		newUsers: number;
	}[];
};
