import { HugeiconsIcon } from "@hugeicons/react";
import { CoinbaseIcon, Loading03Icon } from "@hugeicons/core-free-icons";

import { ShimmerText } from "@user/components/shimmer-text";
import { Button } from "@shared/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldLabel,
} from "@shared/components/ui/field";
import { Textarea } from "@shared/components/ui/textarea";
import { MyWallet } from "@user/components/my-wallet";
import { cn } from "@shared/lib/utils";

type ParagraphValidation = {
	wordCount: number;
	usedKeywordCount: number;
	isMinOk: boolean;
	isMaxOk: boolean;
	hasKeyword: boolean;
	isValid: boolean;
};

type ParagraphInputProps = {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	validation: ParagraphValidation;
	minWordCount: number;
	maxWordCount: number;
	isSubmitting: boolean;
};

export function ParagraphInput({
	value,
	onChange,
	onSubmit,
	validation,
	minWordCount,
	maxWordCount,
	isSubmitting,
}: ParagraphInputProps) {
	const isWordCountInRange = validation.isMinOk && validation.isMaxOk;
	const disabled = !validation.isValid || isSubmitting;

	return (
		<div className="flex w-full min-w-0 flex-col gap-4 self-start">
			<Field>
				<FieldLabel htmlFor="saw-description">
					Đoạn văn mô tả hình ảnh.
				</FieldLabel>
				<FieldDescription>
					Viết đoạn văn ngắn mô tả hình ảnh, trong đó sử dụng ít nhất một từ
					khóa từ bảng từ khóa trên - tối thiểu{" "}
					<span className="text-red-700">{minWordCount}</span> từ, tối đa{" "}
					<span className="text-red-700">{maxWordCount}</span> từ.
				</FieldDescription>
				<Textarea
					id="saw-description"
					placeholder="Nhập đoạn văn mô tả ở đây..."
					className="h-40 max-h-40 min-h-0 overflow-y-auto field-sizing-fixed border-secondary-black bg-neutral-50"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					disabled={isSubmitting}
				/>
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
					<span
						className={cn(
							isWordCountInRange ? "text-muted-foreground" : "text-red-700",
						)}
					>
						{validation.wordCount} từ
					</span>
					<span className="text-muted-foreground">-</span>
					<span
						className={cn(
							validation.hasKeyword ? "text-muted-foreground" : "text-red-700",
						)}
					>
						Đã dùng {validation.usedKeywordCount} từ khóa
					</span>
				</div>
			</Field>
			<div className="flex gap-1.5 w-full">
				<Button
					variant="blackHover"
					className="grow"
					onClick={onSubmit}
					disabled={disabled}
				>
					{isSubmitting ? (
						<div className="flex items-center gap-2">
							<HugeiconsIcon
								icon={Loading03Icon}
								className="animate-spin shrink-0"
							/>
							<ShimmerText
								className="min-h-0 min-w-0 flex-1 justify-start overflow-hidden"
								textClassName="text-sm whitespace-nowrap [--base-color:var(--color-secondary-white)] [--shimmer-color:white]"
							/>
						</div>
					) : (
						<div className="flex items-center gap-1.5">
							<span className="flex items-center gap-1">
								<HugeiconsIcon icon={CoinbaseIcon} />1
							</span>
							-<span>Đánh giá</span>
						</div>
					)}
				</Button>
				<MyWallet className="py-0.5 ps-0.5 pe-2 bg-neutral-50" secondary />
			</div>
		</div>
	);
}
