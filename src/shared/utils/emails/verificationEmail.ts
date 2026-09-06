interface VerifyEmailParams {
  url: string; // Full verification link (e.g., https://yourapp.com/verify?token=...)
  code: string; // Numeric/alpha code for manual entry
  firstName: string; // User's first name
  expiresIn?: number; // Expiry time in minutes (default: 60)
}

/**
 * Escape HTML special characters to prevent XSS (since we're using raw string templates).
 * This is crucial if any input might contain `<`, `>`, `&`, etc.
 */
export const escapeHtml = (str: string): string =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const verifyEmailTemplate = ({
  url,
  code,
  firstName,
  expiresIn = 60,
}: VerifyEmailParams): string => {
  const safeFirstName = escapeHtml(firstName);
  const safeCode = escapeHtml(code);
  const safeUrl = escapeHtml(url); // Also ensure `url` is a valid, trusted URL

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Verify your email</title>
    </head>
    <body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f6f9fc;">
      <table align="center" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:40px 30px;">
        <tr>
          <td>
            <!-- Header -->
            <h1 style="font-size:24px; font-weight:600; color:#1a1a2e; margin:0 0 8px 0;">Verify Your Email</h1>
            <p style="font-size:16px; color:#5a5a7a; margin:0 0 24px 0;">Hi ${safeFirstName},</p>

            <!-- Body -->
            <p style="font-size:16px; color:#333; line-height:1.6; margin:0 0 20px 0;">
              Please verify your email address by clicking the button below. This link will expire in <strong>${expiresIn} minutes</strong>.
            </p>

            <!-- Primary CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
              <tr>
                <td align="center" style="background:#2E75B6; border-radius:6px; padding:12px 30px;">
                  <a href="${safeUrl}" style="color:#ffffff; text-decoration:none; font-weight:600; font-size:16px; display:inline-block; word-break:break-word;">
                    Verify Email
                  </a>
                </td>
              </tr>
            </table>

            <!-- Fallback manual code -->
            <p style="font-size:14px; color:#5a5a7a; margin:0 0 8px 0;">
              Or, you can manually enter this code on the verification page:
            </p>
            <div style="background:#f0f4f8; border-radius:4px; padding:12px 16px; display:inline-block; font-size:20px; font-weight:700; letter-spacing:2px; color:#1a1a2e; margin:0 0 24px 0;">
              ${safeCode}
            </div>

            <!-- Footer -->
            <hr style="border:0; border-top:1px solid #e6eaf0; margin:28px 0 16px 0;" />
            <p style="font-size:13px; color:#8a8a9a; margin:0; line-height:1.5;">
              If you didn’t request this, please ignore this email.<br />
              For security, this link will expire after ${expiresIn} minutes.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const resetPasswordEmailTemplate = (
  resetUrl: string,
  firstName: string
): string => {
  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hi ${firstName},</h2>
      <p>Here is your reset password link belowe:</p>
      <a href="${resetUrl}" style="background: #2E75B6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a>
      <p>This link expires in 1 hour</p>
      <p>If you didn't request this, ignore this email.</p>
    </div>
    `;
};
