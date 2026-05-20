import { Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	CheckmarkCircle02Icon,
	Progress01Icon,
	Progress03Icon,
} from "@hugeicons/core-free-icons";

import type { SAWListItem } from "@shared/types/see-and-write";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@shared/components/ui/card";
import { ExerciseLevelBadge } from "@user/components/exercise-level-badge";
import { Button } from "@shared/components/ui/button";

import { translateStatus, translateTopic } from "@shared/lib/utils";

export function SeeAndWriteCard({ card }: { card: SAWListItem }) {
	return (
		<Card className="flex flex-col justify-between">
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
					<Link to={`/writing/see-and-write/${card.id}`}>
						{translateStatus(card.status)}
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
