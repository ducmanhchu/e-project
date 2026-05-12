import { HugeiconsIcon } from "@hugeicons/react";
import { VolumeHighIcon } from "@hugeicons/core-free-icons";

import type { Word } from "@shared/types/vocab";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";

export function WordCard({ word }: { word: Word }) {
	const handlePlayAudio = () => {
		if (word.audio) {
			const audio = new Audio(word.audio);
			audio.play();
		}
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
					<div className="flex gap-2">
						{word.audio && (
							<Button variant="ghost" size="icon" onClick={handlePlayAudio}>
								<HugeiconsIcon icon={VolumeHighIcon} />
							</Button>
						)}
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
