import { cn } from "@shared/lib/utils";
import { Link } from "react-router";

import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";

import type {
	ExerciseLevel,
	ExerciseStatus,
	ExerciseTopic,
	ReverseTranslateItem,
} from "@shared/types/reverse-translate";

// const translateContentTypes: Record<ContentType, string> = {
// 	email: "Email",
// 	diary: "Nhật ký",
// 	essay: "Bài văn",
// 	article: "Bài báo",
// 	story: "Câu chuyện",
// 	report: "Báo cáo",
// 	general: "Tổng hợp",
// } as const;

const translateLevels: Record<ExerciseLevel, string> = {
	beginner: "Cơ bản",
	intermediate: "Trung cấp",
	advanced: "Nâng cao",
} as const;

const translateTopics: Record<ExerciseTopic, string> = {
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

const translateStatus: Record<ExerciseStatus, string> = {
	not_started: "Bắt đầu",
	in_progress: "Đang làm",
	completed: "Hoàn thành",
} as const;

const levelStyle: Record<ExerciseLevel, string> = {
	beginner: "bg-green-100 text-green-700",
	intermediate: "bg-sky-100 text-sky-700",
	advanced: "bg-rose-100 text-rose-700",
} as const;

export function ReverseTranslateCard({ card }: { card: ReverseTranslateItem }) {
	return (
		<Card>
			<CardHeader>
				<Badge className={cn(levelStyle[card.level], "mb-2")}>
					{translateLevels[card.level]}
				</Badge>
				<CardTitle className="line-clamp-2">{card.title}</CardTitle>
				<CardDescription className="line-clamp-1">
					{translateTopics[card.topic]}
				</CardDescription>
			</CardHeader>
			<CardContent></CardContent>
			<CardFooter>
				<Button
					size="sm"
					variant={
						card.status === "not_started"
							? "blackHover"
							: card.status === "in_progress"
								? "yellowHover"
								: "greenHover"
					}
				>
					<Link to={`/writing/reverse-translate/${card.id}`}>
						{translateStatus[card.status]}
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
