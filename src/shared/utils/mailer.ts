import { createTransport } from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

export const transporter = createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

export const sendMails = async ({
  to,
  subject,
  message,
  html,
}: {
  to: string;
  subject: string;
  message?: string;
  html?: string;
}) => {
  try {
    await transporter.sendMail({
      to,
      subject,
      ...(message && { text: message }),
      ...(html && { html }),
    });
  } catch (error: any) {
    logger.error({ err: error }, "unable to send email");
    throw error;
  }
};
