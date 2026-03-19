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
import { OperationType, FirestoreErrorInfo, SystemMember, UserRole } from '../types';

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

export const memberService = {
  async createSystemMember(data: {
    username: string;
    password: string;
    displayName: string;
    role: UserRole;
    accessibleLedgerIds: string[];
  }) {
    const path = 'systemMembers';
    try {
      // Check if username exists
      const q = query(collection(db, path), where('username', '==', data.username));
      const snap = await getDocs(q);
      if (!snap.empty) throw new Error('用户名已存在');

      const docRef = await addDoc(collection(db, path), {
        ...data,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateSystemMember(memberId: string, data: Partial<SystemMember>) {
    const path = `systemMembers/${memberId}`;
    try {
      await updateDoc(doc(db, 'systemMembers', memberId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteSystemMember(memberId: string) {
    const path = `systemMembers/${memberId}`;
    try {
      await deleteDoc(doc(db, 'systemMembers', memberId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  subscribeToSystemMembers(callback: (members: SystemMember[]) => void) {
    const path = 'systemMembers';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemMember));
      callback(members);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async getSystemMemberByUsername(username: string) {
    const path = 'systemMembers';
    try {
      const q = query(collection(db, path), where('username', '==', username));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as SystemMember;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async loginMember(username: string, password: string): Promise<SystemMember> {
    const member = await this.getSystemMemberByUsername(username);
    if (!member) throw new Error('用户不存在');
    if (member.password !== password) throw new Error('密码错误');
    return member;
  }
};
