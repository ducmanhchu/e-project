import { useMutation } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { queryClient } from "@shared/lib/query-client";
import { deleteDeck } from "@shared/api/vocab";
import { Button } from "@shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@shared/components/ui/dialog";

type VocabDeckDeleteDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	deckId: string;
	deckName: string;
};

/**
 * Dialog xác nhận xóa học phần.
 * @param props.open — trạng thái mở dialog
 * @param props.onOpenChange — callback khi đóng/mở
 * @param props.deckId — id học phần cần xóa
 * @param props.deckName — tên hiển thị trong nội dung xác nhận
 */
export function VocabDeckDeleteDialog({
	open,
	onOpenChange,
	deckId,
	deckName,
}: VocabDeckDeleteDialogProps) {
	const deleteMutation = useMutation({
		mutationFn: () => deleteDeck(deckId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["deck"] });
			void queryClient.invalidateQueries({ queryKey: ["folder"] });
			toast.success("Đã xóa học phần");
			onOpenChange(false);
		},
		onError: () => {
			toast.error("Không thể xóa học phần");
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton>
				<DialogHeader>
					<DialogTitle>Xác nhận xóa</DialogTitle>
					<DialogDescription>
						Bạn có chắc muốn xóa học phần{" "}
						<span className="font-medium text-foreground">{deckName}</span>? Tất
						cả thẻ trong học phần sẽ bị xóa.
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
