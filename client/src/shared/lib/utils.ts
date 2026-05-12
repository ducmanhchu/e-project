import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
	ExerciseStatus,
	WritingContentType,
	WritingExerciseTopic,
} from "@shared/types/utils";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const vietnameseTopics: Record<WritingExerciseTopic, string> = {
	personal_communication: "Giao tiếp hàng ngày",
	everyday_life: "Sinh hoạt hàng ngày",
	transportation_travel: "Di chuyển và du lịch",
	school_education: "Học tập và giáo dục",
	work_business: "Công việc và kinh doanh",
	public_services: "Dịch vụ công cộng",
	health_medicine: "Sức khỏe và y tế",
	shopping_money: "Mua sắm và tài chính",
	food_drink: "Ẩm thực",
	entertainment_leisure: "Giải trí và nghỉ dưỡng",
	nature_environment: "Tự nhiên và môi trường",
	science_technology: "Khoa học và công nghệ",
	culture_society: "Văn hóa và xã hội",
	government_politics: "Chính trị và quốc tế",
	history_geography: "Lịch sử và địa lý",
	sports_fitness: "Thể thao",
	arts_literature: "Nghệ thuật và văn học",
	religion_spirituality: "Tôn giáo và tinh thần",
	law_justice: "Pháp luật và hôn nhân",
	philosophy_ethics: "Triết học và đạo đức",
} as const;

const vietnameseStatus: Record<ExerciseStatus, string> = {
	not_started: "Bắt đầu",
	in_progress: "Đang làm",
	completed: "Hoàn thành",
} as const;

const vietnameseContentTypes: Record<WritingContentType, string> = {
	email: "Email",
	diary: "Nhật ký",
	essay: "Bài văn",
	article: "Bài báo",
	story: "Câu chuyện",
	report: "Báo cáo",
	general: "Tổng hợp",
} as const;

export function translateTopic(topic: WritingExerciseTopic) {
	return vietnameseTopics[topic];
}

export function translateStatus(status: ExerciseStatus) {
	return vietnameseStatus[status];
}

export function translateContentType(contentType: WritingContentType) {
	return vietnameseContentTypes[contentType];
}
