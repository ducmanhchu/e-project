import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@shared/components/ui/table";

import type { RTEditableVocab } from "@admin/features/writing/methods/reverse-translate/components/form-utils";

type VocabRowProps = {
	row: RTEditableVocab;
	index: number;
	maxSentenceIndex: number;
	disabled: boolean;
	onUpdateSentenceIndex: (index: number, sentenceIndex: number) => void;
	onUpdateWord: (index: number, word: string) => void;
	onRemove: (index: number) => void;
};

const VocabRow = memo(function VocabRow({
	row,
	index,
	maxSentenceIndex,
	disabled,
	onUpdateSentenceIndex,
	onUpdateWord,
	onRemove,
}: VocabRowProps) {
	return (
		<TableRow>
			<TableCell>
				<Input
					type="number"
					min={1}
					max={maxSentenceIndex}
					value={row.sentenceIndex}
					onChange={(e) =>
						onUpdateSentenceIndex(index, Number(e.target.value) || 1)
					}
					disabled={disabled}
					className="h-8 w-20"
					aria-label={`Thuộc câu cho từ ${row.word || "mới"}`}
				/>
			</TableCell>
			<TableCell>
				<Input
					value={row.word}
					onChange={(e) => onUpdateWord(index, e.target.value)}
					disabled={disabled}
					className="h-8"
					placeholder="Nhập từ vựng"
					aria-label="Từ vựng"
				/>
			</TableCell>
			<TableCell className="w-12">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					disabled={disabled}
					onClick={() => onRemove(index)}
					aria-label="Xóa từ vựng"
				>
					<HugeiconsIcon icon={Delete01Icon} className="size-4" />
				</Button>
			</TableCell>
		</TableRow>
	);
});

type RTCreateVocabularyTableProps = {
	vocabulary: RTEditableVocab[];
	sentenceCount: number;
	disabled: boolean;
	onAdd: () => void;
	onUpdateSentenceIndex: (index: number, sentenceIndex: number) => void;
	onUpdateWord: (index: number, word: string) => void;
	onRemove: (index: number) => void;
};

export const RTCreateVocabularyTable = memo(function RTCreateVocabularyTable({
	vocabulary,
	sentenceCount,
	disabled,
	onAdd,
	onUpdateSentenceIndex,
	onUpdateWord,
	onRemove,
}: RTCreateVocabularyTableProps) {
	const canManageVocab = sentenceCount > 0;

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-end">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={disabled || !canManageVocab}
					onClick={onAdd}
				>
					<HugeiconsIcon icon={Add01Icon} className="size-4" />
					Thêm từ
				</Button>
			</div>

			{!canManageVocab ? (
				<p className="text-sm text-muted-foreground">
					Cần có ít nhất một câu trước khi thêm từ vựng.
				</p>
			) : vocabulary.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Chưa có từ vựng. Bấm &quot;Thêm từ&quot; để bổ sung hoặc lưu bài không
					kèm từ vựng.
				</p>
			) : (
				<div
					className="rounded-md border max-h-64 overflow-y-auto"
					style={{ contentVisibility: "auto" }}
				>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-28">Thuộc câu</TableHead>
								<TableHead>Từ</TableHead>
								<TableHead className="w-12" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{vocabulary.map((row, index) => (
								<VocabRow
									key={row._key}
									row={row}
									index={index}
									maxSentenceIndex={sentenceCount}
									disabled={disabled}
									onUpdateSentenceIndex={onUpdateSentenceIndex}
									onUpdateWord={onUpdateWord}
									onRemove={onRemove}
								/>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
});
