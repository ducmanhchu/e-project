import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { Logo } from "@shared/components/logo";
import { useTheme } from "@shared/hooks/use-theme";
import { Button } from "@shared/components/ui/button";

export function Footer() {
	const { theme, toggleTheme } = useTheme();

	return (
		<footer className="flex justify-between items-center rounded-t-4xl w-full bg-primary text-primary-foreground p-4 md:px-10 lg:px-20">
			<div className="flex flex-col justify-start">
				<Logo className="h-14 w-32" />
				<p className="text-sm text-muted-foreground">
					Copyright © 2026. All rights reserved.
				</p>
			</div>
			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					aria-label="Chuyển đổi chủ đề sáng/tối"
					onClick={toggleTheme}
				>
					{theme === "light" ? (
						<HugeiconsIcon icon={Moon02Icon} />
					) : (
						<HugeiconsIcon icon={Sun01Icon} />
					)}
				</Button>
			</div>
		</footer>
	);
}
