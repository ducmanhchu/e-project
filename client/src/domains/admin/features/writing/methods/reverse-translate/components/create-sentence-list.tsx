import { memo } from "react";

import type { RTPreviewSentence } from "@shared/types/reverse-translate";
import { Textarea } from "@shared/components/ui/textarea";

type SentenceRowProps = {
	sentence: RTPreviewSentence;
	index: number;
	disabled: boolean;
	onUpdateSentence: (
		index: number,
		field: "referenceAnswer" | "vietnameseText",
		value: string,
	) => void;
};

const SentenceRow = memo(function SentenceRow({
	sentence,
	index,
	disabled,
	onUpdateSentence,
}: SentenceRowProps) {
	return (
		<li className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
			<div className="space-y-1">
				<span className="text-xs text-muted-foreground">
					Câu {sentence.order} — Tiếng Anh
				</span>
				<Textarea
					value={sentence.referenceAnswer}
					onChange={(e) =>
						onUpdateSentence(index, "referenceAnswer", e.target.value)
					}
					disabled={disabled}
					rows={2}
					className="min-h-0 resize-y"
				/>
			</div>
			<span
				className="hidden self-center text-muted-foreground sm:block"
				aria-hidden
			>
				→
			</span>
			<div className="space-y-1">
				<span className="text-xs text-muted-foreground">
					Câu {sentence.order} — Tiếng Việt
				</span>
				<Textarea
					value={sentence.vietnameseText}
					onChange={(e) =>
						onUpdateSentence(index, "vietnameseText", e.target.value)
					}
					disabled={disabled}
					rows={2}
					className="min-h-0 resize-y"
				/>
			</div>
		</li>
	);
});

type RTCreateSentenceListProps = {
	sentences: RTPreviewSentence[];
	disabled: boolean;
	onUpdateSentence: (
		index: number,
		field: "referenceAnswer" | "vietnameseText",
		value: string,
	) => void;
};

export const RTCreateSentenceList = memo(function RTCreateSentenceList({
	sentences,
	disabled,
	onUpdateSentence,
}: RTCreateSentenceListProps) {
	return (
		<div className="space-y-3">
			<p className="text-sm font-medium">Nội dung bài tập</p>
			<ul className="space-y-3">
				{sentences.map((sentence, index) => (
					<SentenceRow
						key={sentence.order}
						sentence={sentence}
						index={index}
						disabled={disabled}
						onUpdateSentence={onUpdateSentence}
					/>
				))}
			</ul>
		</div>
	);
});
