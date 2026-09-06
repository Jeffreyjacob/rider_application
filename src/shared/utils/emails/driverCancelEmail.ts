import { escapeHtml } from "./verificationEmail";

interface RideCancelledEmailParams {
  driverName: string;
  riderName: string;
  rideId: string;
  cancelledAt: Date;
  cancellationReason?: string; // Optional reason for cancellation
  supportEmail?: string; // Optional support contact
}

/**
 * Generate HTML email template for ride cancellation notification
 * Sent to driver when a rider cancels their ride
 */
export const rideCancelledEmailTemplate = ({
  driverName,
  riderName,
  rideId,
  cancelledAt,
  cancellationReason,
  supportEmail = "support@yourapp.com",
}: RideCancelledEmailParams): string => {
  const safeDriverName = escapeHtml(driverName);
  const safeRiderName = escapeHtml(riderName);
  const safeRideId = escapeHtml(rideId);
  const safeReason = cancellationReason ? escapeHtml(cancellationReason) : null;

  // Format date in a readable way
  const formattedDate = new Date(cancelledAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Ride Cancelled Notification</title>
    </head>
    <body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f6f9fc;">
      <table align="center" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:40px 30px;">
        <tr>
          <td>
            <!-- Header -->
            <div style="display:flex; align-items:center; margin-bottom:24px;">
              <div style="width:48px; height:48px; background:#fee2e2; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-right:16px;">
                <span style="font-size:24px;">🚫</span>
              </div>
              <div>
                <h1 style="font-size:24px; font-weight:600; color:#1a1a2e; margin:0;">Ride Cancelled</h1>
                <p style="font-size:14px; color:#8a8a9a; margin:4px 0 0 0;">Ride #${safeRideId}</p>
              </div>
            </div>

            <!-- Greeting -->
            <p style="font-size:16px; color:#333; margin:0 0 8px 0;">Hi ${safeDriverName},</p>
            
            <!-- Main Message -->
            <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:16px 20px; margin:16px 0 24px 0; border-radius:4px;">
              <p style="font-size:16px; color:#333; margin:0 0 8px 0;">
                <strong>${safeRiderName}</strong> has cancelled their ride request.
              </p>
              ${
                safeReason
                  ? `
                <p style="font-size:14px; color:#666; margin:8px 0 0 0;">
                  <strong>Reason:</strong> ${safeReason}
                </p>
              `
                  : ""
              }
            </div>

            <!-- Ride Details -->
            <h3 style="font-size:16px; font-weight:600; color:#1a1a2e; margin:0 0 12px 0;">Ride Details</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
              <tr>
                <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">Ride ID</td>
                <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">${safeRideId}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a;">Cancelled At</td>
                <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; font-weight:500;">${formattedDate}</td>
              </tr>
            </table>

            <!-- Action Buttons -->
            <div style="margin-bottom:24px;">
              <p style="font-size:14px; color:#5a5a7a; margin:0 0 12px 0;">What would you like to do?</p>
              <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <a href="https://yourapp.com/driver/dashboard" 
                   style="display:inline-block; background:#2E75B6; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; padding:10px 24px; border-radius:6px;">
                  View Dashboard
                </a>
                <a href="https://yourapp.com/driver/earnings" 
                   style="display:inline-block; background:#f0f4f8; color:#1a1a2e; text-decoration:none; font-weight:600; font-size:14px; padding:10px 24px; border-radius:6px;">
                  Check Earnings
                </a>
              </div>
            </div>

            <!-- Footer -->
            <hr style="border:0; border-top:1px solid #e6eaf0; margin:28px 0 16px 0;" />
            
            <!-- Support Info -->
            <p style="font-size:13px; color:#8a8a9a; margin:0 0 8px 0; line-height:1.5;">
              Need help? Contact our support team at 
              <a href="mailto:${supportEmail}" style="color:#2E75B6; text-decoration:underline;">${supportEmail}</a>
            </p>
            
            <p style="font-size:12px; color:#b0b0c0; margin:12px 0 0 0; line-height:1.5;">
              This is an automated notification. You can manage your notification preferences 
              in your driver settings.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
