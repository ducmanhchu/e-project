import { Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	CheckmarkCircle02Icon,
	Progress01Icon,
	Progress03Icon,
} from "@hugeicons/core-free-icons";

import type { ParaphraseListItem } from "@shared/types/paraphrase";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@shared/components/ui/card";
import { ExerciseLevelBadge } from "@user/components/exercise-level-badge";
import { translateStatus, translateTopic } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";

export function ParaphraseCard({ card }: { card: ParaphraseListItem }) {
	return (
		<Card className="flex flex-col justify-between">
			<CardHeader>
				<ExerciseLevelBadge level={card.level} />
				<CardTitle className="line-clamp-2">{card.title}</CardTitle>
				<CardDescription className="line-clamp-1 flex flex-col gap-2">
					{translateTopic(card.topic)}
					<span>{card.totalSentences} câu hỏi</span>
				</CardDescription>
			</CardHeader>
			<CardFooter>
				<Button
					size="sm"
					variant={
						card.status === "not_started"
							? "blackHover"
							: card.status === "in_progress"
								? "yellowHover"
								: "greenHover"
					}
				>
					<HugeiconsIcon
						icon={
							card.status === "not_started"
								? Progress01Icon
								: card.status === "in_progress"
									? Progress03Icon
									: CheckmarkCircle02Icon
						}
						className="size-3.5 mr-1"
					/>
					<Link to={`/writing/paraphrase/${card.id}`}>
						{translateStatus(card.status)}
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
