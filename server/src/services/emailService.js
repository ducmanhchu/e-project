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
    subject: "Xác thực email — English Platform",
    text: buildVerificationText({ fullName, link }),
    html: renderTemplate("templates/emails/verification.html", { fullName, link }),
  });
}

export async function sendPasswordResetEmail({ to, fullName, token }) {
  const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: "Đặt lại mật khẩu — English Platform",
    text: buildPasswordResetText({ fullName, link }),
    html: renderTemplate("templates/emails/password-reset.html", { fullName, link }),
  });
}

function buildVerificationText({ fullName, link }) {
  return `Chào ${fullName},

Click link sau để xác thực email (hạn 24h):
${link}

Nếu bạn không tạo account này, bỏ qua email này.`;
}

function buildPasswordResetText({ fullName, link }) {
  return `Chào ${fullName},

Click link sau để đặt lại mật khẩu (hạn 1 giờ):
${link}

Nếu bạn không yêu cầu đặt lại mật khẩu, bỏ qua email này — mật khẩu hiện tại không bị thay đổi.`;
}
