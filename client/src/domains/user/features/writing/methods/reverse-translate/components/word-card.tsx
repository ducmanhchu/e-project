import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	VolumeHighIcon,
	PauseIcon,
	Bookmark02Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { addFlashcardFromVocab, fetchDeckList } from "@shared/api/vocab";
import type { Word } from "@shared/types/vocab";
import { useAzureTTS } from "@shared/hooks/use-azure-tts";
import { queryClient } from "@shared/lib/query-client";
import { FLASHCARD_TABLE_QUERY_KEY } from "@user/features/vocabulary/utils/constants";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from "@shared/components/ui/dropdown-menu";

const DECK_LIST_LIMIT = 100;

/**
 * Thẻ từ vựng trong bài reverse-translate: phát âm và lưu vào học phần.
 * @param props.word — dữ liệu từ vựng hiển thị
 */
export function WordCard({ word }: { word: Word }) {
	const [saveMenuOpen, setSaveMenuOpen] = useState(false);
	const { isPlaying, toggle: toggleAudio } = useAzureTTS({ enabled: false });

	const decksQuery = useQuery({
		queryKey: ["deck", "list", "word-save"],
		queryFn: () => fetchDeckList({ page: 1, limit: DECK_LIST_LIMIT }),
		enabled: saveMenuOpen,
		select: (res) => res.data ?? [],
	});

	const saveMutation = useMutation({
		mutationFn: (deckId: string) =>
			addFlashcardFromVocab({
				deckId,
				userVocabularyIds: [word._id],
			}),
		onSuccess: (_, deckId) => {
			toast.success(`Đã lưu "${word.word}" vào học phần`);
			void queryClient.invalidateQueries({
				queryKey: ["flashcards", "list", deckId],
			});
			void queryClient.invalidateQueries({
				queryKey: ["flashcards", FLASHCARD_TABLE_QUERY_KEY, deckId],
			});
			void queryClient.invalidateQueries({
				queryKey: ["deck", "detail", deckId],
			});
			setSaveMenuOpen(false);
		},
		onError: () => {
			toast.error("Không thể lưu từ");
		},
	});

	const decks = decksQuery.data ?? [];

	const handleSaveToDeck = (deckId: string) => {
		if (saveMutation.isPending) return;
		saveMutation.mutate(deckId);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex justify-between">
					<div className="flex gap-2 items-center">
						{word.word && <p>{word.word}</p>}
						{word.partOfSpeech && (
							<Badge className="bg-neutral-100 text-neutral-800">
								{word.partOfSpeech}
							</Badge>
						)}
						{word.definitions[0]?.definitionCefrLevel && (
							<Badge className="bg-green-100 text-green-700">
								{word.definitions[0].definitionCefrLevel}
							</Badge>
						)}
					</div>
					<div className="flex">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => toggleAudio(word.word)}
							aria-label={isPlaying ? "Dừng phát âm" : "Phát âm từ"}
						>
							<HugeiconsIcon icon={isPlaying ? PauseIcon : VolumeHighIcon} />
						</Button>
						<DropdownMenu open={saveMenuOpen} onOpenChange={setSaveMenuOpen}>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									aria-label="Lưu từ vào học phần"
								>
									<HugeiconsIcon icon={Bookmark02Icon} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								<DropdownMenuSub>
									<DropdownMenuSubTrigger disabled={saveMutation.isPending}>
										Lưu
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent sideOffset={10}>
										{decksQuery.isLoading ? (
											<DropdownMenuItem disabled>Đang tải...</DropdownMenuItem>
										) : decksQuery.isError ? (
											<DropdownMenuItem disabled>
												Không tải được học phần
											</DropdownMenuItem>
										) : decks.length === 0 ? (
											<DropdownMenuItem disabled>
												Chưa có học phần
											</DropdownMenuItem>
										) : (
											decks.map((deck) => (
												<DropdownMenuItem
													key={deck._id}
													disabled={saveMutation.isPending}
													onSelect={() => handleSaveToDeck(deck._id)}
												>
													{deck.name}
												</DropdownMenuItem>
											))
										)}
									</DropdownMenuSubContent>
								</DropdownMenuSub>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</CardTitle>
				<CardDescription>{word.ipa || "-"}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{word.definitions[0]?.viDef && (
					<p>
						<span className="text-sm text-muted-foreground me-2">
							Nghĩa tiếng Việt:{" "}
						</span>
						<span>{word.definitions[0].viDef}</span>
					</p>
				)}
				{word.definitions[0]?.engDef && (
					<p>
						<span className="text-sm text-muted-foreground me-2">
							Nghĩa tiếng Anh:{" "}
						</span>
						<span>{word.definitions[0].engDef}</span>
					</p>
				)}
				{word.definitions[0]?.example?.engEx && (
					<p>
						<span className="text-sm text-muted-foreground me-2">Ví dụ: </span>
						<span>{word.definitions[0].example.engEx}</span>
					</p>
				)}
			</CardContent>
		</Card>
	);
}
