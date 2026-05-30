import { useMutation } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { queryClient } from "@shared/lib/query-client";
import { deleteFolder } from "@shared/api/vocab";
import { Button } from "@shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@shared/components/ui/dialog";

type VocabFolderDeleteDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	folderId: string;
	folderName: string;
};

/**
 * Dialog xác nhận xóa thư mục từ vựng.
 * @param props.open — trạng thái mở dialog
 * @param props.onOpenChange — callback khi đóng/mở
 * @param props.folderId — id thư mục cần xóa
 * @param props.folderName — tên hiển thị trong nội dung xác nhận
 */
export function VocabFolderDeleteDialog({
	open,
	onOpenChange,
	folderId,
	folderName,
}: VocabFolderDeleteDialogProps) {
	const deleteMutation = useMutation({
		mutationFn: () => deleteFolder(folderId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["folder"] });
			toast.success("Đã xóa thư mục");
			onOpenChange(false);
		},
		onError: () => {
			toast.error("Không thể xóa thư mục");
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton>
				<DialogHeader>
					<DialogTitle>Xác nhận xóa</DialogTitle>
					<DialogDescription>
						Bạn có chắc muốn xóa thư mục{" "}
						<span className="font-medium text-foreground">{folderName}</span>?
						Tất cả học phần trong thư mục sẽ bị xóa.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={deleteMutation.isPending}
					>
						Hủy
					</Button>
					<Button
						type="button"
						variant="destructive"
						disabled={deleteMutation.isPending}
						onClick={() => deleteMutation.mutate()}
					>
						{deleteMutation.isPending ? (
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
}
