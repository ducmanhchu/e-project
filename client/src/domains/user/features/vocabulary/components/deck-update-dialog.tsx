import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { queryClient } from "@shared/lib/query-client";
import { updateDeck } from "@shared/api/vocab";
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

type VocabDeckUpdateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	deckId: string;
	currentName: string;
	currentDescription?: string | null;
};

/**
 * Dialog cập nhật tên và mô tả học phần.
 * @param props.open — trạng thái mở dialog
 * @param props.onOpenChange — callback khi đóng/mở
 * @param props.deckId — id học phần cần cập nhật
 * @param props.currentName — tên hiện tại
 * @param props.currentDescription — mô tả hiện tại
 */
export function VocabDeckUpdateDialog({
	open,
	onOpenChange,
	deckId,
	currentName,
	currentDescription = "",
}: VocabDeckUpdateDialogProps) {
	const [name, setName] = useState(currentName);
	const [description, setDescription] = useState(currentDescription ?? "");

	const updateMutation = useMutation({
		mutationFn: () =>
			updateDeck(deckId, {
				name: name.trim(),
				description: description.trim() || undefined,
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["deck"] });
			toast.success("Đã cập nhật học phần");
			onOpenChange(false);
		},
		onError: () => {
			toast.error("Không thể cập nhật học phần");
		},
	});

	const trimmedName = name.trim();
	const trimmedDescription = description.trim();
	const initialDescription = (currentDescription ?? "").trim();
	const canSubmit =
		trimmedName.length > 0 &&
		(trimmedName !== currentName.trim() ||
			trimmedDescription !== initialDescription);

	/**
	 * Gửi PATCH cập nhật khi có thay đổi hợp lệ.
	 */
	const handleSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();
		if (!canSubmit || updateMutation.isPending) return;
		updateMutation.mutate();
	};

	/**
	 * Reset form khi mở lại dialog.
	 */
	const handleOpenChange = (next: boolean) => {
		if (next) {
			setName(currentName);
			setDescription(currentDescription ?? "");
		}
		onOpenChange(next);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent showCloseButton>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Cập nhật</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="deck-update-name">Tên mới</Label>
							<Input
								id="deck-update-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								autoFocus
								disabled={updateMutation.isPending}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="deck-update-description">Mô tả mới</Label>
							<Textarea
								id="deck-update-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
								disabled={updateMutation.isPending}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={updateMutation.isPending}
						>
							Hủy
						</Button>
						<Button
							type="submit"
							disabled={!canSubmit || updateMutation.isPending}
						>
							{updateMutation.isPending ? (
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
