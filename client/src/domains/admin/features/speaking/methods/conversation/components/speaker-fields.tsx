import { memo } from "react";
import type { Control, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";

import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@shared/components/ui/field";
import { Input } from "@shared/components/ui/input";

import type { ConversationCreateFormValues } from "@admin/features/speaking/methods/conversation/components/conversation-form-utils";

type ConversationSpeakerFieldsProps = {
	control: Control<ConversationCreateFormValues>;
	errors: FieldErrors<ConversationCreateFormValues>;
	disabled?: boolean;
};

export const ConversationSpeakerFields = memo(
	function ConversationSpeakerFields({
		control,
		errors,
		disabled,
	}: ConversationSpeakerFieldsProps) {
		return (
			<div className="grid gap-6 sm:grid-cols-2">
				<FieldGroup>
					<FieldLabel className="text-base font-medium">Nhân vật 1</FieldLabel>
					<Controller
						name="speakerA.name"
						control={control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Tên</FieldLabel>
								<Input
									{...field}
									id={field.name}
									disabled={disabled}
									placeholder="Nhập tên nhân vật A"
									aria-invalid={fieldState.invalid}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>
					<Controller
						name="speakerA.persona"
						control={control}
						render={({ field }) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Mô tả</FieldLabel>
								<Input
									{...field}
									id={field.name}
									disabled={disabled}
									placeholder="Mô tả nhân vật (tuỳ chọn)"
								/>
							</Field>
						)}
					/>
					{errors.speakerA && (
						<FieldError errors={[errors.speakerA as { message?: string }]} />
					)}
				</FieldGroup>

				<FieldGroup>
					<FieldLabel className="text-base font-medium">Nhân vật 2</FieldLabel>
					<Controller
						name="speakerB.name"
						control={control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Tên</FieldLabel>
								<Input
									{...field}
									id={field.name}
									disabled={disabled}
									placeholder="Nhập tên nhân vật B"
									aria-invalid={fieldState.invalid}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>
					<Controller
						name="speakerB.persona"
						control={control}
						render={({ field }) => (
							<Field>
								<FieldLabel htmlFor={field.name}>Mô tả</FieldLabel>
								<Input
									{...field}
									id={field.name}
									disabled={disabled}
									placeholder="Mô tả nhân vật (tuỳ chọn)"
								/>
							</Field>
						)}
					/>
					{errors.speakerB && (
						<FieldError errors={[errors.speakerB as { message?: string }]} />
					)}
				</FieldGroup>
			</div>
		);
	},
);
