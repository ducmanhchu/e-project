import type { APIResponse } from "@shared/types/utils";

export type Word = {
	_id: string;
	word: string;
	audio?: string;
	createdAt: string;
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
	ipa?: string;
	partOfSpeech?: string;
	updatedAt: string;
};

export type WordListResponse = APIResponse<Word[]>;

export type WordListQueryParams = {
	ids?: string;
	search?: string;
	page?: number;
	limit?: number;
};

// My vocabulary
export type Flashcard = {
	_id: string;
	deckId: string;
	userId: string;
	word: string;
	meaning: string;
	ipa?: string;
	partOfSpeech?: string;
	enExample?: string;
	viExample?: string;
	audio?: string;
	status: "known" | "unknown";
	createdAt: string;
	updatedAt?: string | null;
}

export type Deck = {
	_id: string;
	userId: string;
	name: string;
	description?: string | null;
	visibility: "private" | "public" | "shared";
	tags: string[];
	image?: string | null;
	imagePublicId?: string | null;
	folderId?: string | null;
	cardCount: number;
	createdAt: string;
	updatedAt?: string | null;
};

export type Folder = {
	_id: string;
	userId: string;
	name: string;
	createdAt: string;
	updatedAt?: string | null;
	deckCount?: number;
};

export type FolderListParams = {
	search?: string;
	sortBy?: "name" | "createdAt" | "updatedAt";
	order?: "asc" | "desc";
	page?: number;
	limit?: number;
};

export type DeckListParams = FolderListParams & {
	tags?: string;
	folderId?: string | "null";
};

export type CardListParams = {
	deckId: string;
	search?: string;
	status?: "known" | "unknown";
	shuffle?: boolean;
	sortBy?: "createdAt" | "updatedAt";
	order?: "asc" | "desc";
	page?: number;
	limit?: number;
}

export type CreateFlashcardPayload = {
	deckId: string;
	word: string;
	meaning: string;
	ipa?: string;
	partOfSpeech?: string;
	enExample?: string;
	viExample?: string;
	audio?: string;
}