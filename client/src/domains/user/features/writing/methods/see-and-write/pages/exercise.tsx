import { useParams } from "react-router";

export function SeeAndWriteExercise() {
	const { id } = useParams<{ id: string }>();

	return <div>SeeAndWrite exercise: {id}</div>;
}

