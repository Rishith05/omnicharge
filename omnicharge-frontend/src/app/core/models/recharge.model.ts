export interface Recharge {
  id: number;
  rechargeId: string;
  userId: number;
  mobileNumber: string;
  operatorId: number;
  operatorName: string;
  planId: number;
  planName: string;
  amount: number;
  status: 'INITIATED' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  failureReason?: string;
  transactionId: string;
  planValidityDays?: number;
  planExpiryDate?: string;
  createdDate: string;
  lastModifiedDate?: string;
}

export interface RechargeRequest {
  mobileNumber: string;
  planId: number;
  paymentMethod: string;
}

/**
 * Aligned with backend TransactionResponse DTO.
 * Backend fields: id, transactionId, rechargeId (String), userId, amount,
 *   paymentMethod, status, failureReason, razorpayOrderId,
 *   userEmail, userMobile, mobileNumber, operatorName, planName, createdDate
 */
export interface Transaction {
  id: number;
  transactionId: string;
  rechargeId: string | number;
  userId: number;
  amount: number;
  paymentMethod: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  failureReason?: string;
  razorpayOrderId?: string;
  userEmail?: string;
  userMobile?: string;
  mobileNumber?: string;
  operatorName?: string;
  planName?: string;
  createdDate: string;
}
