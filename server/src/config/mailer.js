import nodemailer from "nodemailer";
import { env } from "@server/config/environment";

let transporter;

export function getTransporter() {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    throw new Error(
      "Gmail SMTP not configured: GMAIL_USER/GMAIL_APP_PASSWORD missing",
    );
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}
