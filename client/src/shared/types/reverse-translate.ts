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

// ADMIN
export type AdminRTListItem = RTItem;
export type AdminRTListParams = {
	page?: number;
	limit?: number;
	sortBy?: "level" | "createdAt";
	order?: "asc" | "desc";
	search?: string;
	level?: string;
	contentType?: string;
	topic?: string;
};

export type RTPreviewSentence = {
	order: number;
	referenceAnswer: string;
	vietnameseText: string;
};

export type RTPreviewVocabulary = {
	sentenceIndex: number;
	word: string;
	partOfSpeech: string;
	meaning: string;
	example: string;
};

export type RTPreviewPayload = {
	paragraph: string;
	type: "reverse_translation";
	level: ExerciseLevel;
	contentType: WritingContentType;
	topic: WritingExerciseTopic;
	title: string;
};

export type RTPreviewData = {
	vietnameseParagraph: string;
	sentences: RTPreviewSentence[];
	vocabulary: RTPreviewVocabulary[];
	provider: string;
};

export type RTPreviewResponse = APIResponse<RTPreviewData>;

export type RTCreatePayload = {
	title: string;
	type: "reverse_translation";
	level: ExerciseLevel;
	topic: WritingExerciseTopic;
	contentType: WritingContentType;
	vietnameseParagraph: string;
	sentences: {
		vietnameseText: string;
		referenceAnswer: string;
	}[];
};

export type RTCreateLessonData = {
	id?: string;
	_id?: string;
	title: string;
	totalSentences?: number;
};

export type RTCreateResponse = APIResponse<RTCreateLessonData>;

export type RTDictionaryEntry = {
	word: string;
	partOfSpeech: string;
	example?: string;
	sentenceIndex?: number | null;
};

export type RTDictionaryResponse = APIResponse<{ saved: number }>;

export type RTUpdatePayload = {
	title: string;
	level: ExerciseLevel;
	topic: WritingExerciseTopic;
	contentType: WritingContentType;
	vietnameseParagraph: string;
	sentences: {
		vietnameseText: string;
		referenceAnswer: string;
	}[];
	vocabulary: {
		sentenceIndex: number;
		word: string;
	}[];
};

export type RTUpdateLessonData = {
	id: string;
	title: string;
	level: ExerciseLevel;
	topic: WritingExerciseTopic;
	contentType: WritingContentType;
	description?: string;
	totalSentences: number;
	updatedAt: string;
};

export type RTUpdateResponse = APIResponse<RTUpdateLessonData>;

export type AdminRTExercise = Pick<RTItem, "id" | "title" | "level" | "topic" | "contentType" | "totalSentences" | "createdAt"> & {
	description: string;
	vietnameseParagraph: string;
	updatedAt: string;
	sentences: {
		order: number;
		vietnameseText: string;
		referenceAnswer: string;
	}[];
	vocabulary: {
		vocabularyId: string;
		word: string;
		partOfSpeech: string;
		ipa: string;
		definitions: {
			definitionCefrLevel?: string;
			engDef?: string;
			viDef?: string;
			example?: {
				engEx?: string;
				viEx?: string;
			};
			synonyms?: string[];
			antonyms?: string[];
		}[];
		sentenceIndex: number | null;
	}[];
}