import type {
	ExerciseLevel,
	WritingExerciseTopic,
	WritingContentType,
	ExerciseStatus,
	APIResponse,
} from "./utils";
import type { Word } from "./vocab";

export type RTItem = {
	id: string;
	title: string;
	level: ExerciseLevel;
	topic: WritingExerciseTopic;
	contentType: WritingContentType;
	totalSentences: number;
	createdAt: string;
	status: ExerciseStatus;
	completedSentences: number;
	completedAt: string | null;
};

export type UserLastSubmission = {
	userAnswer: string;
	score: number;
	gradeBy: string;
	feedback: {
		suggestion: string;
		improvements: string[];
		comment: string;
	};
	createdAt: string;
};

export type ReverseTranslateListResponse = APIResponse<RTItem[]>;

export type ReverseTranslateQueryParams = {
	level?: string;
	contentType?: string;
	topic?: string;
	status?: string;
	page?: number;
	limit?: number;
};

export type RTExercise = Omit<RTItem, "createdAt"> & {
	vietnameseParagraph: string;
	vocabularyRefs: {
		id: string;
		sentenceIndex: number;
	}[];
	sentences: {
		order: number;
		vietnameseText: string;
		isCompleted: boolean;
		lastSubmission: UserLastSubmission | null;
	}[];
};

export type RTExerciseResponse = APIResponse<RTExercise>;

export type RTExerciseSubmitPayload = {
	sentenceOrder: number;
	userAnswer: string;
};

export type RTExerciseSubmitData = Omit<
	UserLastSubmission,
	"userAnswer" | "createdAt"
> & {
	isCompleted: boolean;
};

export type RTExerciseSubmitResponse = APIResponse<RTExerciseSubmitData>;

export type CurrentFeedback = Omit<
	UserLastSubmission,
	"createdAt" | "gradeBy"
> & {
	idx: number;
};

export type ViewingFeedback = {
	idx: number;
	userAnswer: string;
	score: number;
	feedback: {
		suggestion: string;
		improvements: string[];
		comment: string;
	};
};

export type FeedbackPanelProps = {
	progress: { completed: number; total: number };
	viewingFeedback: ViewingFeedback | null;
	vocabList: Word[];
	isVocabListLoading: boolean;
	isSubmitting: boolean;
	hasVocabulary: boolean;
};

export type SentenceParagraphProps = {
	sentences: RTExercise["sentences"];
	currentSentenceIdx: number | null;
	viewingSentenceIdx: number | null;
	onSentenceClick: (order: number) => void;
	isLoading?: boolean;
};
