import { Exam } from "@server/models/writing/Exam";
import { ApiError } from "@server/helpers/ApiError";
import { WRITING_TYPE } from "@server/const/writting";
import { createWriting } from "@server/services/writingService";

/**
 * GET /admin/writing/exam — List all exams (admin view)
 */
export async function listExams({ page = 1, limit = 20 } = {}) {
  const [exams, total] = await Promise.all([
    Exam.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Exam.countDocuments(),
  ]);

  return {
    items: exams.map((e) => ({
      id: e._id,
      title: e.title,
      level: e.level,
      topic: e.topic,
      examType: e.examType,
      examPrompt: e.examPrompt,
      imageUrl: e.imageUrl || null,
      totalSentences: e.totalSentences,
      createdAt: e.createdAt,
    })),
    total,
    page,
    limit,
  };
}

/**
 * GET /admin/writing/exam/:id — Full exam data
 */
export async function getExamAdmin(examId) {
  const exam = await Exam.findById(examId).lean();
  if (!exam) throw ApiError.notFound("Exam not found");

  return {
    id: exam._id,
    title: exam.title,
    level: exam.level,
    topic: exam.topic,
    description: exam.description,
    examType: exam.examType,
    examPrompt: exam.examPrompt,
    imageUrl: exam.imageUrl || null,
    sortOrder: exam.sortOrder,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
  };
}

/**
 * POST /admin/writing/exam — Create exam
 */
export async function createExam(body) {
  return createWriting({ ...body, type: WRITING_TYPE.EXAM_SIMULATION });
}
