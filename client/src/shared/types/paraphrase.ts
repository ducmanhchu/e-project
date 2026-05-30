import type {
	APIResponse,
	ExerciseLevel,
	ExerciseStatus,
	WritingExerciseTopic,
} from "@shared/types/utils";

export type ParaphraseExercise = {
	id: string;
	title: string;
	level: ExerciseLevel;
	topic: WritingExerciseTopic;
	totalSentences: number;
	status: ExerciseStatus;
	completedSentences: number;
	completedAt: string | null;
	sentences: {
		order: number;
		targetSentence: string;
		isCompleted: boolean;
		lastSubmission: null | {
			userAnswer: string;
			score: number;
			gradedBy: string;
			feedback: {
				suggestion: string;
				improvements: string[];
				comment: string;
				modelAnswer: string;
			};
		};
		createdAt?: string | null;
	}[];
};

export type ParaphraseListItem = Omit<ParaphraseExercise, "sentences"> & {
	createdAt: string;
};

export type ParaphraseListQueryParams = {
	level?: string;
	topic?: string;
	status?: string;
	search?: string;
	page?: number;
	limit?: number;
};

export type ParaphraseListResponse = APIResponse<ParaphraseListItem[]>;

export type ParaphraseExerciseResponse = APIResponse<ParaphraseExercise>;

export type ParaphraseSubmitPayload = {
	sentenceOrder: number;
	userAnswer: string;
};

export type ParaphraseSubmitResponse = APIResponse<{
	score: number;
	gradedBy: string;
	feedback: {
		suggestion: string;
		improvements: string[];
		comment: string;
		modelAnswer: string;
	};
	isCompleted: boolean;
}>;

// ADMIN
export type AdminParaphraseListItem = {
	id: string;
	title: string;
	level: ExerciseLevel;
	topic: WritingExerciseTopic;
	totalSentences: number;
	sentences: {
		order: number;
		targetSentence: string;
	}[];
	createdAt?: string;
	updatedAt?: string;
};

export type AdminParaphraseExerciseResponse =
	APIResponse<AdminParaphraseListItem>;

export type AdminParaphraseListQueryParams = {
	level?: string;
	topic?: string;
	page?: number;
	limit?: number;
	search?: string;
	sortBy?: "level" | "createdAt";
	order?: "asc" | "desc";
};

export type CreateParaphraseExercisePayload = {
	title: string;
	level: ExerciseLevel;
	topic: WritingExerciseTopic;
	sentences: {
		targetSentence: string;
	}[];
};
export type CreateParaphraseExerciseResponse =
	APIResponse<AdminParaphraseListItem>;

export type UpdateParaphraseExercisePayload = Omit<
	CreateParaphraseExercisePayload,
	"sentences"
> & {
	sentences?: CreateParaphraseExercisePayload["sentences"];
};
export type UpdateParaphraseExerciseResponse =
	APIResponse<AdminParaphraseListItem>;
