import type {
	FolderListParams,
	WordListQueryParams,
	WordListResponse,
	Folder,
	DeckListParams,
	Deck,
	CardListParams,
	Flashcard,
	CreateFlashcardPayload,
} from "@shared/types/vocab";
import { axiosPrivate } from "@shared/lib/axios-instances";
import type { APIResponse } from "@shared/types/utils";

export const fetchWordList = async (
	params?: WordListQueryParams,
): Promise<WordListResponse> => {
	const { data } = await axiosPrivate.get<WordListResponse>("/vocabulary", {
		params,
	});
	return data;
};

// My vocabulary
export const fetchFolderList = async (params?: FolderListParams): Promise<APIResponse<Folder[]>> => {
	const { data } = await axiosPrivate.get<APIResponse<Folder[]>>("/me/folders", {
		params,
	});
	return data;
};

export const fetchFolderDetail = async (folderId: string): Promise<APIResponse<Folder>> => {
	const { data } = await axiosPrivate.get<APIResponse<Folder>>(`/me/folders/${folderId}`);
	return data;
};

export const createFolder = async (name: string): Promise<APIResponse<Folder>> => {
	const { data } = await axiosPrivate.post<APIResponse<Folder>>("/me/folders", {
		name,
	});
	return data;
};

export const renameFolder = async (folderId: string, name: string): Promise<APIResponse<Folder>> => {
	const { data } = await axiosPrivate.patch<APIResponse<Folder>>(`/me/folders/${folderId}`, {
		name,
	});
	return data;
};

export const deleteFolder = async (folderId: string): Promise<APIResponse<{
	deleted: boolean;
	deletedDecks: number;
	deletedCards: number;
}>> => {
	const { data } = await axiosPrivate.delete<APIResponse<{
		deleted: boolean;
		deletedDecks: number;
		deletedCards: number;
	}>>(`/me/folders/${folderId}`);
	return data;
};

export const fetchDeckList = async (params?: DeckListParams): Promise<APIResponse<Deck[]>> => {
	const { data } = await axiosPrivate.get<APIResponse<Deck[]>>("/me/decks", {
		params,
	});
	return data;
};

export const fetchDeckDetail = async (deckId: string): Promise<APIResponse<Deck>> => {
	const { data } = await axiosPrivate.get<APIResponse<Deck>>(`/me/decks/${deckId}`);
	return data;
};

export const createDeck = async (payload: {
	name: string;
	description?: string;
	folderId?: string;
}): Promise<APIResponse<Deck>> => {
	const { data } = await axiosPrivate.post<APIResponse<Deck>>("/me/decks", payload);
	return data;
};

export const moveDeckToFolder = async (deckId: string, target: string | null): Promise<APIResponse<Deck>> => {
	const { data } = await axiosPrivate.patch<APIResponse<Deck>>(`/me/decks/${deckId}`, {
		folderId: target,
	});
	return data;
};

export const updateDeck = async (deckId: string, payload: {
	name?: string;
	description?: string;
}): Promise<APIResponse<Deck>> => {
	const { data } = await axiosPrivate.patch<APIResponse<Deck>>(`/me/decks/${deckId}`, payload);
	return data;
};

export const deleteDeck = async (deckId: string): Promise<APIResponse<{
	deleted: boolean;
}>> => {
	const { data } = await axiosPrivate.delete<APIResponse<{
		deleted: boolean;
	}>>(`/me/decks/${deckId}`);
	return data;
};

export const fetchFlashcardList = async (params?: CardListParams): Promise<APIResponse<Flashcard[]>> => {
	const { data } = await axiosPrivate.get<APIResponse<Flashcard[]>>("/me/cards", {
		params,
	});
	return data;
};

export const createFlashcard = async (payload: CreateFlashcardPayload): Promise<APIResponse<Flashcard>> => {
	const { data } = await axiosPrivate.post<APIResponse<Flashcard>>("/me/cards", payload);
	return data;
};

export const updateFlashcardStatus = async (cardId: string, payload: { status: "known" | "unknown" }): Promise<APIResponse<Flashcard>> => {
	const { data } = await axiosPrivate.patch<APIResponse<Flashcard>>(`/me/cards/${cardId}`, payload);
	return data;
};