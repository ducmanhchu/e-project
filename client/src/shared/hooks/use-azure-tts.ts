import { useCallback, useEffect, useRef, useState } from "react";

import { synthesizeSpeech } from "@/shared/lib/azure";
import { useAzureToken, ensureAzureToken } from "@shared/hooks/use-azure-token";
import { toast } from "sonner";

type UseAzureTTSOptions = {
	enabled?: boolean;
};

export function useAzureTTS(options?: UseAzureTTSOptions) {
	const { data: token, refetch } = useAzureToken(options?.enabled ?? true);

	const [isPlaying, setIsPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const urlRef = useRef<string | null>(null);
	const playbackSessionRef = useRef(0);
	const isBusyRef = useRef(false);

	const cleanup = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.src = "";
			audioRef.current = null;
		}
		if (urlRef.current) {
			URL.revokeObjectURL(urlRef.current);
			urlRef.current = null;
		}
	}, []);

	const stop = useCallback(() => {
		playbackSessionRef.current += 1;
		isBusyRef.current = false;
		cleanup();
		setIsPlaying(false);
	}, [cleanup]);

	useEffect(() => () => stop(), [stop]);

	const play = useCallback(
		async (text: string) => {
			if (!text.trim()) return;

			const session = playbackSessionRef.current + 1;
			playbackSessionRef.current = session;
			isBusyRef.current = true;
			setIsPlaying(true);

			try {
				const auth = await ensureAzureToken(token, refetch);
				if (playbackSessionRef.current !== session) return;

				const blob = await synthesizeSpeech(text, auth);
				if (playbackSessionRef.current !== session) return;

				cleanup();

				const url = URL.createObjectURL(blob);
				urlRef.current = url;

				const audio = new Audio(url);
				audioRef.current = audio;

				audio.onended = () => {
					if (playbackSessionRef.current !== session) return;
					stop();
				};
				audio.onerror = () => {
					if (playbackSessionRef.current !== session) return;
					stop();
				};

				await audio.play();
				if (playbackSessionRef.current !== session) {
					audio.pause();
					cleanup();
				}
			} catch {
				if (playbackSessionRef.current === session) {
					stop();
				}
				toast.error("Lỗi khi phát âm: vui lòng thử lại.");
			}
		},
		[token, refetch, cleanup, stop],
	);

	const toggle = useCallback(
		async (text: string) => {
			if (isBusyRef.current) {
				stop();
				return;
			}
			await play(text);
		},
		[play, stop],
	);

	return { isPlaying, play, stop, toggle };
}
