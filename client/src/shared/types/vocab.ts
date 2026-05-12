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
