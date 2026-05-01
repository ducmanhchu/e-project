import { RegisterForm } from "@user/features/auth/components/register-form";

export function Register() {
	return (
		<div className="flex flex-col min-h-svh items-center justify-center px-6 md:px-0">
			<RegisterForm className="w-full max-w-sm" />
		</div>
	);
}
