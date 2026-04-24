export interface Operator {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: number;
  operatorId: number;
  operatorName: string;
  name: string;
  price: number;
  validity: number;
  data: string;
  description: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorDetectionResponse {
  mobileNumber: string;
  operator: Operator;
  detectionMethod: string;
}
