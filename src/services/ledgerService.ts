import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { OperationType, FirestoreErrorInfo, UserRole } from '../types';

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const ledgerService = {
  // Audit Logs
  async logAction(ledgerId: string, action: string, targetId: string, oldValue?: string, newValue?: string) {
    if (!auth.currentUser) return;
    const path = 'auditLogs';
    try {
      await addDoc(collection(db, path), {
        ledgerId,
        uid: auth.currentUser.uid,
        action,
        targetId,
        oldValue: oldValue || null,
        newValue: newValue || null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to write audit log', error);
    }
  },

  subscribeToAuditLogs(ledgerId: string, callback: (logs: any[]) => void) {
    const path = 'auditLogs';
    const q = query(collection(db, path), where('ledgerId', '==', ledgerId), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Ledgers
  async createLedger(name: string) {
    if (!auth.currentUser) throw new Error('Not authenticated');
    const path = 'ledgers';
    try {
      const docRef = await addDoc(collection(db, path), {
        name,
        ownerUid: auth.currentUser.uid,
        members: [],
        createdAt: new Date().toISOString()
      });
      await this.logAction(docRef.id, 'CREATE_LEDGER', docRef.id, '', name);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  subscribeToLedgers(callback: (ledgers: any[]) => void) {
    if (!auth.currentUser) return () => {};
    const path = 'ledgers';
    // We should ideally query where ownerUid == uid OR members contains uid.
    // Firestore requires separate queries or an 'in' array if we denormalize.
    // For MVP, let's just fetch where ownerUid == uid.
    const q = query(collection(db, path), where('ownerUid', '==', auth.currentUser.uid));
    return onSnapshot(q, (snapshot) => {
      const ledgers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(ledgers);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToLedger(ledgerId: string, callback: (ledger: any) => void) {
    const path = `ledgers/${ledgerId}`;
    return onSnapshot(doc(db, 'ledgers', ledgerId), (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async addMemberByEmail(ledgerId: string, email: string, role: UserRole) {
    const path = `ledgers/${ledgerId}`;
    try {
      // Find user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error('User not found with this email.');
      }
      
      const userDoc = snapshot.docs[0];
      const uid = userDoc.id;
      
      const ledgerRef = doc(db, 'ledgers', ledgerId);
      const ledgerSnap = await getDoc(ledgerRef);
      if (!ledgerSnap.exists()) throw new Error('Ledger not found');
      
      const members = ledgerSnap.data().members || [];
      if (members.find((m: any) => m.uid === uid)) {
        throw new Error('User is already a member');
      }
      
      const newMembers = [...members, { uid, role, email: userDoc.data().email, name: userDoc.data().displayName }];
      await updateDoc(ledgerRef, { members: newMembers });
      await this.logAction(ledgerId, 'ADD_MEMBER', uid, '', role);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Customers
  async addCustomer(ledgerId: string, data: any) {
    const path = 'customers';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...data,
        ledgerId,
        createdAt: new Date().toISOString()
      });
      await this.logAction(ledgerId, 'ADD_CUSTOMER', docRef.id, '', data.name);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  subscribeToCustomers(ledgerId: string, callback: (customers: any[]) => void) {
    const path = 'customers';
    const q = query(collection(db, path), where('ledgerId', '==', ledgerId));
    return onSnapshot(q, (snapshot) => {
      const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(customers);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Orders
  async createOrder(ledgerId: string, data: any) {
    const path = 'orders';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...data,
        ledgerId,
        status: 'pending_approval',
        createdAt: new Date().toISOString()
      });
      await this.logAction(ledgerId, 'CREATE_ORDER', docRef.id, '', 'pending_approval');
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  subscribeToOrders(ledgerId: string, callback: (orders: any[]) => void) {
    const path = 'orders';
    const q = query(collection(db, path), where('ledgerId', '==', ledgerId));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(orders);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async updateOrderStatus(ledgerId: string, orderId: string, oldStatus: string, newStatus: string) {
    const path = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      await this.logAction(ledgerId, 'UPDATE_ORDER_STATUS', orderId, oldStatus, newStatus);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
