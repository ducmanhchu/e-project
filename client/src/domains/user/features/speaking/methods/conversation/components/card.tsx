import { Link } from "react-router";

import type { ConversationListItem } from "@shared/types/conversation";
import type { ExerciseLevel } from "@shared/types/utils";

import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
	CardContent,
} from "@shared/components/ui/card";
import { ExerciseLevelBadge } from "@user/components/exercise-level-badge";
import { translateStatus, translateTopic } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";

export function ConversationCard({ card }: { card: ConversationListItem }) {
	return (
		<Card className="flex flex-col justify-between">
			<CardHeader>
				<ExerciseLevelBadge
					level={(card.level as ExerciseLevel) ?? "beginner"}
				/>
				<CardTitle className="line-clamp-2">
					{card.title ?? "Tiêu đề"}
				</CardTitle>
				<CardDescription className="line-clamp-1">
					{translateTopic(card.topic)}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="line-clamp-3">{card.scenario}</p>
			</CardContent>
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
					<Link to={`/speaking/conversation/${card.id}`}>
						{translateStatus(card.status)}
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
