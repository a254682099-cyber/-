export type UserRole = 'super_admin' | 'admin' | 'staff' | 'ledger_admin' | 'auditor' | 'collector' | 'readonly' | 'client';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  accessibleLedgerIds?: string[];
  createdAt: string;
}

export interface LedgerMember {
  uid: string;
  role: UserRole;
}

export interface Ledger {
  id: string;
  name: string;
  ownerUid: string;
  members: LedgerMember[];
  createdAt: string;
}

export interface Customer {
  id: string;
  ledgerId: string;
  name: string;
  phone?: string;
  idCard?: string;
  photoUrl?: string;
  createdAt: string;
}

export type OrderStatus = 'pending_approval' | 'active' | 'overdue' | 'completed' | 'cancelled';
export type InterestInterval = 'daily' | 'weekly' | 'monthly' | 'once';

export type CollectionTaskStatus = 'pending' | 'notified' | 'collected' | 'other';
export type CollectionTaskType = 'principal' | 'interest';

export interface CollectionTask {
  id: string;
  orderId: string;
  ledgerId: string;
  date: string; // YYYY-MM-DD
  type: CollectionTaskType;
  status: CollectionTaskStatus;
  updatedAt: string;
}

export interface Order {
  id: string;
  ledgerId: string;
  customerId: string;
  principal: number;
  interestRate: number; 
  interestInterval: InterestInterval;
  termDays: number;
  startDate: string;
  dueDate: string;
  status: OrderStatus;
  paidAmount?: number;
  collectorUid?: string;
  notes?: any[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  ledgerId: string;
  uid: string;
  userName?: string;
  action: string;
  targetId: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export type PaymentType = 'interest' | 'principal';

export interface Payment {
  id: string;
  orderId: string;
  ledgerId: string;
  amount: number;
  type: PaymentType;
  timestamp: string;
  uid: string;
  userName?: string;
}

export interface SystemMember {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  accessibleLedgerIds: string[];
  createdAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
