import React, { lazy, Suspense, useRef, useState } from "react";
import { Link } from "react-router";

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuTrigger,
	ContextMenuItem,
} from "@shared/components/ui/context-menu";

const VocabFolderRenameDialog = lazy(() =>
	import("@user/features/vocabulary/components/folder-rename-dialog").then(
		(m) => ({ default: m.VocabFolderRenameDialog }),
	),
);

const VocabFolderDeleteDialog = lazy(() =>
	import("@user/features/vocabulary/components/folder-delete-dialog").then(
		(m) => ({ default: m.VocabFolderDeleteDialog }),
	),
);

type FolderProps = {
	folderId: string;
	to: string;
	color?: string;
	size?: number;
	items?: React.ReactNode[];
	className?: string;
	folderName?: string;
	cardNumber?: number;
};

const darkenColor = (hex: string, percent: number): string => {
	let color = hex.startsWith("#") ? hex.slice(1) : hex;
	if (color.length === 3) {
		color = color
			.split("")
			.map((c) => c + c)
			.join("");
	}
	const num = parseInt(color, 16);
	let r = (num >> 16) & 0xff;
	let g = (num >> 8) & 0xff;
	let b = num & 0xff;
	r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
	g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
	b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
	return (
		"#" +
		((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
	);
};

/**
 * Thẻ thư mục từ vựng: điều hướng bằng Link, menu chuột phải đổi tên/xóa.
 * @param props.folderId — id thư mục (API đổi tên/xóa)
 * @param props.to — đường dẫn React Router khi click thư mục
 */
export const VocabFolder: React.FC<FolderProps> = ({
	folderId,
	to,
	color = "#ffcb3e",
	items = [],
	className = "",
	folderName = "Untitled folder",
	cardNumber = 0,
}) => {
	const maxItems = Math.min(cardNumber, 3);
	const papers = items.slice(0, maxItems);
	while (papers.length < maxItems) {
		papers.push(null);
	}

	const [open, setOpen] = useState(false);
	const [renameOpen, setRenameOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [paperOffsets, setPaperOffsets] = useState<{ x: number; y: number }[]>(
		Array.from({ length: maxItems }, () => ({ x: 0, y: 0 })),
	);
	// Chặn click "xuyên" tới Link sau khi chọn mục context menu
	const blockNavRef = useRef(false);

	const folderBackColor = darkenColor(color, 0.08);
	const paper1 = darkenColor("#ffffff", 0.1);
	const paper2 = darkenColor("#ffffff", 0.05);
	const paper3 = "#ffffff";

	const handlePaperMouseMove = (
		e: React.MouseEvent<HTMLDivElement, MouseEvent>,
		index: number,
	) => {
		if (!open) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const offsetX = (e.clientX - centerX) * 0.15;
		const offsetY = (e.clientY - centerY) * 0.15;
		setPaperOffsets((prev) => {
			const newOffsets = [...prev];
			newOffsets[index] = { x: offsetX, y: offsetY };
			return newOffsets;
		});
	};

	const handlePaperMouseLeave = (
		_e: React.MouseEvent<HTMLDivElement, MouseEvent>,
		index: number,
	) => {
		setPaperOffsets((prev) => {
			const newOffsets = [...prev];
			newOffsets[index] = { x: 0, y: 0 };
			return newOffsets;
		});
	};

	const folderStyle: React.CSSProperties = {
		"--folder-color": color,
		"--folder-back-color": folderBackColor,
		"--paper-1": paper1,
		"--paper-2": paper2,
		"--paper-3": paper3,
	} as React.CSSProperties;

	/**
	 * Đánh dấu chặn điều hướng Link rồi mở dialog tương ứng.
	 */
	const openDialogFromMenu = (openDialog: () => void) => {
		blockNavRef.current = true;
		openDialog();
	};

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<Link
						to={to}
						className={className}
						onClick={(e) => {
							if (blockNavRef.current) {
								e.preventDefault();
								blockNavRef.current = false;
							}
						}}
					>
						<div
							className={`group relative transition-all duration-200 ease-in cursor-pointer ${
								!open ? "hover:-translate-y-2" : ""
							}`}
							style={{
								...folderStyle,
								transform: open ? "translateY(-8px)" : undefined,
							}}
						>
							<div
								className="relative w-[160px] h-[125px] lg:w-[180px] lg:h-[150px] rounded-tl-0 rounded-tr-[20px] rounded-br-[20px] rounded-bl-[20px]"
								style={{ backgroundColor: folderBackColor }}
							>
								<span
									className="absolute z-0 bottom-[98%] left-0 w-[30px] h-[10px] rounded-tl-[10px] rounded-tr-[10px] rounded-bl-0 rounded-br-0"
									style={{ backgroundColor: folderBackColor }}
								></span>
								{papers.map((item, i) => {
									let sizeClasses = "";
									if (i === 0)
										sizeClasses = open ? "w-[70%] h-[80%]" : "w-[70%] h-[80%]";
									if (i === 1)
										sizeClasses = open ? "w-[80%] h-[80%]" : "w-[80%] h-[70%]";
									if (i === 2)
										sizeClasses = open ? "w-[90%] h-[80%]" : "w-[90%] h-[60%]";

									return (
										<div
											key={i}
											onMouseMove={(e) => handlePaperMouseMove(e, i)}
											onMouseLeave={(e) => handlePaperMouseLeave(e, i)}
											className={`absolute z-20 bottom-[10%] left-1/2 transition-all duration-300 ease-in-out ${
												!open
													? "transform -translate-x-1/2 translate-y-[10%] group-hover:translate-y-0"
													: "hover:scale-110"
											} ${sizeClasses}`}
											style={{
												backgroundColor:
													i === 0 ? paper1 : i === 1 ? paper2 : paper3,
												borderRadius: "10px",
											}}
										>
											{item}
										</div>
									);
								})}
								<div
									className={`absolute z-30 w-full h-full origin-bottom transition-all duration-300 ease-in-out ${
										!open
											? "group-hover:transform-[skew(7deg)_scaleY(0.6)]"
											: ""
									}`}
									style={{
										backgroundColor: color,
										borderRadius: "10px 20px 20px 20px",
										...(open && { transform: "skew(7deg) scaleY(0.6)" }),
									}}
								></div>
								<div
									className={`absolute z-30 w-full h-full origin-bottom transition-all duration-300 ease-in-out ${
										!open
											? "group-hover:transform-[skew(-7deg)_scaleY(0.6)]"
											: ""
									}`}
									style={{
										backgroundColor: color,
										borderRadius: "10px 20px 20px 20px",
										...(open && { transform: "skew(-7deg) scaleY(0.6)" }),
									}}
								>
									<div className="group-hover:transform-[skew(7deg)] transition-all duration-300 ease-in-out absolute bottom-3 left-3 flex flex-col gap-0.5 items-start">
										<p className="text-sm font-medium line-clamp-3 pe-2">
											{folderName}
										</p>
										<p className="text-xs text-muted-foreground">
											Học phần: {cardNumber}
										</p>
									</div>
								</div>
							</div>
						</div>
					</Link>
				</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuItem
						onSelect={() => openDialogFromMenu(() => setRenameOpen(true))}
					>
						Đổi tên
					</ContextMenuItem>
					<ContextMenuItem
						variant="destructive"
						onSelect={() => openDialogFromMenu(() => setDeleteOpen(true))}
					>
						Xóa
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			{(renameOpen || deleteOpen) && (
				<Suspense fallback={null}>
					{renameOpen && (
						<VocabFolderRenameDialog
							open={renameOpen}
							onOpenChange={setRenameOpen}
							folderId={folderId}
							currentName={folderName}
						/>
					)}
					{deleteOpen && (
						<VocabFolderDeleteDialog
							open={deleteOpen}
							onOpenChange={setDeleteOpen}
							folderId={folderId}
							folderName={folderName}
						/>
					)}
				</Suspense>
			)}
		</>
	);
};
