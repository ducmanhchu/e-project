import { useParams } from "react-router";

export function ParaphraseExercise() {
	const { id } = useParams<{ id: string }>();

	return <div>Paraphrase exercise: {id}</div>;
}

