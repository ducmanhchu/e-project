import { Sun, Moon } from "lucide-react";

import { LoginForm } from "@/domains/admin/components/login-form";
import { useTheme } from "@/shared/hooks/useTheme";
import { Button } from "@/shared/components/ui/button";

export default function Login() {
	const { theme, setTheme } = useTheme();

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<LoginForm />
			</div>
			<div className="absolute bottom-6 right-6 z-10">
				<Button
					variant="ghost"
					onClick={() => setTheme(theme === "light" ? "dark" : "light")}
				>
					{theme === "light" ? <Moon /> : <Sun />}
				</Button>
			</div>
		</div>
	);
}
