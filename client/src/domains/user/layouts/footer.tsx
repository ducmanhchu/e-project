import { Logo } from "@shared/components/logo";
import { useTheme } from "@shared/hooks/use-theme";
import { Button } from "@shared/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function Footer() {
	const { theme, toggleTheme } = useTheme();

	return (
		<div className="flex justify-between items-center w-full bg-secondary text-secondary-foreground p-4 md:px-10 lg:px-20">
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
					{theme === "light" ? <Moon /> : <Sun />}
				</Button>
			</div>
		</div>
	);
}
