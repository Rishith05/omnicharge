export interface User {
  id: number;
  fullName: string;
  email: string;
  mobileNumber: string;
  role: 'ROLE_USER' | 'ROLE_ADMIN';
  authProvider: 'LOCAL' | 'GOOGLE' | 'PHONE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Phone OTP login (replaces email/password)
export interface SendOtpRequest {
  mobileNumber: string;
}

export interface VerifyPhoneOtpRequest {
  mobileNumber: string;
  otp: string;
  fullName?: string;
}

// Kept for backward compatibility
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  mobileNumber: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
  isNewUser?: boolean;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  mobileNumber: string;
  email?: string;
}
