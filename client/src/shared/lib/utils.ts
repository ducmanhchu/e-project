import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
	ExerciseStatus,
	ExerciseLevel,
	WritingContentType,
	WritingExerciseTopic,
} from "@shared/types/utils";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const vietnameseTopics: Record<WritingExerciseTopic, string> = {
	personal_communication: "Giao tiếp",
	everyday_life: "Thường ngày",
	transportation_travel: "Du lịch",
	school_education: "Giáo dục",
	work_business: "Kinh doanh",
	public_services: "Dịch vụ công",
	health_medicine: "Y tế",
	shopping_money: "Tài chính",
	food_drink: "Ẩm thực",
	entertainment_leisure: "Giải trí",
	nature_environment: "Tự nhiên",
	science_technology: "Khoa học",
	culture_society: "Văn hóa",
	government_politics: "Chính trị",
	history_geography: "Lịch sử",
	sports_fitness: "Thể thao",
	arts_literature: "Nghệ thuật",
	religion_spirituality: "Tôn giáo",
	law_justice: "Pháp luật",
	philosophy_ethics: "Triết học",
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

const vietnameseSpeakingCriteria: { [key: string]: string } = {
	accuracy: "Độ chính xác",
	fluency: "Độ trôi chảy",
	completeness: "Độ đầy đủ",
	prosody: "Ngữ điệu",
	mispronunciation: "Phát âm sai",
	omission: "Bỏ sót",
	insertion: "Đọc thừa",
	unexpectedBreak: "Ngắt nghỉ không mong đợi",
	missingBreak: "Thiếu ngắt nghỉ",
} as const;

const vietnameseLevels: Record<ExerciseLevel, string> = {
	beginner: "Cơ bản",
	intermediate: "Trung cấp",
	advanced: "Nâng cao",
} as const;

export function translateLevel(level: ExerciseLevel) {
	return vietnameseLevels[level];
}

export function translateSpeakingCriteria(criteria: string): string {
	return vietnameseSpeakingCriteria[criteria] || criteria;
}

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
			{ id: "personal_communication", label: "Giao tiếp" },
			{ id: "everyday_life", label: "Thường ngày" },
			{ id: "transportation_travel", label: "Du lịch" },
			{ id: "school_education", label: "Giáo dục" },
			{ id: "work_business", label: "Kinh doanh" },
			{ id: "public_services", label: "Dịch vụ công" },
			{ id: "health_medicine", label: "Y tế" },
			{ id: "shopping_money", label: "Tài chính" },
			{ id: "food_drink", label: "Ẩm thực" },
			{ id: "entertainment_leisure", label: "Giải trí" },
			{ id: "nature_environment", label: "Tự nhiên" },
			{ id: "science_technology", label: "Khoa học" },
			{ id: "culture_society", label: "Văn hóa" },
			{ id: "government_politics", label: "Chính trị" },
			{ id: "history_geography", label: "Lịch sử" },
			{ id: "sports_fitness", label: "Thể thao" },
			{ id: "arts_literature", label: "Nghệ thuật" },
			{ id: "religion_spirituality", label: "Tôn giáo" },
			{ id: "law_justice", label: "Pháp luật" },
			{ id: "philosophy_ethics", label: "Triết học" },
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
