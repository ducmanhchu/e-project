import { memo } from "react";
import { Controller, type Control } from "react-hook-form";

import { baseFilterSections } from "@shared/lib/utils";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@shared/components/ui/field";
import { Input } from "@shared/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@shared/components/ui/select";

import { contentTypeFilterOptions } from "@admin/features/writing/methods/reverse-translate/components/form-options";
import type { RTMetadataValues } from "@admin/features/writing/methods/reverse-translate/components/form-utils";

const levelSection = baseFilterSections.find((s) => s.id === "level")!;
const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

type RTMetadataFieldsProps = {
	control: Control<RTMetadataValues>;
	disabled?: boolean;
};

/** Metadata dùng chung dialog tạo và sửa */
export const RTMetadataFields = memo(function RTMetadataFields({
	control,
	disabled = false,
}: RTMetadataFieldsProps) {
	return (
		<FieldGroup>
			<Controller
				name="title"
				control={control}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel htmlFor="rt-metadata-title">Tiêu đề</FieldLabel>
						<Input
							{...field}
							id="rt-metadata-title"
							placeholder="Nhập tiêu đề bài tập"
							disabled={disabled}
							aria-invalid={fieldState.invalid}
						/>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<div className="grid gap-4 sm:grid-cols-3">
				<Controller
					name="level"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel>Cấp độ</FieldLabel>
							<Select
								value={field.value}
								onValueChange={field.onChange}
								disabled={disabled}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder={levelSection.label} />
								</SelectTrigger>
								<SelectContent>
									{levelSection.options.map((option) => (
										<SelectItem key={option.id} value={option.id}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Controller
					name="topic"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel>Chủ đề</FieldLabel>
							<Select
								value={field.value}
								onValueChange={field.onChange}
								disabled={disabled}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder={topicSection.label} />
								</SelectTrigger>
								<SelectContent>
									{topicSection.options.map((option) => (
										<SelectItem key={option.id} value={option.id}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Controller
					name="contentType"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel>Loại bài</FieldLabel>
							<Select
								value={field.value}
								onValueChange={field.onChange}
								disabled={disabled}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Loại bài" />
								</SelectTrigger>
								<SelectContent>
									{contentTypeFilterOptions.map((option) => (
										<SelectItem key={option.id} value={option.id}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</div>
		</FieldGroup>
	);
});
