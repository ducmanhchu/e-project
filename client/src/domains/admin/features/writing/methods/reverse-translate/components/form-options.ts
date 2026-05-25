import type { WritingContentType } from "@shared/types/utils";
import { translateContentType } from "@shared/lib/utils";

export const ADMIN_RT_LIST_QUERY_KEY = [
	"admin",
	"reverse-translate",
	"list",
] as const;

export const adminRTExerciseQueryKey = (id: string) =>
	["admin", "reverse-translate", "exercise", id] as const;

const CONTENT_TYPE_IDS: WritingContentType[] = [
	"email",
	"diary",
	"essay",
	"article",
	"story",
	"report",
	"general",
];

export const contentTypeFilterOptions = CONTENT_TYPE_IDS.map((id) => ({
	id,
	label: translateContentType(id),
}));
