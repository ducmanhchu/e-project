import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Delete01Icon,
	Loading02Icon,
	PencilEdit01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@shared/components/ui/button";

import { useConversationDeletingId } from "@admin/features/speaking/methods/conversation/components/deleting-context";

type ConversationActionsCellProps = {
	id: string;
	onEditRow: (id: string) => void;
	onDeleteRow: (id: string) => void;
};

export const ConversationActionsCell = memo(function ConversationActionsCell({
	id,
	onEditRow,
	onDeleteRow,
}: ConversationActionsCellProps) {
	const deletingId = useConversationDeletingId();
	const isDeleting = deletingId === id;

	return (
		<div className="flex items-center justify-end gap-1">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => onEditRow(id)}
			>
				<HugeiconsIcon
					icon={PencilEdit01Icon}
					className="size-3.5 text-secondary-black"
				/>
				Sửa
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="text-destructive hover:text-destructive"
				disabled={isDeleting}
				onClick={() => onDeleteRow(id)}
			>
				{isDeleting ? (
					<HugeiconsIcon
						icon={Loading02Icon}
						className="size-3.5 text-secondary-red animate-spin"
					/>
				) : (
					<>
						<HugeiconsIcon
							icon={Delete01Icon}
							className="size-3.5 text-secondary-red"
						/>
						Xóa
					</>
				)}
			</Button>
		</div>
	);
});
