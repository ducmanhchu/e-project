import type {
	ExerciseLevel,
	ExerciseStatus,
	WritingExerciseTopic,
	APIResponse,
} from "@shared/types/utils";

export type SAWStep = "select" | "writing" | "viewing";

export type SAWExercise = {
	id: string;
	title: string;
	level: ExerciseLevel;
	topic: WritingExerciseTopic;
	image: string;
	wordPool: {
		id: string;
		word: string;
		ipa?: string;
		partOfSpeech?: string;
		meaning?: string;
		audio?: string;
	}[];
	requiredKeywordCount: number;
	minWordCount: number;
	maxWordCount: number;
	status: ExerciseStatus;
	completedSentences: number;
	bestScore: number;
	completedAt: string | null;
	keywordQuiz: null | {
		score: number;
		correct: {
			word: string;
			meaning: string;
		}[];
		missed: {
			word: string;
			meaning: string;
		}[];
		wrong: {
			word: string;
			meaning: string;
		}[];
	};
	lastSubmission: null | {
		userAnswer: string;
		score: number;
		gradedBy: string;
		feedback: {
			summary: string;
			enhancedVersion: string;
			criteria: {
				name: string;
				score: number;
				maxScore: number;
				comment: string;
			}[];
			corrections: {
				original: string;
				suggestion: string;
				explanation: string;
			}[];
		};
		createdAt: string;
	};
};

export type KeywordStatus = "correct" | "wrong" | "missed";

export type SAWKeyword = {
	id: string;
	word: string;
	meaning?: string;
};

export type SAWListItem = {
	id: string;
	title: string;
	level: ExerciseLevel;
	topic: WritingExerciseTopic;
	image: string;
	createdAt: string;
	status: ExerciseStatus;
	completedSentences: number;
	bestScore: number;
	completedAt: string | null;
};

export type SAWListQueryParams = {
	level?: string;
	topic?: string;
	status?: string;
	search?: string;
	page?: number;
	limit?: number;
};

export type SAWListResponse = APIResponse<SAWListItem[]>;

export type KeywordSubmitPayload = {
	selectedKeywordIds: string[];
};

export type KeywordSubmitResponse = APIResponse<{
	score: number;
	correct: {
		word: string;
		meaning: string;
	}[];
	missed: {
		word: string;
		meaning: string;
	}[];
	wrong: {
		word: string;
		meaning: string;
	}[];
}>;

export type ParagraphSubmitPayload = {
	userAnswer: string;
};

export type ParagraphSubmitResponse = APIResponse<{
	score: number;
	gradedBy: string;
	feedback: {
		summary: string;
		enhancedVersion: string;
		criteria: {
			name: string;
			score: number;
			maxScore: number;
			comment: string;
		}[];
		corrections: {
			original: string;
			suggestion: string;
			explanation: string;
		}[];
	};
	bestScore: number;
	isCompleted: boolean;
}>;

// ADMIN
export type SAWAdminListItem = Pick<
	SAWListItem,
	"id" | "title" | "level" | "topic" | "image" | "createdAt"
> & {
	imagePublicId?: null | string;
	minWordCount: number;
	maxWordCount: number;
	wordPool: {
		id: string;
		word: string;
		ipa?: string;
		partOfSpeech?: string;
		meaning?: string;
		audio?: string;
		isRequired: boolean;
	}[];
};

export type SAWAdminListQueryParams = {
	level?: string;
	topic?: string;
	page?: number;
	limit?: number;
	search?: string;
	sortBy?: "level" | "createdAt";
	order?: "asc" | "desc";
};

export type SAWAdminExercise = {
	id: string;
	title: string;
	level: ExerciseLevel;
	topic: WritingExerciseTopic;
	description: string;
	image: string;
	imagePublicId?: null | string;
	wordPool: {
		id: string;
		word: string;
		ipa?: string;
		partOfSpeech?: string;
		meaning?: string;
		audio?: string;
		isRequired: boolean;
	}[];
	minWordCount: number;
	maxWordCount: number;
	createdAt: string;
	updatedAt: string;
};

export type SAWExerciseCreatePayload = {
	title: string;
	level: ExerciseLevel;
	image: string;
	topic?: WritingExerciseTopic;
	description?: string;
	minWordCount?: number;
	maxWordCount?: number;
	requiredWords?: string[];
	distractorWords?: string[];
};

export type SAWExerciseUpdatePayload = {
	title?: string;
	level?: ExerciseLevel;
	topic?: WritingExerciseTopic;
	description?: string;
	image?: string;
	minWordCount?: number;
	maxWordCount?: number;
	requiredWords?: string[];
	distractorWords?: string[];
};
