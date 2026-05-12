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
	page?: number;
	limit?: number;
};

export type ParaphraseListResponse = APIResponse<ParaphraseListItem[]>;
