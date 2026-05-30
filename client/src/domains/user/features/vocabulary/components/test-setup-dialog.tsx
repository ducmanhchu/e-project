import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@shared/components/ui/radio-group";
import { Switch } from "@shared/components/ui/switch";

import {
	VOCAB_ANSWER_LANGUAGE_LABELS,
	VOCAB_QUESTION_TYPE_LABELS,
	VOCAB_QUESTION_TYPE_ORDER,
	type VocabAnswerLanguage,
	type VocabQuestionType,
	type VocabTestConfig,
} from "@user/features/vocabulary/types/test";
import { buildTestSearchParams } from "@user/features/vocabulary/utils/test";

type VocabTestSetupDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	deckId: string;
	maxCount: number;
};

const DEFAULT_ANSWER_LANGUAGE: VocabAnswerLanguage = "en";

/**
 * Dialog thiết lập bài kiểm tra trước khi chuyển sang route /vocabulary/test.
 * @param props.open - Trạng thái mở dialog
 * @param props.onOpenChange - Callback đóng/mở
 * @param props.deckId - Id học phần
 * @param props.maxCount - Số thẻ tối đa (giới hạn số câu)
 */
export function VocabTestSetupDialog({
	open,
	onOpenChange,
	deckId,
	maxCount,
}: VocabTestSetupDialogProps) {
	const navigate = useNavigate();

	const defaultCount = useMemo(
		() => Math.min(10, Math.max(1, maxCount)),
		[maxCount],
	);

	const [count, setCount] = useState(defaultCount);
	const [answerLanguage, setAnswerLanguage] = useState<VocabAnswerLanguage>(
		DEFAULT_ANSWER_LANGUAGE,
	);
	const [enabledTypes, setEnabledTypes] = useState<
		Record<VocabQuestionType, boolean>
	>({
		tf: true,
		mc: true,
		essay: true,
	});

	const questionTypes = VOCAB_QUESTION_TYPE_ORDER.filter(
		(type) => enabledTypes[type],
	);

	const handleTypeToggle = useCallback(
		(type: VocabQuestionType, checked: boolean) => {
			setEnabledTypes((prev) => {
				const next = { ...prev, [type]: checked };
				const activeCount = VOCAB_QUESTION_TYPE_ORDER.filter(
					(item) => next[item],
				).length;
				if (activeCount === 0) return prev;
				return next;
			});
		},
		[],
	);

	const handleStart = useCallback(() => {
		const safeCount = Math.min(Math.max(1, count), maxCount);
		const config: VocabTestConfig = {
			deckId,
			count: safeCount,
			answerLanguage,
			questionTypes,
		};

		onOpenChange(false);
		navigate(`/vocabulary/test?${buildTestSearchParams(config)}`);
	}, [
		answerLanguage,
		count,
		deckId,
		maxCount,
		navigate,
		onOpenChange,
		questionTypes,
	]);

	const handleCountChange = useCallback(
		(value: string) => {
			const parsed = Number.parseInt(value, 10);
			if (!Number.isFinite(parsed)) {
				setCount(1);
				return;
			}
			setCount(Math.min(Math.max(1, parsed), maxCount));
		},
		[maxCount],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Thiết lập bài kiểm tra</DialogTitle>
					<DialogDescription>
						Tùy chỉnh số lượng, ngôn ngữ trả lời và các dạng câu hỏi.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-8 py-2">
					<div className="flex flex-col gap-2">
						<Label htmlFor="test-count">Số câu hỏi</Label>
						<Input
							id="test-count"
							type="number"
							min={1}
							max={maxCount}
							value={count}
							onChange={(event) => handleCountChange(event.target.value)}
						/>
						<p className="text-muted-foreground text-xs">
							Tối đa {maxCount} câu.
						</p>
					</div>

					<div className="flex flex-col gap-3">
						<Label>Trả lời</Label>
						<RadioGroup
							value={answerLanguage}
							onValueChange={(value) =>
								setAnswerLanguage(value as VocabAnswerLanguage)
							}
							className="gap-2"
						>
							{(["en", "vi", "both"] as const).map((value) => (
								<div key={value} className="flex items-center gap-2">
									<RadioGroupItem value={value} id={`answer-${value}`} />
									<Label htmlFor={`answer-${value}`} className="font-normal">
										{value === "both"
											? "Cả hai"
											: VOCAB_ANSWER_LANGUAGE_LABELS[value]}
									</Label>
								</div>
							))}
						</RadioGroup>
					</div>

					<div className="flex flex-col gap-3">
						<Label>Dạng câu hỏi</Label>
						{VOCAB_QUESTION_TYPE_ORDER.map((type) => (
							<div
								key={type}
								className="flex items-center justify-between gap-4"
							>
								<Label htmlFor={`type-${type}`} className="font-normal">
									{VOCAB_QUESTION_TYPE_LABELS[type]}
								</Label>
								<Switch
									id={`type-${type}`}
									checked={enabledTypes[type]}
									onCheckedChange={(checked) => handleTypeToggle(type, checked)}
								/>
							</div>
						))}
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Hủy
					</Button>
					<Button
						type="button"
						variant="blackHover"
						onClick={handleStart}
						disabled={maxCount < 1 || questionTypes.length === 0}
					>
						Bắt đầu
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
