import { HugeiconsIcon } from "@hugeicons/react";
import { VolumeHighIcon } from "@hugeicons/core-free-icons";

import { Button } from "@shared/components/ui/button";
import { useAzureTTS } from "@shared/hooks/use-azure-tts";
import { cn } from "@shared/lib/utils";

type TermSpeakerProps = {
	word: string;
	className?: string;
};

/**
 * Nút phát âm thuật ngữ qua Azure TTS.
 * @param props.word - Từ tiếng Anh cần phát
 * @param props.className - Class bổ sung
 */
export function TermSpeaker({ word, className }: TermSpeakerProps) {
	const { toggle, isPlaying } = useAzureTTS();

	return (
		<Button
			variant="ghost"
			size="icon-sm"
			className={cn("text-muted-foreground", className)}
			aria-label={`Phát âm ${word}`}
			onClick={() => void toggle(word)}
		>
			<HugeiconsIcon
				icon={VolumeHighIcon}
				className={cn(isPlaying && "text-secondary-blue")}
			/>
		</Button>
	);
}
