import { escapeHtml } from "./verificationEmail";

interface RideCompletedEmailParams {
  riderName: string;
  driverName: string;
  driverRating?: number; // Optional driver rating
  rideId: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number; // Distance in kilometers
  durationMinutes: number; // Ride duration in minutes
  finalPrice: string; // Formatted currency (e.g., "$25.50")
  baseFare?: string;
  distanceFee?: string;
  timeFee?: string;
  tipAmount?: string;
  paymentMethod?: string; // e.g., "Credit Card", "Cash"
  rideDate: Date;
  supportEmail?: string;
  receiptUrl?: string; // URL to view full receipt
}

/**
 * Generate HTML email template for ride completion notification
 * Sent to rider when their ride is completed
 */
export const rideCompletedEmailTemplate = ({
  riderName,
  driverName,
  driverRating,
  rideId,
  pickupLocation,
  dropoffLocation,
  distanceKm,
  durationMinutes,
  finalPrice,
  baseFare,
  distanceFee,
  timeFee,
  tipAmount,
  paymentMethod = "Credit Card",
  rideDate,
  supportEmail = "support@yourapp.com",
  receiptUrl,
}: RideCompletedEmailParams): string => {
  const safeRiderName = escapeHtml(riderName);
  const safeDriverName = escapeHtml(driverName);
  const safeRideId = escapeHtml(rideId);
  const safePickup = escapeHtml(pickupLocation);
  const safeDropoff = escapeHtml(dropoffLocation);
  const safeFinalPrice = escapeHtml(finalPrice);

  // Format date
  const formattedDate = new Date(rideDate).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  // Format distance
  const distanceDisplay =
    distanceKm < 1
      ? `${(distanceKm * 1000).toFixed(0)} m`
      : `${distanceKm.toFixed(1)} km`;

  // Format duration
  const durationDisplay =
    durationMinutes < 60
      ? `${Math.round(durationMinutes)} min`
      : `${Math.floor(durationMinutes / 60)}h ${Math.round(durationMinutes % 60)}m`;

  // Rating display
  const ratingDisplay = driverRating ? `${driverRating.toFixed(1)} ⭐` : null;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Your Ride is Complete</title>
    </head>
    <body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f6f9fc;">
      <table align="center" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:40px 30px;">
        <tr>
          <td>
            <!-- Header -->
            <div style="display:flex; align-items:center; margin-bottom:24px;">
              <div style="width:48px; height:48px; background:#dbeafe; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-right:16px;">
                <span style="font-size:24px;">🚗</span>
              </div>
              <div>
                <h1 style="font-size:24px; font-weight:600; color:#1a1a2e; margin:0;">Ride Complete!</h1>
                <p style="font-size:14px; color:#8a8a9a; margin:4px 0 0 0;">Ride #${safeRideId}</p>
              </div>
            </div>

            <!-- Greeting -->
            <p style="font-size:16px; color:#333; margin:0 0 8px 0;">Hi ${safeRiderName},</p>
            
            <!-- Main Message -->
            <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:16px 20px; margin:16px 0 24px 0; border-radius:4px;">
              <p style="font-size:16px; color:#333; margin:0 0 4px 0;">
                Your ride with <strong>${safeDriverName}</strong> is complete!
              </p>
              <p style="font-size:14px; color:#5a5a7a; margin:4px 0 0 0;">
                Thank you for choosing our service. We hope you had a great experience.
              </p>
            </div>

            <!-- Trip Summary -->
            <h3 style="font-size:16px; font-weight:600; color:#1a1a2e; margin:0 0 12px 0;">Trip Summary</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:24px; background:#f8fafc; border-radius:6px;">
              <tr>
                <td style="padding:10px 12px 10px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">📍 Pickup</td>
                <td style="padding:10px 0 10px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">${safePickup}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px 10px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">📍 Dropoff</td>
                <td style="padding:10px 0 10px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">${safeDropoff}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px 10px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">👤 Driver</td>
                <td style="padding:10px 0 10px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">
                  ${safeDriverName}
                  ${ratingDisplay ? `<span style="margin-left:8px; font-size:13px; color:#f59e0b;">${ratingDisplay}</span>` : ""}
                </td>
              </tr>
              <tr>
                <td style="padding:10px 12px 10px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">📏 Distance</td>
                <td style="padding:10px 0 10px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">${distanceDisplay}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px 10px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">⏱️ Duration</td>
                <td style="padding:10px 0 10px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">${durationDisplay}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px 10px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">📅 Date</td>
                <td style="padding:10px 0 10px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px 10px 0; font-size:14px; color:#5a5a7a;">💳 Payment Method</td>
                <td style="padding:10px 0 10px 12px; font-size:14px; color:#1a1a2e; font-weight:500;">${escapeHtml(paymentMethod)}</td>
              </tr>
            </table>

            <!-- Fare Breakdown -->
            <h3 style="font-size:16px; font-weight:600; color:#1a1a2e; margin:0 0 12px 0;">Fare Breakdown</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:24px; background:#f8fafc; border-radius:6px;">
              ${
                baseFare
                  ? `
                <tr>
                  <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">Base Fare</td>
                  <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; text-align:right; font-weight:500;">${escapeHtml(baseFare)}</td>
                </tr>
              `
                  : ""
              }
              ${
                distanceFee
                  ? `
                <tr>
                  <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">Distance Fee (${distanceDisplay})</td>
                  <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; text-align:right; font-weight:500;">${escapeHtml(distanceFee)}</td>
                </tr>
              `
                  : ""
              }
              ${
                timeFee
                  ? `
                <tr>
                  <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">Time Fee (${durationDisplay})</td>
                  <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; text-align:right; font-weight:500;">${escapeHtml(timeFee)}</td>
                </tr>
              `
                  : ""
              }
              ${
                tipAmount
                  ? `
                <tr>
                  <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">Tip</td>
                  <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; text-align:right; font-weight:500;">${escapeHtml(tipAmount)}</td>
                </tr>
              `
                  : ""
              }
              <tr>
                <td style="padding:12px 12px 12px 0; font-size:16px; color:#1a1a2e; font-weight:700;">Total</td>
                <td style="padding:12px 0 12px 12px; font-size:18px; color:#2E75B6; text-align:right; font-weight:700;">${safeFinalPrice}</td>
              </tr>
            </table>

            <!-- Action Buttons -->
            <div style="margin-bottom:24px;">
              <div style="display:flex; gap:12px; flex-wrap:wrap;">
                ${
                  receiptUrl
                    ? `
                  <a href="${escapeHtml(receiptUrl)}" 
                     style="display:inline-block; background:#2E75B6; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; padding:12px 28px; border-radius:6px;">
                    View Full Receipt
                  </a>
                `
                    : ""
                }
                <a href="https://yourapp.com/rider/rate/${safeRideId}" 
                   style="display:inline-block; background:#f0f4f8; color:#1a1a2e; text-decoration:none; font-weight:600; font-size:14px; padding:12px 28px; border-radius:6px;">
                  Rate & Review
                </a>
              </div>
            </div>

            <!-- Rate Your Driver Prompt -->
            <div style="background:#fefce8; border:1px solid #fde68a; border-radius:6px; padding:16px 20px; margin-bottom:24px;">
              <p style="font-size:14px; color:#78350f; margin:0 0 4px 0; font-weight:600;">⭐ Rate Your Driver</p>
              <p style="font-size:13px; color:#78350f; margin:0;">
                How was your ride with ${safeDriverName}? Your feedback helps us improve and helps other riders make informed decisions.
              </p>
            </div>

            <!-- Support Info -->
            <hr style="border:0; border-top:1px solid #e6eaf0; margin:28px 0 16px 0;" />
            
            <p style="font-size:13px; color:#8a8a9a; margin:0 0 8px 0; line-height:1.5;">
              Need help with your ride? Contact our support team at 
              <a href="mailto:${supportEmail}" style="color:#2E75B6; text-decoration:underline;">${supportEmail}</a>
            </p>
            
            <p style="font-size:12px; color:#b0b0c0; margin:12px 0 0 0; line-height:1.5;">
              This is an automated receipt for your ride. Please keep this email for your records.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
