export type ExerciseLevel = "beginner" | "intermediate" | "advanced";

export type ExerciseTopic =
	| "personal_communication"
	| "everyday_life"
	| "transportation_travel"
	| "school_education"
	| "work_business"
	| "public_services"
	| "health_medicine"
	| "shopping_money"
	| "food_drink"
	| "entertainment_leisure"
	| "nature_environment"
	| "science_technology"
	| "culture_society"
	| "government_politics"
	| "history_geography"
	| "sports_fitness"
	| "arts_literature"
	| "religion_spirituality"
	| "law_justice"
	| "philosophy_ethics";

export type ContentType =
	| "email"
	| "diary"
	| "essay"
	| "article"
	| "story"
	| "report"
	| "general";

export type ExerciseStatus = "not_started" | "in_progress" | "completed";

export type ReverseTranslateItem = {
	id: string;
	title: string;
	level: ExerciseLevel;
	topic: ExerciseTopic;
	contentType: ContentType;
	totalSentences: number;
	createdAt: string;
	status: ExerciseStatus;
	completedSentences: number;
	completedAt: string | null;
};

export type ReverseTranslateQueryParams = {
	level?: string;
	contentType?: string;
	topic?: string;
	page?: number;
	limit?: number;
};

export type PaginationInfo = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type ReverseTranslateListResponse = {
	success: boolean;
	data: ReverseTranslateItem[];
	pagination: PaginationInfo;
};
