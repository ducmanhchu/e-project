import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { LoginForm } from "@/domains/admin/features/auth/components/login-form";
import { useTheme } from "@shared/hooks/use-theme";
import { Button } from "@shared/components/ui/button";

export function Login() {
	const { theme, toggleTheme } = useTheme();

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<LoginForm />
			</div>
			<div className="absolute bottom-6 right-6 z-10">
				<Button
					variant="ghost"
					onClick={toggleTheme}
					aria-label="Chuyển đổi chủ đề sáng/tối"
				>
					{theme === "light" ? (
						<HugeiconsIcon icon={Moon02Icon} />
					) : (
						<HugeiconsIcon icon={Sun01Icon} />
					)}
				</Button>
			</div>
		</div>
	);
}
