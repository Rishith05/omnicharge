export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'EMAIL' | 'SMS' | 'IN_APP';
  category: string;
  isRead: boolean;
  metadata: any;
  createdDate: string;
  updatedAt: string;
}
