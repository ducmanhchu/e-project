import type { WordAssessment } from "@shared/types/conversation";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@shared/lib/utils";

function getWordColor(errorType: WordAssessment["ErrorType"]) {
	switch (errorType) {
		case "Mispronunciation":
			return "bg-yellow-200 text-yellow-900";
		case "Omission":
			return "bg-neutral-300 text-neutral-700 line-through";
		case "Insertion":
			return "bg-red-200 text-red-800";
		default:
			return "";
	}
}

function getScoreColor(score: number) {
	if (score >= 80) return "text-green-700";
	if (score >= 60) return "text-yellow-700";
	return "text-red-700";
}

function MissingBreakMarker() {
	return (
		<span
			className="inline-flex items-center justify-center px-1 py-0.5 rounded-sm bg-neutral-300 text-neutral-600 text-xs font-mono leading-none"
			aria-hidden
		>
			[ ]
		</span>
	);
}

function UnexpectedBreakMarker() {
	return (
		<span
			className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-pink-200 mx-0.5 shrink-0"
			aria-hidden
		>
			<svg
				viewBox="0 0 8 12"
				className="w-2 h-3 text-pink-700"
				fill="currentColor"
			>
				<rect x="3.25" y="0" width="1.5" height="12" rx="0.5" />
				<rect x="0" y="2" width="8" height="1.25" rx="0.25" />
				<rect x="0" y="8.75" width="8" height="1.25" rx="0.25" />
			</svg>
		</span>
	);
}

type AssessedTextProps = {
	words: WordAssessment[];
};

export function AssessedText({ words }: AssessedTextProps) {
	return (
		<div className="flex flex-wrap gap-x-1 gap-y-2 leading-relaxed items-center">
			{words.map((word, idx) => {
				const isMissingBreak = word.ErrorType === "MissingBreak";
				const isUnexpectedBreak = word.ErrorType === "UnexpectedBreak";
				const wordHighlightType = isMissingBreak || isUnexpectedBreak
					? "None"
					: word.ErrorType;

				const hasPhonemes =
					word.Phonemes &&
					word.Phonemes.length > 0 &&
					word.ErrorType !== "Omission";

				const wordEl = (
					<span
						className={cn(
							"px-1 py-0.5 rounded text-sm transition-colors",
							getWordColor(wordHighlightType),
							hasPhonemes && "cursor-help",
						)}
					>
						{word.Word}
					</span>
				);

				const wordWithTooltip =
					!hasPhonemes ? (
						wordEl
					) : (
						<Tooltip>
							<TooltipTrigger asChild>{wordEl}</TooltipTrigger>
							<TooltipContent className="p-3" align="center">
								<div className="flex flex-col gap-1">
									<div className="flex items-center gap-1 text-xs font-medium">
										<span>{word.Word}</span>
										<span className="text-muted-foreground">:</span>
										<span className={getScoreColor(word.AccuracyScore)}>
											{Math.round(word.AccuracyScore)}
										</span>
									</div>
									<div className="flex gap-2">
										{word.Phonemes!.map((p, pi) => (
											<div
												key={pi}
												className="flex flex-col items-center gap-0.5"
											>
												<span className="text-xs text-muted-foreground">
													{p.Phoneme}
												</span>
												<span
													className={cn(
														"text-xs font-medium",
														getScoreColor(p.AccuracyScore),
													)}
												>
													{Math.round(p.AccuracyScore)}
												</span>
											</div>
										))}
									</div>
								</div>
							</TooltipContent>
						</Tooltip>
					);

				return (
					<span key={idx} className="inline-flex items-center gap-0.5">
						{isMissingBreak && <MissingBreakMarker />}
						{isUnexpectedBreak && <UnexpectedBreakMarker />}
						{wordWithTooltip}
					</span>
				);
			})}
		</div>
	);
}
