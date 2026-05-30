import { memo } from "react";
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

import type { SAWEditableWord } from "@admin/features/writing/methods/see-and-write/components/word-pool-utils";

/** Ô chỉ đọc — hiển thị metadata từ DB, không cho sửa */
function WordReadOnlyCell({ value }: { value: string }) {
	const display = value.trim() || "—";
	return (
		<TableCell
			className="max-w-40 truncate text-sm text-muted-foreground"
			title={value.trim() || undefined}
		>
			{display}
		</TableCell>
	);
}

type WordRowProps = {
	row: SAWEditableWord;
	index: number;
	disabled: boolean;
	onUpdateWord: (index: number, word: string) => void;
	onRemove: (index: number) => void;
};

const WordRow = memo(function WordRow({
	row,
	index,
	disabled,
	onUpdateWord,
	onRemove,
}: WordRowProps) {
	return (
		<TableRow>
			<TableCell>
				<Input
					value={row.word}
					onChange={(e) => onUpdateWord(index, e.target.value)}
					disabled={disabled}
					className="h-8"
					placeholder="Nhập từ khóa"
					aria-label="Từ khóa"
				/>
			</TableCell>
			<WordReadOnlyCell value={row.ipa} />
			<WordReadOnlyCell value={row.partOfSpeech} />
			<WordReadOnlyCell value={row.meaning} />
			<TableCell className="w-12">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					disabled={disabled}
					onClick={() => onRemove(index)}
					aria-label="Xóa từ khóa"
				>
					<HugeiconsIcon icon={Delete01Icon} className="size-4" />
				</Button>
			</TableCell>
		</TableRow>
	);
});

type SAWEditWordPoolTableProps = {
	label: string;
	words: SAWEditableWord[];
	disabled?: boolean;
	invalid?: boolean;
	error?: { message?: string };
	onAdd: () => void;
	onUpdateWord: (index: number, word: string) => void;
	onRemove: (index: number) => void;
};

/** Bảng từ khóa cho form sửa bài — chỉnh sửa trực tiếp cột Từ, thêm/xóa dòng */
export const SAWEditWordPoolTable = memo(function SAWEditWordPoolTable({
	label,
	words,
	disabled,
	invalid,
	error,
	onAdd,
	onUpdateWord,
	onRemove,
}: SAWEditWordPoolTableProps) {
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
						Thêm từ
					</Button>
				</div>

				{words.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Chưa có từ khóa. Bấm &quot;Thêm từ&quot; để bổ sung.
					</p>
				) : (
					<div
						className="rounded-md border max-h-64 overflow-auto"
						style={{ contentVisibility: "auto" }}
					>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="min-w-28">Từ</TableHead>
									<TableHead className="min-w-24">IPA</TableHead>
									<TableHead className="min-w-24">Loại từ</TableHead>
									<TableHead className="min-w-32">Nghĩa</TableHead>
									<TableHead className="w-12" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{words.map((row, index) => (
									<WordRow
										key={row._key}
										row={row}
										index={index}
										disabled={!!disabled}
										onUpdateWord={onUpdateWord}
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
});
