import { Link } from "react-router";

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
		<Card>
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
					<Link to={`/writing/paraphrase/${card.id}`}>
						{translateStatus(card.status)}
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
