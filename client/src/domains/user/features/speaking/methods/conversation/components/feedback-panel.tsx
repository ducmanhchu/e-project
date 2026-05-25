import { useMemo } from "react";

import type { PronunciationResultPayload } from "@shared/types/conversation";
import { cn } from "@shared/lib/utils";
import { ShimmerText } from "@user/components/shimmer-text";

import { AssessedText } from "./assessed-text";

function getScoreColor(score: number) {
	if (score >= 80) return "text-green-700";
	if (score >= 60) return "text-yellow-700";
	return "text-red-700";
}

function getBarColor(score: number) {
	if (score >= 80) return "bg-green-600";
	if (score >= 60) return "bg-yellow-500";
	return "bg-red-500";
}

function getGaugeStroke(score: number) {
	if (score >= 80) return "stroke-green-600";
	if (score >= 60) return "stroke-yellow-500";
	return "stroke-red-500";
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
	const radius = 36;
	const circumference = 2 * Math.PI * radius;
	const progress = (score / 100) * circumference;

	return (
		<div className="flex flex-col items-center gap-1">
			<svg width={88} height={88} viewBox="0 0 88 88" className="-rotate-90">
				<circle
					cx={44}
					cy={44}
					r={radius}
					fill="none"
					stroke="currentColor"
					className="text-neutral-200"
					strokeWidth={6}
				/>
				<circle
					cx={44}
					cy={44}
					r={radius}
					fill="none"
					className={getGaugeStroke(score)}
					strokeWidth={6}
					strokeDasharray={circumference}
					strokeDashoffset={circumference - progress}
					strokeLinecap="round"
				/>
			</svg>
			<span
				className={cn(
					"text-2xl font-bold -mt-[62px] mb-[26px]",
					getScoreColor(score),
				)}
				style={{ transform: "rotate(0deg)" }}
			>
				{Math.round(score)}
			</span>
			<span className="text-xs text-muted-foreground">{label}</span>
		</div>
	);
}

function ScoreBar({ score, label }: { score: number; label: string }) {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex justify-between items-center">
				<span className="text-xs text-muted-foreground">{label}</span>
				<span className={cn("text-xs font-medium", getScoreColor(score))}>
					{Math.round(score)} / 100
				</span>
			</div>
			<div className="h-2 w-full rounded-full bg-neutral-200">
				<div
					className={cn("h-2 rounded-full transition-all", getBarColor(score))}
					style={{ width: `${Math.min(100, score)}%` }}
				/>
			</div>
		</div>
	);
}

const ERROR_LEGEND: {
	key: string;
	label: string;
	colorClass: string;
}[] = [
	{
		key: "Mispronunciation",
		label: "Phát âm sai",
		colorClass: "bg-yellow-200",
	},
	{ key: "Omission", label: "Bỏ sót", colorClass: "bg-neutral-300" },
	{ key: "Insertion", label: "Đọc thừa", colorClass: "bg-red-200" },
	{
		key: "UnexpectedBreak",
		label: "Ngắt nghỉ không mong đợi",
		colorClass: "bg-pink-200",
	},
	{ key: "MissingBreak", label: "Thiếu ngắt nghỉ", colorClass: "bg-neutral-300" },
];

function ConversationFeedbackAssessing() {
	return (
		<div className="w-full flex flex-col items-center justify-center gap-4 h-full p-4">
			<h2 className="text-base font-medium text-secondary-black">
				Kết quả đánh giá
			</h2>
			<ShimmerText className="flex-1 w-full" />
		</div>
	);
}

function ConversationFeedbackContent({
	feedback,
}: {
	feedback: PronunciationResultPayload;
}) {
	const errorCounts = useMemo(() => {
		const counts = Object.fromEntries(
			ERROR_LEGEND.map((item) => [item.key, 0]),
		) as Record<string, number>;
		for (const w of feedback.words) {
			if (w.ErrorType !== "None") counts[w.ErrorType]++;
		}
		return counts;
	}, [feedback.words]);

	return (
		<div className="w-full flex flex-col gap-6 h-full overflow-y-auto no-scrollbar p-4">
			<h2 className="text-base font-medium text-secondary-black">
				Kết quả đánh giá
			</h2>

			<div className="flex justify-center">
				<ScoreGauge score={feedback.pronunciationScore} label="Điểm phát âm" />
			</div>

			<div className="flex flex-col gap-3">
				<ScoreBar score={feedback.accuracyScore} label="Độ chính xác" />
				<ScoreBar score={feedback.fluencyScore} label="Độ trôi chảy" />
				<ScoreBar score={feedback.completenessScore} label="Độ đầy đủ" />
				<ScoreBar score={feedback.prosodyScore} label="Ngữ điệu" />
			</div>

			<div className="flex flex-col gap-2">
				<h3 className="text-sm font-medium text-secondary-black">
					Nội dung thu âm
				</h3>
				<AssessedText words={feedback.words} />
			</div>

			<div className="flex flex-col gap-2">
				<h3 className="text-sm font-medium text-secondary-black">Chú thích</h3>
				<div className="flex flex-col gap-1.5">
					{ERROR_LEGEND.map((item) => (
						<div key={item.key} className="flex items-center gap-2">
							<span
								className={cn(
									"inline-flex items-center justify-center size-5 rounded text-xs font-medium",
									item.colorClass,
								)}
							>
								{errorCounts[item.key]}
							</span>
							<span className="text-xs text-muted-foreground">
								{item.label}
							</span>
						</div>
					))}
				</div>
			</div>

			<div className="flex items-center gap-3 text-xs text-muted-foreground border-t pt-3">
				<span className="flex items-center gap-1">
					<span className="size-2.5 rounded-full bg-red-500" /> 0 – 59
				</span>
				<span className="flex items-center gap-1">
					<span className="size-2.5 rounded-full bg-yellow-500" /> 60 – 79
				</span>
				<span className="flex items-center gap-1">
					<span className="size-2.5 rounded-full bg-green-600" /> 80 – 100
				</span>
			</div>
		</div>
	);
}

type ConversationFeedbackPanelProps = {
	feedback?: PronunciationResultPayload | null;
	isAssessing?: boolean;
};

export function ConversationFeedbackPanel({
	feedback,
	isAssessing = false,
}: ConversationFeedbackPanelProps) {
	if (isAssessing) return <ConversationFeedbackAssessing />;
	if (!feedback) return null;
	return <ConversationFeedbackContent feedback={feedback} />;
}
