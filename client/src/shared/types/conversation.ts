import type {
	APIResponse,
	ExerciseStatus,
	ExerciseLevel,
	WritingExerciseTopic,
} from "./utils";

export type ConversationExercise = {
	id: string;
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
		feedback: {
			accuracy: number;
			fluency: number;
			completeness: number;
			pronunciation: number;
			prosody: number;
		};
		attemptedAt: string;
	}[];
	completedAt: string | null;
};

export type ConversationListItem = {
	id: string;
	level?: ExerciseLevel;
	topic: WritingExerciseTopic;
	title?: string;
	scenario: string;
	messageCount: number;
	createdAt: string;
	status: ExerciseStatus;
};

export type ConversationListQueryParams = {
	level?: string;
	topic?: string;
	status?: string;
	page?: number;
	limit?: number;
};

export type ConversationListResponse = APIResponse<ConversationListItem[]>;

export type ConversationToken = APIResponse<{
	token: string;
	region: string;
	expiresAt: number;
}>;
