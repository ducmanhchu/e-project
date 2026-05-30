export const ADMIN_SAW_LIST_QUERY_KEY = [
	"admin",
	"see-and-write",
	"list",
] as const;

export const adminSAWExerciseQueryKey = (id: string) =>
	["admin", "see-and-write", "exercise", id] as const;
