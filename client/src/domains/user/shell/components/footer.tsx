import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp02Icon } from "@hugeicons/core-free-icons";

import { Logo } from "@shared/components/logo";
import { Button } from "@shared/components/ui/button";

export function Footer() {
	return (
		<footer className="flex justify-between items-center rounded-t-4xl w-full bg-secondary-black text-secondary-white p-4 md:px-10 lg:px-20">
			<div className="flex flex-col justify-start">
				<Logo className="h-14 w-32" />
				<p className="text-sm font-light text-secondary-white">
					Copyright © 2026. All rights reserved.
				</p>
			</div>
			<Button
				className="group bg-secondary-white hover:bg-secondary-black border border-transparent hover:border-secondary-white transition-all duration-200"
				size="icon"
				onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
				aria-label="Scroll to top"
			>
				<HugeiconsIcon
					icon={ArrowUp02Icon}
					className="text-secondary-black transition-colors duration-200 group-hover:text-secondary-white"
				/>
			</Button>
		</footer>
	);
}
