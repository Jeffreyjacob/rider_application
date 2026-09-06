import { escapeHtml } from "./verificationEmail";

interface RideAcceptedEmailParams {
  riderName: string;
  driverName: string;
  driverPhone?: string;
  driverRating?: number;
  vehicleInfo?: {
    vehicleNo: string;
    licensePlate: string;
  };
  rideId: string;
  pickupLocation: string;
  dropoffLocation: string;
  estimatedArrivalMinutes?: number;
  estimatedFare?: number;
  supportEmail?: string;
}

export const rideAcceptedEmailTemplate = ({
  riderName,
  driverName,
  driverPhone,
  driverRating,
  vehicleInfo,
  rideId,
  pickupLocation,
  dropoffLocation,
  estimatedArrivalMinutes,
  estimatedFare,
  supportEmail = "support@yourapp.com",
}: RideAcceptedEmailParams): string => {
  const safeRiderName = escapeHtml(riderName);
  const safeDriverName = escapeHtml(driverName);
  const safeDriverPhone = driverPhone ? escapeHtml(driverPhone) : null;
  const safeRideId = escapeHtml(rideId);
  const safePickup = escapeHtml(pickupLocation);
  const safeDropoff = escapeHtml(dropoffLocation);
  const safeFare = estimatedFare ? estimatedFare : null;

  // Format rating with star
  const ratingDisplay = driverRating ? `${driverRating.toFixed(1)} ⭐` : null;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Driver Accepted Your Ride</title>
    </head>
    <body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f6f9fc;">
      <table align="center" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:40px 30px;">
        <tr>
          <td>
            <!-- Header -->
            <div style="display:flex; align-items:center; margin-bottom:24px;">
              <div style="width:48px; height:48px; background:#dcfce7; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-right:16px;">
                <span style="font-size:24px;">✅</span>
              </div>
              <div>
                <h1 style="font-size:24px; font-weight:600; color:#1a1a2e; margin:0;">Ride Accepted!</h1>
                <p style="font-size:14px; color:#8a8a9a; margin:4px 0 0 0;">Ride #${safeRideId}</p>
              </div>
            </div>

            <!-- Greeting -->
            <p style="font-size:16px; color:#333; margin:0 0 8px 0;">Hi ${safeRiderName},</p>
            
            <!-- Main Message -->
            <div style="background:#f0fdf4; border-left:4px solid #22c55e; padding:16px 20px; margin:16px 0 24px 0; border-radius:4px;">
              <p style="font-size:16px; color:#333; margin:0 0 8px 0;">
                <strong>${safeDriverName}</strong> has accepted your ride request!
              </p>
              ${
                estimatedArrivalMinutes
                  ? `
                <p style="font-size:15px; color:#1a1a2e; margin:8px 0 0 0; font-weight:600;">
                  🚗 Estimated arrival: ${estimatedArrivalMinutes} minutes
                </p>
              `
                  : ""
              }
            </div>

            <!-- Driver Details -->
            <h3 style="font-size:16px; font-weight:600; color:#1a1a2e; margin:0 0 12px 0;">Driver Information</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
              <tr>
                <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">Driver</td>
                <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">${safeDriverName}</td>
              </tr>
              ${
                ratingDisplay
                  ? `
                <tr>
                  <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">Rating</td>
                  <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">${ratingDisplay}</td>
                </tr>
              `
                  : ""
              }
              ${
                safeDriverPhone
                  ? `
                <tr>
                  <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">Phone</td>
                  <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">
                    <a href="tel:${safeDriverPhone}" style="color:#2E75B6; text-decoration:none;">${safeDriverPhone}</a>
                  </td>
                </tr>
              `
                  : ""
              }
              ${
                vehicleInfo
                  ? `
                <tr>
                  <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">Vehicle</td>
                  <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">
                    ${escapeHtml(vehicleInfo.vehicleNo)}
                    ${vehicleInfo.licensePlate ? `(${escapeHtml(vehicleInfo.licensePlate)})` : ""}
                  </td>
                </tr>
              `
                  : ""
              }
            </table>

            <!-- Ride Details -->
            <h3 style="font-size:16px; font-weight:600; color:#1a1a2e; margin:0 0 12px 0;">Ride Details</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
              <tr>
                <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">📍 Pickup</td>
                <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">${safePickup}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a; border-bottom:1px solid #e6eaf0;">📍 Dropoff</td>
                <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; border-bottom:1px solid #e6eaf0; font-weight:500;">${safeDropoff}</td>
              </tr>
              ${
                safeFare
                  ? `
                <tr>
                  <td style="padding:8px 12px 8px 0; font-size:14px; color:#5a5a7a;">Estimated Fare</td>
                  <td style="padding:8px 0 8px 12px; font-size:14px; color:#1a1a2e; font-weight:600;">${safeFare}</td>
                </tr>
              `
                  : ""
              }
            </table>

            <!-- Action Buttons -->
            <div style="margin-bottom:24px;">
              <p style="font-size:14px; color:#5a5a7a; margin:0 0 12px 0;">Track your ride in real-time:</p>
              <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <a href="https://yourapp.com/rider/track/${safeRideId}" 
                   style="display:inline-block; background:#2E75B6; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; padding:12px 28px; border-radius:6px;">
                  Track My Ride
                </a>
                <a href="tel:${safeDriverPhone || supportEmail}" 
                   style="display:inline-block; background:#f0f4f8; color:#1a1a2e; text-decoration:none; font-weight:600; font-size:14px; padding:12px 28px; border-radius:6px;">
                  Contact Driver
                </a>
              </div>
            </div>

            <!-- Safety Tips -->
            <div style="background:#f8fafc; border-radius:6px; padding:16px 20px; margin-bottom:24px;">
              <p style="font-size:13px; color:#5a5a7a; margin:0 0 4px 0; font-weight:600;">🚦 Safety Tips</p>
              <ul style="font-size:13px; color:#5a5a7a; margin:4px 0 0 0; padding-left:20px; line-height:1.6;">
                <li>Verify the driver's name and vehicle before getting in</li>
                <li>Share your trip status with friends or family</li>
                <li>Contact support if you feel unsafe</li>
              </ul>
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
              in your rider settings.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
