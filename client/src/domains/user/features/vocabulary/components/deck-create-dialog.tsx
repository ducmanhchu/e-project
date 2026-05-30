import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { queryClient } from "@shared/lib/query-client";
import { createDeck } from "@shared/api/vocab";
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
import { Textarea } from "@shared/components/ui/textarea";

type VocabDeckCreateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Khi tạo trong thư mục — gửi kèm `folderId` lên API. */
	folderId?: string;
};

/**
 * Dialog tạo học phần mới (có thể gắn thư mục hoặc để ở kho gốc).
 * @param props.open — trạng thái mở dialog
 * @param props.onOpenChange — callback khi đóng/mở
 * @param props.folderId — id thư mục chứa học phần (tùy chọn)
 */
export function VocabDeckCreateDialog({
	open,
	onOpenChange,
	folderId,
}: VocabDeckCreateDialogProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	const createMutation = useMutation({
		mutationFn: () =>
			createDeck({
				name: name.trim(),
				description: description.trim() || undefined,
				...(folderId ? { folderId } : {}),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["deck"] });
			void queryClient.invalidateQueries({ queryKey: ["folder"] });
			toast.success("Đã tạo học phần");
			onOpenChange(false);
		},
		onError: () => {
			toast.error("Không thể tạo học phần");
		},
	});

	const trimmedName = name.trim();
	const canSubmit = trimmedName.length > 0;

	/**
	 * Gửi POST tạo học phần khi tên hợp lệ.
	 */
	const handleSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();
		if (!canSubmit || createMutation.isPending) return;
		createMutation.mutate();
	};

	/**
	 * Reset form khi mở lại dialog.
	 */
	const handleOpenChange = (next: boolean) => {
		if (next) {
			setName("");
			setDescription("");
		}
		onOpenChange(next);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent showCloseButton>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Tạo học phần</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="deck-create-name">Tên</Label>
							<Input
								id="deck-create-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								autoFocus
								disabled={createMutation.isPending}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="deck-create-description">Mô tả</Label>
							<Textarea
								id="deck-create-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
								disabled={createMutation.isPending}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={createMutation.isPending}
						>
							Hủy
						</Button>
						<Button
							type="submit"
							disabled={!canSubmit || createMutation.isPending}
						>
							{createMutation.isPending ? (
								<HugeiconsIcon
									icon={Loading02Icon}
									className="size-4 animate-spin"
								/>
							) : (
								"Tạo"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
