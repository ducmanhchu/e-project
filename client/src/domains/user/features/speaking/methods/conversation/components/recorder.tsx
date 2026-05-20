import { useCallback, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Mic02Icon,
	StopIcon,
	PlayIcon,
	PauseIcon,
	ArrowRight02Icon,
	Loading03Icon,
	Redo02Icon,
	Tick02Icon,
	Tick01Icon,
} from "@hugeicons/core-free-icons";
import { motion } from "motion/react";

import type { Phase } from "@/domains/user/features/speaking/methods/conversation/hooks/use-conversation";

import { Button } from "@shared/components/ui/button";
import { cn } from "@shared/lib/utils";

type ConversationRecorderProps = {
	phase: Phase;
	playbackUrl: string | null;
	isAllCompleted: boolean;
	isLastPair: boolean;
	onStartRecording: () => void;
	onStopRecording: () => void;
	onReRecord: () => void;
	onSubmit: () => void;
	onNext: () => void;
	onRedo: () => void;
};

export function ConversationRecorder({
	phase,
	playbackUrl,
	isAllCompleted,
	isLastPair,
	onStartRecording,
	onStopRecording,
	onReRecord,
	onSubmit,
	onNext,
	onRedo,
}: ConversationRecorderProps) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlayingBack, setIsPlayingBack] = useState(false);

	const handlePlayback = useCallback(() => {
		if (!playbackUrl || !audioRef.current) return;

		if (isPlayingBack) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
			setIsPlayingBack(false);
		} else {
			audioRef.current.play();
		}
	}, [playbackUrl, isPlayingBack]);

	if (phase === "idle") {
		return (
			<div className="flex flex-col items-center gap-3">
				<Button
					variant="blackHover"
					className="rounded-full px-6"
					onClick={onStartRecording}
					aria-label="Bắt đầu thu âm"
				>
					<HugeiconsIcon icon={Mic02Icon} className="size-4 mr-1" />
					Bắt đầu thu âm
				</Button>
			</div>
		);
	}

	if (phase === "recording") {
		return (
			<Button
				variant="destructive"
				className="px-6 rounded-full"
				onClick={onStopRecording}
				aria-label="Dừng thu âm"
			>
				<motion.span
					animate={{
						scale: [1, 1.2, 1],
					}}
					transition={{
						repeat: Infinity,
						duration: 1.1,
						ease: "easeInOut",
					}}
					className="flex"
				>
					<HugeiconsIcon icon={StopIcon} className="size-4 mr-1" />
				</motion.span>
				Dừng thu âm
			</Button>
		);
	}

	if (phase === "playback") {
		return (
			<div className="flex flex-col items-center gap-3">
				{playbackUrl && (
					<audio
						ref={audioRef}
						src={playbackUrl}
						onPlay={() => setIsPlayingBack(true)}
						onPause={() => setIsPlayingBack(false)}
						onEnded={() => setIsPlayingBack(false)}
					/>
				)}
				<div className="flex items-center gap-3">
					<Button
						variant="outline"
						size="icon"
						className="rounded-full"
						onClick={handlePlayback}
						aria-label={isPlayingBack ? "Tạm dừng" : "Nghe lại"}
					>
						<HugeiconsIcon icon={isPlayingBack ? PauseIcon : PlayIcon} />
					</Button>
					<Button
						variant="blackHover"
						className="rounded-full px-6"
						onClick={onSubmit}
						aria-label="Nộp bài"
					>
						<HugeiconsIcon icon={Tick02Icon} className="size-4 mr-1" />
						Nộp
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="rounded-full"
						onClick={onReRecord}
						aria-label="Thu lại"
					>
						<HugeiconsIcon icon={Redo02Icon} />
					</Button>
				</div>
			</div>
		);
	}

	if (phase === "assessing") {
		return (
			<div className="flex items-center gap-2">
				<HugeiconsIcon
					icon={Loading03Icon}
					className="size-6 text-secondary-black animate-spin"
				/>
				<p className="text-secondary-black text-sm">Đang đánh giá</p>
			</div>
		);
	}

	// phase === "feedback"
	return (
		<div className="flex items-center gap-3 justify-center">
			<Button
				variant="outline"
				className="rounded-full"
				onClick={onRedo}
				aria-label="Thu lại"
			>
				<HugeiconsIcon icon={Redo02Icon} className="size-4 mr-1" />
				Thu lại
			</Button>
			<Button
				variant="blackHover"
				className={cn(
					"rounded-full",
					isAllCompleted && isLastPair && "bg-green-100 text-green-800",
				)}
				onClick={onNext}
				aria-label="Câu tiếp theo"
				disabled={isAllCompleted && isLastPair}
			>
				<HugeiconsIcon
					icon={ArrowRight02Icon}
					altIcon={Tick01Icon}
					showAlt={isAllCompleted && isLastPair}
					className="size-4 ml-1"
				/>
				{isAllCompleted && isLastPair ? "Hoàn thành" : "Tiếp theo"}
			</Button>
		</div>
	);
}
