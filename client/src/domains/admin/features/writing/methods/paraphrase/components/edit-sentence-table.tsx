import { memo, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@shared/components/ui/field";
import { Input } from "@shared/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@shared/components/ui/table";

import type { ParaphraseEditableSentence } from "@admin/features/writing/methods/paraphrase/components/paraphrase-form-utils";

type SentenceRowProps = {
	row: ParaphraseEditableSentence;
	index: number;
	disabled: boolean;
	onUpdateTargetSentence: (index: number, targetSentence: string) => void;
	onRemove: (index: number) => void;
};

const SentenceRow = memo(function SentenceRow({
	row,
	index,
	disabled,
	onUpdateTargetSentence,
	onRemove,
}: SentenceRowProps) {
	return (
		<TableRow>
			<TableCell className="w-16 tabular-nums text-muted-foreground">
				{row.order}
			</TableCell>
			<TableCell>
				<Input
					value={row.targetSentence}
					onChange={(e) => onUpdateTargetSentence(index, e.target.value)}
					disabled={disabled}
					className="h-8"
					placeholder="Nhập câu hỏi"
					aria-label={`Câu hỏi ${row.order}`}
				/>
			</TableCell>
			<TableCell className="w-12">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					disabled={disabled}
					onClick={() => onRemove(index)}
					aria-label={`Xóa câu hỏi ${row.order}`}
				>
					<HugeiconsIcon icon={Delete01Icon} className="size-4" />
				</Button>
			</TableCell>
		</TableRow>
	);
});

type ParaphraseEditSentenceTableProps = {
	label?: string;
	sentences: ParaphraseEditableSentence[];
	disabled?: boolean;
	invalid?: boolean;
	error?: { message?: string };
	onAdd: () => void;
	onUpdateTargetSentence: (index: number, targetSentence: string) => void;
	onRemove: (index: number) => void;
};

/** Bảng câu hỏi cho form tạo/sửa bài — chỉnh sửa trực tiếp, thêm/xóa dòng */
export const ParaphraseEditSentenceTable = memo(
	function ParaphraseEditSentenceTable({
		label = "Các câu hỏi hiện tại",
		sentences,
		disabled,
		invalid,
		error,
		onAdd,
		onUpdateTargetSentence,
		onRemove,
	}: ParaphraseEditSentenceTableProps) {
		const sortedSentences = useMemo(
			() =>
				sentences
					.map((sentence, index) => ({ sentence, index }))
					.sort((a, b) => a.sentence.order - b.sentence.order),
			[sentences],
		);

		return (
			<Field data-invalid={invalid}>
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<FieldLabel>{label}</FieldLabel>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={disabled}
							onClick={onAdd}
						>
							<HugeiconsIcon icon={Add01Icon} className="size-4" />
							Thêm câu hỏi
						</Button>
					</div>

					{sortedSentences.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Chưa có câu hỏi. Bấm &quot;Thêm câu hỏi&quot; để bổ sung.
						</p>
					) : (
						<div
							className="rounded-md border max-h-64 overflow-auto"
							style={{ contentVisibility: "auto" }}
						>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-16">STT</TableHead>
										<TableHead className="min-w-48">Câu hỏi</TableHead>
										<TableHead className="w-12" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{sortedSentences.map(({ sentence, index }) => (
										<SentenceRow
											key={sentence._key}
											row={sentence}
											index={index}
											disabled={!!disabled}
											onUpdateTargetSentence={onUpdateTargetSentence}
											onRemove={onRemove}
										/>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>

				{invalid && error && <FieldError errors={[error]} />}
			</Field>
		);
	},
);
