import type { User } from "./auth";

export type ExerciseLevel = "beginner" | "intermediate" | "advanced";

export type WritingExerciseTopic =
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

export type WritingContentType =
	| "email"
	| "diary"
	| "essay"
	| "article"
	| "story"
	| "report"
	| "general";

export type ExerciseStatus = "not_started" | "in_progress" | "completed";

export type AttemptAction = "retry";

export type HeaderContentProps = {
	me?: User;
	isLoading: boolean;
	onLogout: () => void;
};

export type PaginationInfo = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type APIResponse<T> = {
	data: T;
	success: boolean;
	pagination?: PaginationInfo;
};
