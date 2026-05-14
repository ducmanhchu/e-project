import type { AttemptAction, APIResponse } from "@shared/types/utils";
import type { RTExercise } from "@shared/types/reverse-translate";
import type { SAWExercise } from "@shared/types/see-and-write";
import type { ParaphraseExercise } from "@shared/types/paraphrase";

import { axiosPrivate } from "@shared/api/axios-client";

export const resetExercise = async (
	id: string,
	payload: { action: AttemptAction },
) => {
	const { data } = await axiosPrivate.put<
		APIResponse<RTExercise | SAWExercise | ParaphraseExercise>
	>(`/attempts/${id}`, payload);
	return data;
};
