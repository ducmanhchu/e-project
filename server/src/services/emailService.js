import { getTransporter } from "@server/config/mailer";
import { env } from "@server/config/environment";
import { renderTemplate } from "@server/helpers/renderTemplate";

export async function sendEmail({ to, subject, text, html }) {
	const transporter = getTransporter();
	return transporter.sendMail({
		from: `${env.EMAIL_FROM_NAME} <${env.GMAIL_USER}>`,
		to,
		subject,
		text,
		html,
	});
}

export async function sendVerificationEmail({ to, fullName, token }) {
	const link = `${env.FRONTEND_URL}/verify-email?token=${token}`;
	return sendEmail({
		to,
		subject: "Xác thực tài khoản - Wordwise",
		text: buildVerificationText({ fullName, link }),
		html: renderTemplate("templates/emails/verification.html", {
			fullName,
			link,
		}),
	});
}

export async function sendPasswordResetEmail({ to, fullName, token }) {
	const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;
	return sendEmail({
		to,
		subject: "Đặt lại mật khẩu - Wordwise",
		text: buildPasswordResetText({ fullName, link }),
		html: renderTemplate("templates/emails/password-reset.html", {
			fullName,
			link,
		}),
	});
}

function buildVerificationText({ fullName, link }) {
	return `Chào ${fullName},

Chọn đường dẫn bên dưới để xác thực tài khoản (hiệu lực trong 24h):
${link}

Nếu bạn không yêu cầu tạo tài khoản, vui lòng bỏ qua tin nhắn này.`;
}

function buildPasswordResetText({ fullName, link }) {
	return `Chào ${fullName},

Chọn đường dẫn bên dưới để đặt lại mật khẩu (hiệu lực trong 1 giờ):
${link}

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua tin nhắn này — mật khẩu hiện tại sẽ không bị thay đổi.`;
}
