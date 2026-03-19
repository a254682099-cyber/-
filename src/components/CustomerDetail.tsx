import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ledgerService } from '../services/ledgerService';
import { 
  ArrowLeft, 
  Phone, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Edit2,
  Trash2,
  X,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { auth } from '../firebase';

export const CustomerDetail: React.FC = () => {
  const { ledgerId, customerId } = useParams<{ ledgerId: string; customerId: string }>();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    if (!ledgerId || !customerId) return;
    
    // Fetch ledger for RBAC
    const unsubLedger = ledgerService.subscribeToLedger(ledgerId, setLedger);

    // Fetch customer data
    const unsubCustomers = ledgerService.subscribeToCustomers(ledgerId, (customers) => {
      const found = customers.find(c => c.id === customerId);
      setCustomer(found);
      if (found) setEditData(found);
    });

    // Fetch customer orders
    const unsubOrders = ledgerService.subscribeToOrders(ledgerId, (allOrders) => {
      const customerOrders = allOrders.filter(o => o.customerId === customerId);
      setOrders(customerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });

    return () => {
      unsubLedger();
      unsubCustomers();
      unsubOrders();
    };
  }, [ledgerId, customerId]);

  const userRole = ledger?.roles?.[auth.currentUser?.uid || ''] || (ledger?.ownerUid === auth.currentUser?.uid ? 'ledger_admin' : 'readonly');
  const canEdit = ['ledger_admin', 'collector'].includes(userRole);
  const canDelete = ['ledger_admin'].includes(userRole);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerId || !customerId) return;
    await ledgerService.updateCustomer(ledgerId, customerId, editData);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!ledgerId || !customerId) return;
    if (orders.length > 0) {
      alert('Cannot delete customer with existing orders.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this customer?')) {
      await ledgerService.deleteCustomer(ledgerId, customerId);
      navigate(`/ledger/${ledgerId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'pending_approval': return 'bg-amber-100 text-amber-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-500">Loading customer details...</div>;
  if (!customer) return <div className="text-center py-20 text-neutral-500">Customer not found.</div>;

  const totalBorrowed = orders.reduce((sum, o) => sum + (o.principal || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/ledger/${ledgerId}`)}
            className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors font-medium bg-white rounded-full shadow-sm border border-neutral-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">{customer.name}</h2>
            <p className="text-sm text-neutral-500">Customer Profile</p>
          </div>
        </div>

        <div className="flex gap-3">
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-neutral-700 font-semibold rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors shadow-sm"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 font-semibold rounded-xl border border-red-100 hover:bg-red-50 transition-colors shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Customer Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
            <div className="w-24 h-24 bg-neutral-100 rounded-3xl flex items-center justify-center text-neutral-400 mb-6 mx-auto">
              {customer.photoUrl ? (
                <img src={customer.photoUrl} alt={customer.name} className="w-full h-full object-cover rounded-3xl" referrerPolicy="no-referrer" />
              ) : (
                <CreditCard className="w-10 h-10" />
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-neutral-600">
                <Phone className="w-5 h-5 text-neutral-400" />
                <span className="font-medium">{customer.phone || 'No phone'}</span>
              </div>
              <div className="flex items-center gap-3 text-neutral-600">
                <CreditCard className="w-5 h-5 text-neutral-400" />
                <span className="font-medium">{customer.idCard || 'No ID Card'}</span>
              </div>
              <div className="flex items-center gap-3 text-neutral-600">
                <Calendar className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-sm">Joined {format(new Date(customer.createdAt), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-600 p-8 rounded-3xl shadow-lg text-white">
            <h4 className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-4">Summary</h4>
            <div className="space-y-4">
              <div>
                <p className="text-emerald-200 text-xs mb-1">Total Borrowed</p>
                <p className="text-2xl font-bold">${totalBorrowed.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-emerald-200 text-xs mb-1">Total Paid</p>
                <p className="text-2xl font-bold">${totalPaid.toLocaleString()}</p>
              </div>
              <div className="pt-4 border-t border-emerald-500">
                <p className="text-emerald-200 text-xs mb-1">Outstanding Balance</p>
                <p className="text-2xl font-bold text-amber-300">${(totalBorrowed - totalPaid).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Loan History */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Loan History
          </h3>
          
          <div className="space-y-4">
            {orders.map((order) => {
              const calculatedInterest = (order.principal || 0) * (order.interestRate || 0) / 100;
              const totalDue = (order.principal || 0) + calculatedInterest;
              const currentPaid = order.paidAmount || 0;
              const progress = Math.min(100, Math.round((currentPaid / totalDue) * 100)) || 0;

              return (
                <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-6 flex-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getStatusColor(order.status)} shrink-0`}>
                      {order.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-neutral-900">${order.principal.toLocaleString()}</span>
                        <span className="text-xs font-bold text-emerald-600">+{order.interestRate}%</span>
                      </div>
                      <p className="text-xs text-neutral-500 mb-3">
                        Started {format(new Date(order.startDate), 'MMM dd, yyyy')}
                      </p>
                      <div className="w-full max-w-xs bg-neutral-100 rounded-full h-2 mb-1">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                        {progress}% Paid
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </div>
                    <button 
                      onClick={() => navigate(`/ledger/${ledgerId}`)}
                      className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 rotate-180" />
                    </button>
                  </div>
                </div>
              );
            })}
            {orders.length === 0 && (
              <div className="py-20 text-center text-neutral-400 bg-white rounded-3xl border border-dashed border-neutral-200">
                No loan history found for this customer.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={() => setIsEditing(false)} className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-900">
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-2xl font-bold text-neutral-900 mb-6">Edit Customer</h3>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">ID Card</label>
                  <input
                    type="text"
                    value={editData.idCard}
                    onChange={(e) => setEditData({ ...editData, idCard: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Photo URL</label>
                  <input
                    type="text"
                    value={editData.photoUrl}
                    onChange={(e) => setEditData({ ...editData, photoUrl: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
