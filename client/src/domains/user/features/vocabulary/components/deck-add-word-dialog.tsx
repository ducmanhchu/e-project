import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import {
	addFlashcardFromVocab,
	createFlashcard,
	fetchWordList,
} from "@shared/api/vocab";
import { queryClient } from "@shared/lib/query-client";
import { translatePartOfSpeech } from "@shared/lib/utils";
import type { Word } from "@shared/types/vocab";
import { Button } from "@shared/components/ui/button";
import { Checkbox } from "@shared/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Separator } from "@shared/components/ui/separator";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@shared/components/ui/tooltip";
import {
	BULK_FROM_VOCAB_MAX,
	FLASHCARD_TABLE_QUERY_KEY,
	WORD_SEARCH_DEBOUNCE_MS,
	WORD_SEARCH_MIN_CHARS,
	WORD_SEARCH_PAGE_LIMIT,
} from "@user/features/vocabulary/utils/constants";

type VocabDeckAddWordDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	deckId: string;
};

const EMPTY_MANUAL_FORM = {
	word: "",
	ipa: "",
	meaning: "",
	partOfSpeech: "",
	enExample: "",
};

function getWordViDef(word: Word): string | undefined {
	return word.definitions[0]?.viDef?.trim() || undefined;
}

function isWordSelectable(word: Word): boolean {
	return Boolean(getWordViDef(word));
}

/**
 * Dialog thêm từ vào học phần: tìm trong kho hệ thống hoặc nhập thủ công.
 * @param props.open — trạng thái mở dialog
 * @param props.onOpenChange — callback khi đóng/mở
 * @param props.deckId — id học phần đích
 */
export function VocabDeckAddWordDialog({
	open,
	onOpenChange,
	deckId,
}: VocabDeckAddWordDialogProps) {
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
	const [manual, setManual] = useState(EMPTY_MANUAL_FORM);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDebouncedSearch(search);
		}, WORD_SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [search]);

	const trimmedSearch = debouncedSearch.trim();
	const searchEnabled = trimmedSearch.length >= WORD_SEARCH_MIN_CHARS;

	const wordSearchQuery = useQuery({
		queryKey: ["vocabulary", "search", trimmedSearch],
		queryFn: () =>
			fetchWordList({
				search: trimmedSearch,
				page: 1,
				limit: WORD_SEARCH_PAGE_LIMIT,
			}),
		enabled: open && searchEnabled,
	});

	const words = wordSearchQuery.data?.data ?? [];

	const resetForm = useCallback(() => {
		setSearch("");
		setDebouncedSearch("");
		setSelectedIds(new Set());
		setManual(EMPTY_MANUAL_FORM);
	}, []);

	const addMutation = useMutation({
		mutationFn: async () => {
			const trimmedWord = manual.word.trim();
			const trimmedMeaning = manual.meaning.trim();
			const hasManual = trimmedWord.length > 0 && trimmedMeaning.length > 0;
			const ids = [...selectedIds];

			let fromVocabCount = 0;
			let manualCount = 0;

			if (ids.length > 0) {
				const bulkRes = await addFlashcardFromVocab({
					deckId,
					userVocabularyIds: ids,
				});
				fromVocabCount = bulkRes.data?.created ?? 0;
			}

			if (hasManual) {
				await createFlashcard({
					deckId,
					word: trimmedWord,
					meaning: trimmedMeaning,
					...(manual.ipa.trim() && { ipa: manual.ipa.trim() }),
					...(manual.partOfSpeech.trim() && {
						partOfSpeech: manual.partOfSpeech.trim(),
					}),
					...(manual.enExample.trim() && {
						enExample: manual.enExample.trim(),
					}),
				});
				manualCount = 1;
			}

			return { fromVocabCount, manualCount };
		},
		onSuccess: ({ fromVocabCount, manualCount }) => {
			const total = fromVocabCount + manualCount;
			if (total > 0) {
				toast.success(total === 1 ? "Đã thêm 1 từ" : `Đã thêm ${total} từ`);
			}

			void queryClient.invalidateQueries({
				queryKey: ["flashcards", "list", deckId],
			});
			void queryClient.invalidateQueries({
				queryKey: ["flashcards", FLASHCARD_TABLE_QUERY_KEY, deckId],
			});
			void queryClient.invalidateQueries({
				queryKey: ["deck", "detail", deckId],
			});

			resetForm();
			onOpenChange(false);
		},
		onError: () => {
			toast.error("Không thể thêm từ");
		},
	});

	const hasManualInput =
		manual.word.trim().length > 0 && manual.meaning.trim().length > 0;
	const canSubmit =
		(selectedIds.size > 0 || hasManualInput) && !addMutation.isPending;

	const handleToggleWord = useCallback((word: Word, checked: boolean) => {
		if (!isWordSelectable(word)) return;

		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (checked) {
				if (next.size >= BULK_FROM_VOCAB_MAX) {
					toast.warning(`Chỉ thêm tối đa ${BULK_FROM_VOCAB_MAX} từ mỗi lần`);
					return prev;
				}
				next.add(word._id);
			} else {
				next.delete(word._id);
			}
			return next;
		});
	}, []);

	const handleClearSelection = useCallback(() => {
		setSelectedIds(new Set());
	}, []);

	const handleManualChange =
		(field: keyof typeof EMPTY_MANUAL_FORM) =>
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setManual((prev) => ({ ...prev, [field]: e.target.value }));
		};

	const handleSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();
		if (!canSubmit) return;
		addMutation.mutate();
	};

	const handleOpenChange = (next: boolean) => {
		if (next) {
			resetForm();
		}
		onOpenChange(next);
	};

	const selectionLabel = useMemo(
		() => `Đã chọn ${selectedIds.size}/${BULK_FROM_VOCAB_MAX}`,
		[selectedIds.size],
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-3xl max-h-[90vh]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Thêm từ</DialogTitle>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-3">
							<p className="text-sm font-medium">Từ vựng hệ thống</p>
							<Input
								placeholder="Tìm kiếm từ..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								disabled={addMutation.isPending}
								autoFocus
							/>

							{selectedIds.size > 0 ? (
								<div className="flex items-center justify-between gap-2">
									<p className="text-muted-foreground text-xs">
										{selectionLabel}
									</p>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-auto px-2 py-1 text-xs"
										onClick={handleClearSelection}
										disabled={addMutation.isPending}
									>
										Bỏ chọn tất cả
									</Button>
								</div>
							) : null}

							<div className="max-h-48 overflow-y-auto rounded-md border">
								{!searchEnabled ? (
									<p className="text-muted-foreground p-3 text-sm">
										Nhập ít nhất {WORD_SEARCH_MIN_CHARS} ký tự
									</p>
								) : wordSearchQuery.isLoading ? (
									<div className="space-y-2 p-3">
										<Skeleton className="h-10 w-full" />
										<Skeleton className="h-10 w-full" />
										<Skeleton className="h-10 w-full" />
									</div>
								) : words.length === 0 ? (
									<p className="text-muted-foreground p-3 text-sm">
										Không tìm thấy
									</p>
								) : (
									<ul className="divide-y">
										{words.map((word) => {
											const viDef = getWordViDef(word);
											const selectable = isWordSelectable(word);
											const checked = selectedIds.has(word._id);
											const atLimit =
												!checked && selectedIds.size >= BULK_FROM_VOCAB_MAX;

											const row = (
												<li
													key={word._id}
													className="flex items-start gap-3 p-3"
												>
													<Checkbox
														id={`word-select-${word._id}`}
														checked={checked}
														disabled={
															addMutation.isPending || !selectable || atLimit
														}
														onCheckedChange={(value) =>
															handleToggleWord(word, value === true)
														}
													/>
													<Label
														htmlFor={`word-select-${word._id}`}
														className={
															selectable && !atLimit
																? "cursor-pointer font-normal leading-snug"
																: "cursor-not-allowed font-normal leading-snug opacity-60"
														}
													>
														<span className="font-medium me-2">
															{word.word}
														</span>
														{word.ipa ? (
															<span className="text-muted-foreground me-2 text-xs">
																/{word.ipa}/
															</span>
														) : null}
														{word.partOfSpeech ? (
															<span className="text-muted-foreground me-2 text-xs">
																· {translatePartOfSpeech(word.partOfSpeech)}
															</span>
														) : null}
														{viDef ? (
															<span className="text-muted-foreground block text-xs">
																· {viDef}
															</span>
														) : (
															<span className="text-destructive block text-xs">
																""
															</span>
														)}
													</Label>
												</li>
											);

											if (!selectable) {
												return (
													<Tooltip key={word._id}>
														<TooltipTrigger asChild>{row}</TooltipTrigger>
														<TooltipContent>
															<p>Thiếu nghĩa tiếng Việt</p>
														</TooltipContent>
													</Tooltip>
												);
											}

											return row;
										})}
									</ul>
								)}
							</div>
						</div>

						<Separator />

						<div className="grid gap-3">
							<p className="text-sm font-medium">Thêm thủ công</p>
							<div className="grid gap-2 sm:grid-cols-2">
								<div className="grid gap-2">
									<Label htmlFor="add-word-manual-word">
										Từ <span className="text-destructive">*</span>
									</Label>
									<Input
										id="add-word-manual-word"
										value={manual.word}
										onChange={handleManualChange("word")}
										disabled={addMutation.isPending}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="add-word-manual-ipa">IPA</Label>
									<Input
										id="add-word-manual-ipa"
										value={manual.ipa}
										onChange={handleManualChange("ipa")}
										disabled={addMutation.isPending}
									/>
								</div>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="add-word-manual-meaning">
									Nghĩa <span className="text-destructive">*</span>
								</Label>
								<Input
									id="add-word-manual-meaning"
									value={manual.meaning}
									onChange={handleManualChange("meaning")}
									disabled={addMutation.isPending}
								/>
							</div>
							<div className="grid gap-2 sm:grid-cols-2">
								<div className="grid gap-2">
									<Label htmlFor="add-word-manual-pos">Loại từ</Label>
									<Input
										id="add-word-manual-pos"
										value={manual.partOfSpeech}
										onChange={handleManualChange("partOfSpeech")}
										disabled={addMutation.isPending}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="add-word-manual-example">Ví dụ</Label>
									<Input
										id="add-word-manual-example"
										value={manual.enExample}
										onChange={handleManualChange("enExample")}
										disabled={addMutation.isPending}
									/>
								</div>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={addMutation.isPending}
						>
							Hủy
						</Button>
						<Button type="submit" disabled={!canSubmit}>
							{addMutation.isPending ? (
								<HugeiconsIcon
									icon={Loading02Icon}
									className="size-4 animate-spin"
								/>
							) : (
								"Thêm"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
