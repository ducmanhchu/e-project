import { useParams } from "react-router";

export function ReverseTranslateExercise() {
	const { id } = useParams<{ id: string }>();

	return <div>ReverseTranslate exercise: {id}</div>;
}

