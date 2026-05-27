import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

import { cn } from "@shared/lib/utils";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Label } from "@shared/components/ui/label";
import { Toggle } from "@shared/components/ui/toggle";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@shared/components/ui/collapsible";

const topicToggleClassName = cn(
	"h-auto text-sm min-h-8 rounded-full px-3 py-1.5 font-normal text-muted-foreground",
	"aria-pressed:border-neutral-300 aria-pressed:bg-neutral-50 aria-pressed:text-secondary-black",
	"hover:aria-pressed:bg-neutral-50 hover:aria-pressed:text-secondary-black",
);

export function FilterSection({
	sectionId,
	label,
	options,
	selected,
	onCheckedChange,
}: {
	sectionId: string;
	label: string;
	options: readonly { id: string; label: string }[];
	selected: Record<string, boolean>;
	onCheckedChange: (compositeId: string, checked: boolean) => void;
}) {
	const isTopicSection = sectionId === "topic";

	return (
		<Collapsible defaultOpen className="group/collapsible flex flex-col gap-3">
			<CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-2 text-left text-sm font-normal text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground">
				<span>{label}</span>
				<HugeiconsIcon
					icon={ArrowDown01Icon}
					className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180"
				/>
			</CollapsibleTrigger>
			<CollapsibleContent
				className={cn(
					isTopicSection ? "flex flex-wrap gap-2.5" : "flex flex-col gap-3",
				)}
			>
				{options.map((opt) => {
					const compositeId = `${sectionId}:${opt.id}`;

					if (isTopicSection) {
						return (
							<Toggle
								key={opt.id}
								variant="outline"
								size="sm"
								pressed={!!selected[compositeId]}
								onPressedChange={(pressed) =>
									onCheckedChange(compositeId, pressed)
								}
								className={topicToggleClassName}
							>
								{opt.label}
							</Toggle>
						);
					}

					return (
						<div key={opt.id} className="flex items-center gap-3">
							<Checkbox
								id={compositeId}
								checked={!!selected[compositeId]}
								onCheckedChange={(value) =>
									onCheckedChange(compositeId, value === true)
								}
							/>
							<Label
								htmlFor={compositeId}
								className="cursor-pointer text-sm font-normal text-foreground"
							>
								{opt.label}
							</Label>
						</div>
					);
				})}
			</CollapsibleContent>
		</Collapsible>
	);
}
