import { LoginForm } from "@user/features/auth/components/login-form";

export function Login() {
	return (
		<div className="flex flex-col min-h-svh items-center justify-center px-6 md:px-0">
			<LoginForm className="w-full max-w-sm" />
		</div>
	);
}
