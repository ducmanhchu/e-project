import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { queryClient } from "@shared/lib/query-client";
import { createDeck, createFolder } from "@shared/api/vocab";
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
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@shared/components/ui/tabs";

type VocabCreateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type CreateTab = "folder" | "deck";

/**
 * Dialog tạo thư mục hoặc học phần ở kho gốc (tab Thư mục / Học phần).
 * @param props.open — trạng thái mở dialog
 * @param props.onOpenChange — callback khi đóng/mở
 */
export function VocabCreateDialog({
	open,
	onOpenChange,
}: VocabCreateDialogProps) {
	const [tab, setTab] = useState<CreateTab>("folder");
	const [folderName, setFolderName] = useState("");
	const [deckName, setDeckName] = useState("");
	const [deckDescription, setDeckDescription] = useState("");

	const createFolderMutation = useMutation({
		mutationFn: () => createFolder(folderName.trim()),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["folder"] });
			toast.success("Đã tạo thư mục");
			onOpenChange(false);
		},
		onError: () => {
			toast.error("Không thể tạo thư mục");
		},
	});

	const createDeckMutation = useMutation({
		mutationFn: () =>
			createDeck({
				name: deckName.trim(),
				description: deckDescription.trim() || undefined,
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

	const isPending =
		createFolderMutation.isPending || createDeckMutation.isPending;

	const trimmedFolderName = folderName.trim();
	const trimmedDeckName = deckName.trim();
	const canSubmitFolder = trimmedFolderName.length > 0;
	const canSubmitDeck = trimmedDeckName.length > 0;

	/**
	 * Reset toàn bộ form khi mở lại dialog.
	 */
	const resetForm = () => {
		setTab("folder");
		setFolderName("");
		setDeckName("");
		setDeckDescription("");
	};

	/**
	 * Gửi POST theo tab đang chọn.
	 */
	const handleSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();
		if (isPending) return;

		if (tab === "folder") {
			if (!canSubmitFolder) return;
			createFolderMutation.mutate();
			return;
		}

		if (!canSubmitDeck) return;
		createDeckMutation.mutate();
	};

	const handleOpenChange = (next: boolean) => {
		if (next) resetForm();
		onOpenChange(next);
	};

	const canSubmit = tab === "folder" ? canSubmitFolder : canSubmitDeck;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent showCloseButton>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Tạo mới</DialogTitle>
					</DialogHeader>
					<Tabs
						value={tab}
						onValueChange={(value) => setTab(value as CreateTab)}
						className="gap-4 mt-3"
					>
						<TabsList className="w-full mb-2" variant="line">
							<TabsTrigger value="folder" className="flex-1">
								Thư mục
							</TabsTrigger>
							<TabsTrigger value="deck" className="flex-1">
								Học phần
							</TabsTrigger>
						</TabsList>
						<TabsContent value="folder">
							<div className="grid gap-2">
								<Label htmlFor="folder-create-name">Tên</Label>
								<Input
									id="folder-create-name"
									value={folderName}
									onChange={(e) => setFolderName(e.target.value)}
									autoFocus={tab === "folder"}
									disabled={isPending}
								/>
							</div>
						</TabsContent>
						<TabsContent value="deck">
							<div className="grid gap-4">
								<div className="grid gap-2">
									<Label htmlFor="deck-create-name-tab">Tên</Label>
									<Input
										id="deck-create-name-tab"
										value={deckName}
										onChange={(e) => setDeckName(e.target.value)}
										autoFocus={tab === "deck"}
										disabled={isPending}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="deck-create-description-tab">Mô tả</Label>
									<Textarea
										id="deck-create-description-tab"
										value={deckDescription}
										onChange={(e) => setDeckDescription(e.target.value)}
										rows={3}
										disabled={isPending}
									/>
								</div>
							</div>
						</TabsContent>
					</Tabs>
					<DialogFooter className="mt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Hủy
						</Button>
						<Button type="submit" disabled={!canSubmit || isPending}>
							{isPending ? (
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
