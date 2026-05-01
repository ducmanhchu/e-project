import { useParams } from "react-router";

export function ConversationExercise() {
	const { id } = useParams<{ id: string }>();

	return <div>Conversation exercise: {id}</div>;
}

