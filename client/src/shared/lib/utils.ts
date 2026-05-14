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

const vietnameseWritingCriteria: { [key: string]: string } = {
	task_achievement: "Từ khóa sử dụng",
	coherence_cohesion: "Mức độ liên kết",
	lexical_resource: "Vốn từ vựng",
	grammatical_range_accuracy: "Ngữ pháp",
} as const;

export function translateWritingCriteria(criteria: string): string {
	return vietnameseWritingCriteria[criteria] || criteria;
}

export function translateTopic(topic: WritingExerciseTopic) {
	return vietnameseTopics[topic];
}

export function translateStatus(status: ExerciseStatus) {
	return vietnameseStatus[status];
}

export function translateContentType(contentType: WritingContentType) {
	return vietnameseContentTypes[contentType];
}

export const baseFilterSections = [
	{
		id: "level",
		label: "Cấp độ",
		options: [
			{ id: "beginner", label: "Cơ bản" },
			{ id: "intermediate", label: "Trung cấp" },
			{ id: "advanced", label: "Nâng cao" },
		],
	},
	{
		id: "topic",
		label: "Chủ đề",
		options: [
			{ id: "personal_communication", label: "Giao tiếp hàng ngày" },
			{ id: "everyday_life", label: "Sinh hoạt hàng ngày" },
			{ id: "transportation_travel", label: "Di chuyển và du lịch" },
			{ id: "school_education", label: "Học tập và giáo dục" },
			{ id: "work_business", label: "Công việc và kinh doanh" },
			{ id: "public_services", label: "Dịch vụ công cộng" },
			{ id: "health_medicine", label: "Sức khỏe và y tế" },
			{ id: "shopping_money", label: "Mua sắm và tài chính" },
			{ id: "food_drink", label: "Ẩm thực" },
			{ id: "entertainment_leisure", label: "Giải trí và nghỉ dưỡng" },
			{ id: "nature_environment", label: "Tự nhiên và môi trường" },
			{ id: "science_technology", label: "Khoa học và công nghệ" },
			{ id: "culture_society", label: "Văn hóa và xã hội" },
			{ id: "government_politics", label: "Chính trị và quốc tế" },
			{ id: "history_geography", label: "Lịch sử và địa lý" },
			{ id: "sports_fitness", label: "Thể thao" },
			{ id: "arts_literature", label: "Nghệ thuật và văn học" },
			{ id: "religion_spirituality", label: "Tôn giáo và tinh thần" },
			{ id: "law_justice", label: "Pháp luật và hôn nhân" },
			{ id: "philosophy_ethics", label: "Triết học và đạo đức" },
		],
	},
] as const;

export const statusFilterSection = {
	id: "status",
	label: "Trạng thái",
	options: [
		{ id: "not_started", label: "Chưa bắt đầu" },
		{ id: "in_progress", label: "Đang thực hiện" },
		{ id: "completed", label: "Hoàn thành" },
	],
} as const;

export const SUBMIT_TIMEOUT_MS = 50_000 as const;
