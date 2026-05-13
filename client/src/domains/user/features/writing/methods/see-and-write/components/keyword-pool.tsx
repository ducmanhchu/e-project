import type { SAWExercise } from "@shared/types/see-and-write";
import { Skeleton } from "@shared/components/ui/skeleton";
import { SAWKeyword } from "@user/features/writing/methods/see-and-write/components/keyword";
import type { KeywordStatus, SAWStep } from "@shared/types/see-and-write";

type KeywordPoolProps = {
	wordPool: SAWExercise["wordPool"] | undefined;
	step: SAWStep;
	requiredKeywordCount: number;
	selectedCount: number;
	isLoading?: boolean;
	isSelected: (id: string) => boolean;
	isDisabled: (id: string) => boolean;
	getStatus: (word: string) => KeywordStatus | undefined;
	onToggle: (id: string) => void;
};

export function KeywordPool({
	wordPool,
	step,
	requiredKeywordCount,
	selectedCount,
	isLoading,
	isSelected,
	isDisabled,
	getStatus,
	onToggle,
}: KeywordPoolProps) {
	if (isLoading || !wordPool) {
		return (
			<div className="flex flex-col gap-4 w-full min-w-0">
				<Skeleton className="h-5 w-72" />
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
					{Array.from({ length: 12 }).map((_, i) => (
						<Skeleton key={i} className="h-16 rounded-2xl" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 w-full min-w-0">
			{step === "select" ? (
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="text-secondary-black text-sm font-medium">
						Chọn{" "}
						<span className="font-medium text-red-800">
							{requiredKeywordCount}
						</span>{" "}
						từ khóa thích hợp để mô tả hình ảnh:
					</p>
					<p className="text-muted-foreground text-sm">
						Đã chọn{" "}
						<span className="text-secondary-black font-medium">
							{selectedCount}
						</span>
						/{requiredKeywordCount}
					</p>
				</div>
			) : (
				<p className="text-secondary-black text-sm font-medium">
					Kết quả chọn từ khóa:
				</p>
			)}

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
				{wordPool.map((keyword) => {
					const isSelectStep = step === "select";
					const displayKeyword = isSelectStep
						? { id: keyword.id, word: keyword.word }
						: keyword;

					return (
						<SAWKeyword
							key={keyword.id}
							keyword={displayKeyword}
							status={isSelectStep ? undefined : getStatus(keyword.word)}
							selected={isSelectStep && isSelected(keyword.id)}
							disabled={isSelectStep && isDisabled(keyword.id)}
							onClick={isSelectStep ? () => onToggle(keyword.id) : undefined}
						/>
					);
				})}
			</div>

			{step !== "select" && (
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
					<span className="inline-flex items-center gap-1.5">
						<span className="inline-block size-3 rounded-full bg-secondary-green border border-secondary-black" />
						Đúng
					</span>
					<span className="inline-flex items-center gap-1.5">
						<span className="inline-block size-3 rounded-full bg-secondary-red border border-secondary-black" />
						Sai
					</span>
					<span className="inline-flex items-center gap-1.5">
						<span className="inline-block size-3 rounded-full bg-secondary-yellow border border-secondary-black" />
						Còn thiếu
					</span>
				</div>
			)}
		</div>
	);
}
