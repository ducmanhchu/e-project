import { WRITING_TYPE } from "@server/const/writting";
import { createWriting } from "@server/services/writingService";

/**
 * POST /admin/writing/exam — Create exam
 */
export async function createExam(body) {
  return createWriting({ ...body, type: WRITING_TYPE.EXAM_SIMULATION });
}
