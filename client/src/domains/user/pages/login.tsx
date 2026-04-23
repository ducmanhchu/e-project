import { Moon, Sun } from "lucide-react";

import { Button } from "@shared/components/ui/button";
import { useTheme } from "@shared/hooks/use-theme";
import { LoginForm } from "@/domains/user/features/auth/components/login-form";

export function Login() {
	const { theme, toggleTheme } = useTheme();

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
			<div className="w-full max-w-sm">
				<LoginForm />
			</div>
			<div className="absolute bottom-6 right-6 z-10">
				<Button variant="ghost" onClick={toggleTheme}>
					{theme === "light" ? <Moon /> : <Sun />}
				</Button>
			</div>
		</div>
	);
}
