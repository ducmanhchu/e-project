import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@shared/components/ui/dialog";

type SAWBulkDeleteDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedCount: number;
	isPending: boolean;
	onConfirm: () => void;
};

export const SAWBulkDeleteDialog = memo(function SAWBulkDeleteDialog({
	open,
	onOpenChange,
	selectedCount,
	isPending,
	onConfirm,
}: SAWBulkDeleteDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton>
				<DialogHeader>
					<DialogTitle>Xác nhận</DialogTitle>
					<DialogDescription>
						Bạn có chắc muốn xóa{" "}
						<span className="font-medium text-foreground">
							{selectedCount} mục
						</span>{" "}
						đã chọn?
					</DialogDescription>
				</DialogHeader>
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
						variant="destructive"
						disabled={isPending}
						onClick={onConfirm}
					>
						{isPending ? (
							<HugeiconsIcon
								icon={Loading02Icon}
								className="size-4 animate-spin"
							/>
						) : (
							"Xóa"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
});
