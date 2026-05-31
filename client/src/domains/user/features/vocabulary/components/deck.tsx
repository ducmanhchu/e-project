import { lazy, Suspense, useState, useRef } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cards02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import type { Deck } from "@shared/types/vocab";
import { fetchFolderList, moveDeckToFolder } from "@shared/api/vocab";
import { queryClient } from "@shared/lib/query-client";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@shared/components/ui/context-menu";

const VocabDeckUpdateDialog = lazy(() =>
	import("@user/features/vocabulary/components/deck-update-dialog").then(
		(m) => ({ default: m.VocabDeckUpdateDialog }),
	),
);

const VocabDeckDeleteDialog = lazy(() =>
	import("@user/features/vocabulary/components/deck-delete-dialog").then(
		(m) => ({ default: m.VocabDeckDeleteDialog }),
	),
);

/** Giới hạn thư mục tải cho submenu chuyển học phần. */
const MOVE_FOLDER_LIMIT = 100;

type VocabDeckProps = {
	deck: Deck;
	to: string;
};

/**
 * Thẻ học phần: menu chuột phải chuyển thư mục, cập nhật, xóa.
 * @param props.deck — dữ liệu học phần hiển thị
 */
export function VocabDeck({ deck, to }: VocabDeckProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [updateOpen, setUpdateOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const blockNavRef = useRef(false);

	const foldersQuery = useQuery({
		queryKey: ["folder", "list", "deck-move"],
		queryFn: () => fetchFolderList({ page: 1, limit: MOVE_FOLDER_LIMIT }),
		enabled: menuOpen,
		select: (res) => res.data,
	});

	const moveMutation = useMutation({
		mutationFn: (folderId: string | null) =>
			moveDeckToFolder(deck._id, folderId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["deck"] });
			void queryClient.invalidateQueries({ queryKey: ["folder"] });
			toast.success("Đã chuyển học phần");
		},
		onError: () => {
			toast.error("Không thể chuyển học phần");
		},
	});

	const folders =
		foldersQuery.data?.filter((folder) => folder._id !== deck.folderId) ?? [];

	/**
	 * Mở dialog từ context menu.
	 */
	const openDialogFromMenu = (openDialog: () => void) => {
		blockNavRef.current = true;
		openDialog();
	};

	/**
	 * Chuyển học phần sang thư mục đích.
	 */
	const handleMoveToFolder = (folderId: string | null) => {
		if (moveMutation.isPending) return;
		moveMutation.mutate(folderId);
	};

	return (
		<>
			<ContextMenu onOpenChange={setMenuOpen}>
				<ContextMenuTrigger asChild>
					<Link
						to={to}
						onClick={(e) => {
							if (blockNavRef.current) {
								e.preventDefault();
								blockNavRef.current = false;
							}
						}}
					>
						<div className="relative w-[160px] h-[125px] lg:w-[170px] lg:h-[150px] group cursor-pointer">
							<div
								aria-hidden
								className="absolute bottom-0 left-1/2 -translate-x-1/2 z-1 border h-full w-[144px] lg:w-[154px] rounded-2xl bg-neutral-100 group-hover:scale-y-75 transition-transform duration-500 ease-in-out"
							/>
							<div
								aria-hidden
								className="absolute bottom-0 left-1/2 -translate-x-1/2 z-2 border w-[152px] h-[120px] lg:h-[145px] lg:w-[162px] rounded-2xl bg-neutral-100 group-hover:scale-y-85 transition-transform duration-400 ease-in-out"
							/>

							<div className="absolute bottom-0 z-10 w-[160px] h-[115px] lg:w-[170px] lg:h-[140px] p-3 rounded-2xl bg-neutral-50 border flex flex-col justify-between group-hover:-translate-y-2 transition-transform duration-300 ease-in-out">
								<div className="flex gap-1">
									<HugeiconsIcon
										icon={Cards02Icon}
										className="size-3.5 text-muted-foreground"
									/>
									<p className="text-xs text-muted-foreground">
										{deck.cardCount} từ
									</p>
								</div>
								<div className="flex flex-col">
									<p className="text-sm line-clamp-2">{deck.name}</p>
									<p className="text-xs text-muted-foreground line-clamp-1">
										{deck.description}
									</p>
								</div>
							</div>
						</div>
					</Link>
				</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuSub>
						<ContextMenuSubTrigger>Chuyển tới</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							<ContextMenuItem onSelect={() => handleMoveToFolder(null)}>
								Kho từ vựng
							</ContextMenuItem>
							{foldersQuery.isLoading && (
								<ContextMenuItem disabled>Đang tải...</ContextMenuItem>
							)}
							{foldersQuery.isError && (
								<ContextMenuItem disabled>
									Không tải được thư mục khác
								</ContextMenuItem>
							)}
							{!foldersQuery.isLoading &&
								!foldersQuery.isError &&
								folders.length === 0 && (
									<ContextMenuItem disabled>
										{deck.folderId
											? "Không còn thư mục khác"
											: "Chưa có thư mục"}
									</ContextMenuItem>
								)}
							{folders.map((folder) => (
								<ContextMenuItem
									key={folder._id}
									disabled={moveMutation.isPending}
									onSelect={() => handleMoveToFolder(folder._id)}
								>
									{folder.name}
								</ContextMenuItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>
					<ContextMenuItem
						onSelect={() => openDialogFromMenu(() => setUpdateOpen(true))}
					>
						Cập nhật
					</ContextMenuItem>
					<ContextMenuItem
						variant="destructive"
						onSelect={() => openDialogFromMenu(() => setDeleteOpen(true))}
					>
						Xóa
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			{(updateOpen || deleteOpen) && (
				<Suspense fallback={null}>
					{updateOpen && (
						<VocabDeckUpdateDialog
							open={updateOpen}
							onOpenChange={setUpdateOpen}
							deckId={deck._id}
							currentName={deck.name}
							currentDescription={deck.description}
						/>
					)}
					{deleteOpen && (
						<VocabDeckDeleteDialog
							open={deleteOpen}
							onOpenChange={setDeleteOpen}
							deckId={deck._id}
							deckName={deck.name}
						/>
					)}
				</Suspense>
			)}
		</>
	);
}
