import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { queryClient } from "@shared/lib/query-client";
import { renameFolder } from "@shared/api/vocab";
import { Button } from "@shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";

type VocabFolderRenameDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	folderId: string;
	currentName: string;
};

/**
 * Dialog đổi tên thư mục từ vựng.
 * @param props.open — trạng thái mở dialog
 * @param props.onOpenChange — callback khi đóng/mở
 * @param props.folderId — id thư mục cần đổi tên
 * @param props.currentName — tên hiện tại (prefill input)
 */
export function VocabFolderRenameDialog({
	open,
	onOpenChange,
	folderId,
	currentName,
}: VocabFolderRenameDialogProps) {
	const [name, setName] = useState(currentName);

	const renameMutation = useMutation({
		mutationFn: () => renameFolder(folderId, name.trim()),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["folder"] });
			toast.success("Đã đổi tên thư mục");
			onOpenChange(false);
		},
		onError: () => {
			toast.error("Không thể đổi tên thư mục");
		},
	});

	const trimmedName = name.trim();
	const canSubmit =
		trimmedName.length > 0 && trimmedName !== currentName.trim();

	/**
	 * Gửi PATCH đổi tên khi input hợp lệ.
	 */
	const handleSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();
		if (!canSubmit || renameMutation.isPending) return;
		renameMutation.mutate();
	};

	/**
	 * Reset tên khi mở lại dialog để luôn bám `currentName` mới nhất.
	 */
	const handleOpenChange = (next: boolean) => {
		if (next) setName(currentName);
		onOpenChange(next);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent showCloseButton>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Đổi tên</DialogTitle>
					</DialogHeader>
					<div className="grid gap-2 py-4">
						<Label htmlFor="folder-rename">Tên mới</Label>
						<Input
							id="folder-rename"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
							disabled={renameMutation.isPending}
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={renameMutation.isPending}
						>
							Hủy
						</Button>
						<Button
							type="submit"
							disabled={!canSubmit || renameMutation.isPending}
						>
							{renameMutation.isPending ? (
								<HugeiconsIcon
									icon={Loading02Icon}
									className="size-4 animate-spin"
								/>
							) : (
								"Lưu"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
