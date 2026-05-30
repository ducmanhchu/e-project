export const ADMIN_CONVERSATION_LIST_QUERY_KEY = [
	"admin",
	"conversation",
	"list",
] as const;

export const adminConversationExerciseQueryKey = (id: string) =>
	["admin", "conversation", "exercise", id] as const;
