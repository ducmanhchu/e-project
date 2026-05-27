export const ADMIN_PARAPHRASE_LIST_QUERY_KEY = [
	"admin",
	"paraphrase",
	"list",
] as const;

export const adminParaphraseExerciseQueryKey = (id: string) =>
	["admin", "paraphrase", "exercise", id] as const;
