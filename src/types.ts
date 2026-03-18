export type UserRole = 'super_admin' | 'ledger_admin' | 'auditor' | 'collector' | 'readonly';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
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

export interface Order {
  id: string;
  ledgerId: string;
  customerId: string;
  principal: number;
  interestRate: number; // monthly or annual? let's assume monthly for now
  termDays: number;
  startDate: string;
  dueDate: string;
  status: OrderStatus;
  paidAmount?: number; // Track partial or full payments
  collectorUid?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  ledgerId: string;
  uid: string;
  action: string;
  targetId: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
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
