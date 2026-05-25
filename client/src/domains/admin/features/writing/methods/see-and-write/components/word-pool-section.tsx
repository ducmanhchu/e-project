import type { SAWAdminExercise } from "@shared/types/see-and-write";
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

type WordPoolEntry = SAWAdminExercise["wordPool"][number];

type SAWWordPoolSectionProps = {
	label: string;
	words: WordPoolEntry[];
	updateFieldName: string;
	updateValue: string;
	onUpdateChange: (value: string) => void;
	placeholder: string;
	disabled?: boolean;
	invalid?: boolean;
	error?: { message?: string };
};

export function SAWWordPoolSection({
	label,
	words,
	updateFieldName,
	updateValue,
	onUpdateChange,
	placeholder,
	disabled,
	invalid,
	error,
}: SAWWordPoolSectionProps) {
	return (
		<Field data-invalid={invalid}>
			<FieldLabel>{label}</FieldLabel>

			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Từ</TableHead>
							<TableHead>IPA</TableHead>
							<TableHead>Loại từ</TableHead>
							<TableHead>Nghĩa</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{words.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={4}
									className="text-center text-muted-foreground"
								>
									Chưa có từ khóa
								</TableCell>
							</TableRow>
						) : (
							words.map((entry) => (
								<TableRow key={entry.id}>
									<TableCell className="font-medium">{entry.word}</TableCell>
									<TableCell className="text-muted-foreground">
										{entry.ipa || "—"}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{entry.partOfSpeech || "—"}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{entry.meaning || "—"}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex flex-col gap-1.5">
				<FieldLabel htmlFor={updateFieldName} className="text-muted-foreground">
					Cập nhật
				</FieldLabel>
				<Input
					id={updateFieldName}
					value={updateValue}
					onChange={(e) => onUpdateChange(e.target.value)}
					placeholder={placeholder}
					disabled={disabled}
					aria-invalid={invalid}
				/>
				<p className="text-xs text-muted-foreground">
					Cập nhật sẽ ghi đè toàn bộ từ trước đó. Nhập các từ khóa, ngăn cách
					bởi dấu phẩy
				</p>
			</div>

			{invalid && error && <FieldError errors={[error]} />}
		</Field>
	);
}
