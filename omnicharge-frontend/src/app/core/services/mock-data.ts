import { AuthResponse, User } from '../models/user.model';
import { Operator, Plan, OperatorDetectionResponse } from '../models/operator.model';
import { Notification } from '../models/notification.model';

// ── Demo Users ─────────────────────────────────────────────
export const MOCK_USER: User = {
  id: 1,
  fullName: 'Demo User',
  email: 'demo@omnicharge.com',
  mobileNumber: '9876543210',
  role: 'ROLE_USER',
  authProvider: 'PHONE',
  isActive: true,
  createdAt: '2025-01-01T00:00:00',
  updatedAt: '2025-01-01T00:00:00'
};

export const MOCK_ADMIN: User = {
  id: 2,
  fullName: 'Admin',
  email: 'admin@omnicharge.com',
  mobileNumber: '8688179553',
  role: 'ROLE_ADMIN',
  authProvider: 'PHONE',
  isActive: true,
  createdAt: '2025-01-01T00:00:00',
  updatedAt: '2025-01-01T00:00:00'
};

export const MOCK_AUTH_RESPONSE: AuthResponse = {
  accessToken: 'mock-jwt-token-demo-omnicharge',
  refreshToken: 'mock-refresh-token-demo-omnicharge',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: MOCK_USER
};

// ── 1000+ Users Generator ──────────────────────────────────
const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Sai', 'Arnav', 'Dhruv', 'Kabir',
  'Ananya', 'Diya', 'Myra', 'Saanvi', 'Aanya', 'Aadhya', 'Isha', 'Kiara', 'Riya', 'Priya',
  'Rohan', 'Karthik', 'Manish', 'Suresh', 'Rajesh', 'Vikram', 'Anil', 'Sanjay', 'Deepak', 'Amit',
  'Sneha', 'Pooja', 'Neha', 'Swati', 'Kavya', 'Meera', 'Nisha', 'Divya', 'Ankita', 'Pallavi',
  'Rahul', 'Nikhil', 'Varun', 'Ishaan', 'Yash', 'Kunal', 'Pranav', 'Harsh', 'Mohit', 'Gaurav',
  'Shruti', 'Tanvi', 'Radhika', 'Sakshi', 'Kriti', 'Bhavna', 'Jyoti', 'Rashmi', 'Simran', 'Tanya',
  'Akash', 'Naveen', 'Pavan', 'Siddharth', 'Vishal', 'Rakesh', 'Tarun', 'Hemant', 'Ashish', 'Girish',
  'Lakshmi', 'Gayathri', 'Revathi', 'Sowmya', 'Bhargavi', 'Harini', 'Lavanya', 'Keerthi', 'Ramya', 'Vaishnavi'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Reddy', 'Kumar', 'Singh', 'Nair', 'Gupta', 'Joshi', 'Verma', 'Rao',
  'Iyer', 'Menon', 'Das', 'Pillai', 'Rajan', 'Bhat', 'Hegde', 'Kulkarni', 'Deshmukh', 'Naik',
  'Choudhary', 'Trivedi', 'Mishra', 'Pandey', 'Saxena', 'Mehta', 'Shah', 'Agarwal', 'Bansal', 'Kapoor',
  'Malhotra', 'Srivastava', 'Chakraborty', 'Bose', 'Sen', 'Mukherjee', 'Ghosh', 'Dutta', 'Bhatt', 'Jain'
];

const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'rediffmail.com'];
const AUTH_PROVIDERS: ('PHONE' | 'GOOGLE')[] = ['PHONE', 'GOOGLE'];

function generateMockUsers(count: number): User[] {
  const users: User[] = [
    MOCK_ADMIN,
    MOCK_USER,
    { id: 3, fullName: 'Rahul Sharma', email: 'rahul@gmail.com', mobileNumber: '7012345678', role: 'ROLE_USER', authProvider: 'PHONE', isActive: true, createdAt: '2025-02-15T00:00:00', updatedAt: '2025-02-15T00:00:00' },
    { id: 4, fullName: 'Priya Nair', email: 'priya@gmail.com', mobileNumber: '8012345678', role: 'ROLE_USER', authProvider: 'GOOGLE', isActive: true, createdAt: '2025-03-10T00:00:00', updatedAt: '2025-03-10T00:00:00' },
    { id: 5, fullName: 'Arjun Reddy', email: 'arjun@gmail.com', mobileNumber: '9412345678', role: 'ROLE_USER', authProvider: 'PHONE', isActive: false, createdAt: '2025-04-01T00:00:00', updatedAt: '2025-04-01T00:00:00' },
  ];

  for (let i = 6; i <= count + 5; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const domain = EMAIL_DOMAINS[i % EMAIL_DOMAINS.length];
    const authProvider = AUTH_PROVIDERS[i % AUTH_PROVIDERS.length];

    // Generate a realistic 10-digit Indian mobile number (starting with 6-9)
    const prefix = ['6', '7', '8', '9'][i % 4];
    const mobile = prefix + String(1000000000 + ((i * 7919) % 900000000)).substring(1);

    // Spread dates across 2024-2026
    const dayOffset = i % 730;
    const createdDate = new Date(2024, 0, 1);
    createdDate.setDate(createdDate.getDate() + dayOffset);
    const dateStr = createdDate.toISOString();

    users.push({
      id: i,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`,
      mobileNumber: mobile,
      role: 'ROLE_USER',
      authProvider,
      isActive: i % 10 !== 0, // ~10% inactive
      createdAt: dateStr,
      updatedAt: dateStr
    });
  }

  return users;
}

export const MOCK_ALL_USERS: User[] = generateMockUsers(1050);

// ── Operators ──────────────────────────────────────────────
export const MOCK_OPERATORS: Operator[] = [
  { id: 1, name: 'Jio', code: 'JIO', isActive: true, createdAt: '2025-01-01T00:00:00', updatedAt: '2025-01-01T00:00:00' },
  { id: 2, name: 'Airtel', code: 'AIRTEL', isActive: true, createdAt: '2025-01-01T00:00:00', updatedAt: '2025-01-01T00:00:00' },
  { id: 3, name: 'Vi (Vodafone Idea)', code: 'VI', isActive: true, createdAt: '2025-01-01T00:00:00', updatedAt: '2025-01-01T00:00:00' },
  { id: 4, name: 'BSNL', code: 'BSNL', isActive: true, createdAt: '2025-01-01T00:00:00', updatedAt: '2025-01-01T00:00:00' }
];

const OPERATOR_PREFIXES: Record<string, number> = {
  '70': 1, '71': 1, '72': 1, '73': 1, '74': 1, '75': 1, '76': 1,
  '77': 2, '78': 2, '79': 2, '80': 2, '81': 2, '82': 2,
  '83': 3, '84': 3, '85': 3, '86': 3, '87': 3,
  '94': 4, '95': 4, '96': 4, '944': 4
};

export function detectMockOperator(mobileNumber: string): OperatorDetectionResponse {
  const cleaned = mobileNumber.replace(/[\s+\-()]/g, '');
  const digits = cleaned.startsWith('91') ? cleaned.substring(2) : cleaned;
  const prefix2 = digits.substring(0, 2);
  const operatorId = OPERATOR_PREFIXES[prefix2] ?? 1;
  const operator = MOCK_OPERATORS.find(o => o.id === operatorId)!;
  return { mobileNumber, operator, detectionMethod: 'PREFIX_MATCH' };
}

// ── Plans per operator ─────────────────────────────────────
const basePlan = (id: number, opId: number, opName: string, name: string, price: number, validity: number, data: string, desc: string, cat: string): Plan => ({
  id, operatorId: opId, operatorName: opName, name, price, validity, data, description: desc,
  category: cat, isActive: true, createdAt: '2025-01-01T00:00:00', updatedAt: '2025-01-01T00:00:00'
});

export const MOCK_PLANS: Record<number, Plan[]> = {
  1: [
    basePlan(101, 1, 'Jio', 'Jio Popular', 239, 28, '1.5 GB/day', 'Unlimited calls + 100 SMS/day', 'Popular'),
    basePlan(102, 1, 'Jio', 'Jio Data', 299, 28, '2 GB/day', 'Unlimited calls + 100 SMS/day', 'Data'),
    basePlan(103, 1, 'Jio', 'Jio Annual', 2999, 365, '2.5 GB/day', 'Unlimited calls + 100 SMS/day', 'Annual'),
    basePlan(104, 1, 'Jio', 'Jio Value', 149, 24, '1 GB/day', 'Unlimited calls + data', 'Value'),
  ],
  2: [
    basePlan(201, 2, 'Airtel', 'Airtel Smart', 265, 28, '1 GB/day', 'Unlimited calls + 100 SMS/day', 'Popular'),
    basePlan(202, 2, 'Airtel', 'Airtel Max', 359, 28, '2 GB/day', 'Unlimited calls + Disney+ Hotstar', 'Entertainment'),
    basePlan(203, 2, 'Airtel', 'Airtel Annual', 3359, 365, '2 GB/day', 'Unlimited calls + 100 SMS/day', 'Annual'),
  ],
  3: [
    basePlan(301, 3, 'Vi (Vodafone Idea)', 'Vi Hero', 269, 28, '1.5 GB/day', 'Unlimited calls + 100 SMS/day', 'Popular'),
    basePlan(302, 3, 'Vi (Vodafone Idea)', 'Vi Max', 359, 56, '1.5 GB/day', 'Unlimited calls + Vi Movies', 'Entertainment'),
  ],
  4: [
    basePlan(401, 4, 'BSNL', 'BSNL Value', 187, 28, '2 GB/day', 'Unlimited calls + 100 SMS/day', 'Value'),
    basePlan(402, 4, 'BSNL', 'BSNL Super', 397, 60, '2 GB/day', 'Unlimited calls + 100 SMS/day', 'Popular'),
  ]
};

// ── Mock Notifications ─────────────────────────────────────
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1, userId: 1, title: 'Welcome to OmniCharge!', message: 'Start your first recharge today.',
    type: 'IN_APP', category: 'SYSTEM', isRead: true, metadata: null,
    createdDate: '2025-03-25T10:00:00', updatedAt: '2025-03-25T10:00:00'
  }
];
