import type {
	APIResponse,
	ExerciseStatus,
	ExerciseLevel,
	WritingExerciseTopic,
} from "./utils";

// Azure
export type AzureToken = {
	token: string;
	region: string;
	expiresAt: number;
};

export type ConversationToken = APIResponse<AzureToken>;

export type PhonemeAssessment = {
	Phoneme: string;
	AccuracyScore: number;
	Offset?: number;
	Duration?: number;
};

export type SyllableAssessment = {
	Syllable: string;
	AccuracyScore: number;
	Offset?: number;
	Duration?: number;
};

export type WordAssessment = {
	Word: string;
	AccuracyScore: number;
	ErrorType:
		| "None"
		| "Omission"
		| "Insertion"
		| "Mispronunciation"
		| "UnexpectedBreak"
		| "MissingBreak";
	Phonemes?: PhonemeAssessment[];
	Syllables?: SyllableAssessment[];
	UnexpectedBreak?: { Confidence: number };
	MissingBreak?: { Confidence: number };
};

export type PronunciationResultPayload = {
	accuracyScore: number;
	fluencyScore: number;
	completenessScore: number;
	pronunciationScore: number;
	prosodyScore: number;
	words: WordAssessment[];
	recognizedText: string;
};

// Exercise
export type ConversationExercise = {
	id: string;
	title: string;
	level: ExerciseLevel;
	topic: WritingExerciseTopic;
	mode: "single_role" | "both_roles";
	scenario: string;
	speakers: {
		key: string;
		name: string;
		persona: string;
	}[];
	messages: {
		order: number;
		speakerKey: string;
		text: string;
		slang: {
			term: string;
			partOfSpeech: string;
			meaning: string;
			example: string;
			register: string;
		}[];
	}[];
	createdAt: string;
	status: ExerciseStatus;
	messageAttempts: {
		messageOrder: number;
		targetText: string;
		feedback: PronunciationResultPayload;
		attemptedAt: string;
	}[];
	completedAt: string | null;
};

// List
export type ConversationListItem = {
	id: string;
	title: string;
	level: ExerciseLevel;
	topic: WritingExerciseTopic;
	scenario: string;
	messageCount: number;
	createdAt: string;
	status: ExerciseStatus;
};

export type ConversationListQueryParams = {
	page?: number;
	limit?: number;
	level?: string;
	topic?: string;
	status?: string;
	search?: string;
};

export type ConversationListResponse = APIResponse<ConversationListItem[]>;

// UI
export type ConversationLineProps = {
	order: number;
	speakerKey: "A" | "B";
	speakerName: string;
	text: string;
	slang: {
		term: string;
		partOfSpeech: string;
		meaning: string;
		example: string;
		register: string;
	}[];
	hasAttempt?: boolean;
	isActive?: boolean;
	onSelect?: () => void;
};

// Server submission
export type ConversationSubmitPayload = {
	messageOrder: number;
	targetText: string;
	feedback: PronunciationResultPayload;
};

export type ConversationSubmitResponse = APIResponse<{
	status: ExerciseStatus;
	messageAttempts: {
		messageOrder: number;
		targetText: string;
		feedback: PronunciationResultPayload;
		attemptedAt: string;
	}[];
	completedAt: string | null;
}>;
