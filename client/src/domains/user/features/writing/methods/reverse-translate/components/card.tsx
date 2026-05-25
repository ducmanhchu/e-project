import { Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	CheckmarkCircle02Icon,
	Progress01Icon,
	Progress03Icon,
} from "@hugeicons/core-free-icons";

import {
	Card,
	CardFooter,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";

import type { RTItem } from "@shared/types/reverse-translate";
import { translateTopic, translateStatus } from "@shared/lib/utils";
import { ExerciseLevelBadge } from "@/domains/user/components/exercise-level-badge";

export function ReverseTranslateCard({ card }: { card: RTItem }) {
	return (
		<Card className="flex flex-col justify-between">
			<CardHeader>
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
					<Link to={`/writing/reverse-translate/${card.id}`}>
						{translateStatus(card.status)}
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
