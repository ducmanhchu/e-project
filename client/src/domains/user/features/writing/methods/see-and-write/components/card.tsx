import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@shared/components/ui/card";
import { ExerciseLevelBadge } from "@user/components/exercise-level-badge";

import type { SAWListItem } from "@shared/types/see-and-write";
import { translateStatus, translateTopic } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Link } from "react-router";

export function SeeAndWriteCard({ card }: { card: SAWListItem }) {
	return (
		<Card>
			<CardHeader>
				<img
					src={card.image}
					alt="Exercise cover"
					className="object-cover aspect-video mb-3 rounded-xl"
				/>
				<ExerciseLevelBadge level={card.level} />
				<CardTitle className="line-clamp-2">{card.title}</CardTitle>
				<CardDescription className="line-clamp-1">
					{translateTopic(card.topic)}
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
					<Link to={`/writing/see-and-write/${card.id}`}>
						{translateStatus(card.status)}
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
