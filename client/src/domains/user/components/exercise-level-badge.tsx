import type { ExerciseLevel } from "@shared/types/utils";
import { Badge } from "@shared/components/ui/badge";
import { cn } from "@shared/lib/utils";

const levelStyle: Record<ExerciseLevel, string> = {
	beginner: "bg-green-100 text-green-700",
	intermediate: "bg-sky-100 text-sky-700",
	advanced: "bg-rose-100 text-rose-700",
} as const;

const translateLevels: Record<ExerciseLevel, string> = {
	beginner: "Cơ bản",
	intermediate: "Trung cấp",
	advanced: "Nâng cao",
} as const;

export function ExerciseLevelBadge({ level }: { level: ExerciseLevel }) {
	return (
		<Badge className={cn(levelStyle[level])}>{translateLevels[level]}</Badge>
	);
}
