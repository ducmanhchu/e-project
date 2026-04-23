import { RegisterForm } from "@user/features/auth/components/register-form";

export function Register() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background">
			<div className="w-full max-w-sm">
				<RegisterForm />
			</div>
		</div>
	);
}
