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
  // Notifications
  async createNotification(ledgerId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') {
    const path = 'notifications';
    try {
      // Get ledger members to notify them
      const ledgerRef = doc(db, 'ledgers', ledgerId);
      const ledgerSnap = await getDoc(ledgerRef);
      if (!ledgerSnap.exists()) return;
      
      const memberUids = ledgerSnap.data().memberUids || [];
      const ownerUid = ledgerSnap.data().ownerUid;
      const allUids = Array.from(new Set([...memberUids, ownerUid]));
      
      // Create notification for each member except the current user
      const promises = allUids
        .filter(uid => uid !== auth.currentUser?.uid)
        .map(uid => addDoc(collection(db, path), {
          uid,
          ledgerId,
          title,
          message,
          type,
          read: false,
          timestamp: new Date().toISOString()
        }));
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to create notifications', error);
    }
  },

  subscribeToNotifications(callback: (notifications: any[]) => void) {
    if (!auth.currentUser) return () => {};
    const path = 'notifications';
    const q = query(
      collection(db, path), 
      where('uid', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(notifications);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async markNotificationAsRead(notificationId: string) {
    const path = `notifications/${notificationId}`;
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async markAllNotificationsAsRead() {
    if (!auth.currentUser) return;
    const path = 'notifications';
    try {
      const q = query(
        collection(db, path), 
        where('uid', '==', auth.currentUser.uid),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      const promises = snapshot.docs.map(d => updateDoc(d.ref, { read: true }));
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

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
    if (!auth.currentUser) throw new Error('未认证');
    const path = 'ledgers';
    try {
      const docRef = await addDoc(collection(db, path), {
        name,
        ownerUid: auth.currentUser.uid,
        members: [],
        memberUids: [auth.currentUser.uid],
        roles: { [auth.currentUser.uid]: 'ledger_admin' },
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
    
    // Subscribe to ledgers where user is in memberUids
    const q = query(collection(db, path), where('memberUids', 'array-contains', auth.currentUser.uid));
    
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

  async updateLedger(ledgerId: string, name: string) {
    const path = `ledgers/${ledgerId}`;
    try {
      await updateDoc(doc(db, 'ledgers', ledgerId), { name });
      await this.logAction(ledgerId, 'UPDATE_LEDGER', ledgerId, '', name);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteLedger(ledgerId: string) {
    const path = `ledgers/${ledgerId}`;
    try {
      // In a real app, you might want to delete all sub-collections too
      // But for simplicity, we'll just delete the ledger doc
      await deleteDoc(doc(db, 'ledgers', ledgerId));
      await this.logAction(ledgerId, 'DELETE_LEDGER', ledgerId, '', '');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async addMemberByEmail(ledgerId: string, email: string, role: UserRole) {
    const path = `ledgers/${ledgerId}`;
    try {
      // Find user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error('未找到使用此电子邮件的用户。');
      }
      
      const userDoc = snapshot.docs[0];
      const uid = userDoc.id;
      
      const ledgerRef = doc(db, 'ledgers', ledgerId);
      const ledgerSnap = await getDoc(ledgerRef);
      if (!ledgerSnap.exists()) throw new Error('未找到账本');
      
      const members = ledgerSnap.data().members || [];
      if (members.find((m: any) => m.uid === uid)) {
        throw new Error('用户已经是成员');
      }
      
      const newMembers = [...members, { uid, role, email: userDoc.data().email, name: userDoc.data().displayName }];
      const newMemberUids = [...(ledgerSnap.data().memberUids || [ledgerSnap.data().ownerUid]), uid];
      const newRoles = { ...(ledgerSnap.data().roles || {}), [uid]: role };
      
      await updateDoc(ledgerRef, { 
        members: newMembers, 
        memberUids: newMemberUids,
        roles: newRoles
      });
      await this.logAction(ledgerId, 'ADD_MEMBER', uid, '', role);
      const roleName = role === 'ledger_admin' ? '账本管理员' : role === 'auditor' ? '审计员' : role === 'collector' ? '收款员' : '只读';
      await this.createNotification(ledgerId, '已添加新成员', `${userDoc.data().displayName} 已作为 ${roleName} 添加到账本。`, 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async removeMember(ledgerId: string, uid: string) {
    const path = `ledgers/${ledgerId}`;
    try {
      const ledgerRef = doc(db, 'ledgers', ledgerId);
      const ledgerSnap = await getDoc(ledgerRef);
      if (!ledgerSnap.exists()) throw new Error('未找到账本');
      
      const members = ledgerSnap.data().members || [];
      const newMembers = members.filter((m: any) => m.uid !== uid);
      const newMemberUids = (ledgerSnap.data().memberUids || []).filter((id: string) => id !== uid);
      const newRoles = { ...(ledgerSnap.data().roles || {}) };
      delete newRoles[uid];
      
      await updateDoc(ledgerRef, { 
        members: newMembers, 
        memberUids: newMemberUids,
        roles: newRoles
      });
      await this.logAction(ledgerId, 'REMOVE_MEMBER', uid, '', '');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateMemberRole(ledgerId: string, uid: string, newRole: UserRole) {
    const path = `ledgers/${ledgerId}`;
    try {
      const ledgerRef = doc(db, 'ledgers', ledgerId);
      const ledgerSnap = await getDoc(ledgerRef);
      if (!ledgerSnap.exists()) throw new Error('未找到账本');
      
      const members = ledgerSnap.data().members || [];
      const newMembers = members.map((m: any) => m.uid === uid ? { ...m, role: newRole } : m);
      const newRoles = { ...(ledgerSnap.data().roles || {}), [uid]: newRole };
      
      await updateDoc(ledgerRef, { 
        members: newMembers, 
        roles: newRoles
      });
      await this.logAction(ledgerId, 'UPDATE_MEMBER_ROLE', uid, '', newRole);
      const roleName = newRole === 'ledger_admin' ? '账本管理员' : newRole === 'auditor' ? '审计员' : newRole === 'collector' ? '收款员' : '只读';
      await this.createNotification(ledgerId, '角色已更新', `您在账本中的角色已更新为 ${roleName}。`, 'info');
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

  async updateCustomer(ledgerId: string, customerId: string, data: any) {
    const path = `customers/${customerId}`;
    try {
      await updateDoc(doc(db, 'customers', customerId), data);
      await this.logAction(ledgerId, 'UPDATE_CUSTOMER', customerId, '', data.name);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteCustomer(ledgerId: string, customerId: string) {
    const path = `customers/${customerId}`;
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      await this.logAction(ledgerId, 'DELETE_CUSTOMER', customerId, '', '');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
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
      await this.createNotification(ledgerId, '已创建新订单', `已创建一笔 $${data.principal} 的新订单，正在等待审批。`, 'warning');
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

  async updateOrder(ledgerId: string, orderId: string, data: any) {
    const path = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), data);
      await this.logAction(ledgerId, 'UPDATE_ORDER', orderId, '', '订单详情已更新');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateOrderStatus(ledgerId: string, orderId: string, oldStatus: string, newStatus: string) {
    const path = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      await this.logAction(ledgerId, 'UPDATE_ORDER_STATUS', orderId, oldStatus, newStatus);
      const statusMap: { [key: string]: string } = {
        'pending_approval': '待审批',
        'active': '进行中',
        'overdue': '已逾期',
        'completed': '已完成',
        'cancelled': '已取消'
      };
      const statusName = statusMap[newStatus] || newStatus;
      await this.createNotification(ledgerId, '订单状态已更新', `订单 #${orderId.slice(0, 8)} 的状态已更改为 ${statusName}。`, 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async recordPayment(ledgerId: string, orderId: string, amount: number, currentPaid: number = 0) {
    const path = `orders/${orderId}`;
    try {
      const newPaid = currentPaid + amount;
      await updateDoc(doc(db, 'orders', orderId), { paidAmount: newPaid });
      
      // Add to payments subcollection
      const paymentsRef = collection(db, `orders/${orderId}/payments`);
      await addDoc(paymentsRef, {
        amount,
        timestamp: new Date().toISOString(),
        uid: auth.currentUser?.uid,
      });

      await this.logAction(ledgerId, 'RECORD_PAYMENT', orderId, currentPaid.toString(), newPaid.toString());
      await this.createNotification(ledgerId, '已记录付款', `已为订单 #${orderId.slice(0, 8)} 记录了一笔 $${amount} 的付款。`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  subscribeToPayments(orderId: string, callback: (payments: any[]) => void) {
    const path = `orders/${orderId}/payments`;
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(payments);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async deletePayment(ledgerId: string, orderId: string, paymentId: string, amount: number, currentPaid: number) {
    const path = `orders/${orderId}/payments/${paymentId}`;
    try {
      const newPaid = Math.max(0, currentPaid - amount);
      await updateDoc(doc(db, 'orders', orderId), { paidAmount: newPaid });
      
      await deleteDoc(doc(db, `orders/${orderId}/payments`, paymentId));

      await this.logAction(ledgerId, 'DELETE_PAYMENT', orderId, currentPaid.toString(), newPaid.toString());
      await this.createNotification(ledgerId, '已删除付款', `已删除订单 #${orderId.slice(0, 8)} 的一笔 $${amount} 的付款。`, 'warning');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async updateOrderNotes(ledgerId: string, orderId: string, notes: any[]) {
    const path = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), { notes });
      await this.logAction(ledgerId, 'UPDATE_ORDER_NOTES', orderId, '', '备注已更新');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteOrder(ledgerId: string, orderId: string) {
    const path = `orders/${orderId}`;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      await this.logAction(ledgerId, 'DELETE_ORDER', orderId, '', '');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
