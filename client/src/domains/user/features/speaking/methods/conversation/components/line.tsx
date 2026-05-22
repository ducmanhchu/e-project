import { HugeiconsIcon } from "@hugeicons/react";
import { VolumeHighIcon, PauseIcon } from "@hugeicons/core-free-icons";

import type { ConversationLineProps } from "@shared/types/conversation";
import { useAzureTTS } from "@shared/hooks/use-azure-tts";
import { cn } from "@shared/lib/utils";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { Button } from "@shared/components/ui/button";

type TextSegment =
	| { kind: "plain"; text: string }
	| { kind: "slang"; text: string; meaning: string };

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTextSegments(
	text: string,
	slang: ConversationLineProps["slang"],
): TextSegment[] {
	if (slang.length === 0) {
		return [{ kind: "plain", text }];
	}

	type Match = {
		start: number;
		end: number;
		matched: string;
		meaning: string;
	};
	const matches: Match[] = [];

	for (const item of [...slang].sort((a, b) => b.term.length - a.term.length)) {
		const regex = new RegExp(escapeRegExp(item.term), "gi");
		let match: RegExpExecArray | null;

		while ((match = regex.exec(text)) !== null) {
			const start = match.index;
			const end = start + match[0].length;
			const overlaps = matches.some(
				(existing) => start < existing.end && end > existing.start,
			);

			if (!overlaps) {
				matches.push({
					start,
					end,
					matched: match[0],
					meaning: item.meaning,
				});
			}
		}
	}

	if (matches.length === 0) {
		return [{ kind: "plain", text }];
	}

	matches.sort((a, b) => a.start - b.start);

	const segments: TextSegment[] = [];
	let cursor = 0;

	for (const match of matches) {
		if (match.start > cursor) {
			segments.push({ kind: "plain", text: text.slice(cursor, match.start) });
		}
		segments.push({
			kind: "slang",
			text: match.matched,
			meaning: match.meaning,
		});
		cursor = match.end;
	}

	if (cursor < text.length) {
		segments.push({ kind: "plain", text: text.slice(cursor) });
	}

	return segments;
}

export function ConversationLine({
	speakerKey,
	speakerName,
	text,
	slang,
	hasAttempt,
	isActive,
	onSelect,
}: ConversationLineProps) {
	const isLearner = speakerKey === "B";
	const segments = buildTextSegments(text, slang);
	const { isPlaying, toggle: toggleAudio } = useAzureTTS({
		enabled: !isLearner,
	});

	const isClickable = isLearner && hasAttempt && !!onSelect;

	return (
		<div
			className={cn(
				"flex flex-col gap-1 max-w-[85%] mb-1.5",
				isLearner ? "self-end" : "self-start",
			)}
		>
			<div
				className={cn(
					"flex gap-1 items-center",
					isLearner ? "self-end" : "self-start",
				)}
			>
				<p
					className={cn(
						"text-secondary-black text-sm",
						isLearner ? "text-yellow-700 font-medium order-last mb-1.5" : "",
					)}
				>
					{speakerName}
				</p>
				{!isLearner && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => toggleAudio(text)}
						aria-label={isPlaying ? "Dừng phát âm" : "Phát âm câu thoại"}
					>
						<HugeiconsIcon icon={isPlaying ? PauseIcon : VolumeHighIcon} />
					</Button>
				)}
			</div>
			<div
				className={cn(
					"flex justify-center items-center p-4 border border-neutral-500 rounded-t-4xl transition-all",
					isLearner
						? "bg-neutral-50 border-secondary-black rounded-bl-4xl"
						: "rounded-br-4xl",
					isClickable && "cursor-pointer hover:bg-neutral-100",
					isLearner &&
						isActive &&
						"border-secondary-yellow border-dashed border-2",
				)}
				onClick={isClickable ? onSelect : undefined}
				role={isClickable ? "button" : undefined}
				tabIndex={isClickable ? 0 : undefined}
				onKeyDown={
					isClickable
						? (e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onSelect!();
								}
							}
						: undefined
				}
			>
				<p>
					{segments.map((segment, index) =>
						segment.kind === "plain" ? (
							<span key={index}>{segment.text}</span>
						) : (
							<Tooltip key={index}>
								<TooltipTrigger asChild>
									<span className="cursor-help underline decoration-1 decoration-solid underline-offset-5">
										{segment.text}
									</span>
								</TooltipTrigger>
								<TooltipContent
									className="flex flex-col gap-3 items-start p-4"
									align={isLearner ? "end" : "start"}
								>
									<p className="text-sm font-medium">{segment.text}</p>
									<p className="text-xs font-light">{segment.meaning}</p>
								</TooltipContent>
							</Tooltip>
						),
					)}
				</p>
			</div>
		</div>
	);
}
