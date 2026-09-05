import z from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*]/, "Password must contain at least one special character");

export const registerSchema = z.object({
  fullName: z.string().min(2, { message: "name is required" }),
  email: z.string().email("Invalid email address").lowercase(),
  phone: z.string().min(9, "phone is required"),
  password: passwordSchema,
});

export const registerDriverSchema = z.object({
  licenseNo: z.string().min(2, "license Numebr is required"),
  vehiclePlate: z.string().min(2, "vehicle plate is required"),
});

export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  code: z.string().min(6, "Please enter 6 digit code").max(6),
});

export const resendEmailVerificationSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, { message: "Password is required" }),
});

export const forgetPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().min(1, "token is required"),
  newPassword: passwordSchema,
});

export const updateDriverStatus = z.object({
  status: z.boolean(),
});

export const logoutSchema = z.object({
  accessToken: z.string().min(1, "access Token is required"),
});

export type IRegisterInput = z.infer<typeof registerSchema>;
export type ICreateDriverInput = z.infer<typeof registerDriverSchema>;
export type IVerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type IResendEmailVerificationInput = z.infer<
  typeof resendEmailVerificationSchema
>;
export type ILoginInput = z.infer<typeof loginSchema>;
export type IForgetPasswordInput = z.infer<typeof forgetPasswordSchema>;
export type IResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type IUpateDriverOnlineStatusInput = z.infer<typeof updateDriverStatus>;
export type ILogoutInput = z.infer<typeof logoutSchema>;
