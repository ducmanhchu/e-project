import { Link } from "react-router";

import { ForgotPasswordForm } from "@user/features/auth/components/forgot-password-form";
import { Logo } from "@shared/components/logo";

export function ForgotPassword() {
	return (
		<div className="flex flex-col gap-1 min-h-svh items-center justify-center px-6 md:px-0">
			<Link to="/">
				<Logo className="w-24" />
			</Link>
			<ForgotPasswordForm className="w-full max-w-md" />
		</div>
	);
}
