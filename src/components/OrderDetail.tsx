import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ledgerService } from '../services/ledgerService';
import { 
  ArrowLeft, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  MessageSquare,
  History,
  TrendingUp,
  User,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { auth } from '../firebase';

import { EditOrderModal } from './EditOrderModal';
import { PaymentModal } from './PaymentModal';

export const OrderDetail: React.FC = () => {
  const { ledgerId, orderId } = useParams<{ ledgerId: string; orderId: string }>();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  useEffect(() => {
    if (!ledgerId || !orderId) return;
    
    const unsubLedger = ledgerService.subscribeToLedger(ledgerId, setLedger);

    const unsubOrders = ledgerService.subscribeToOrders(ledgerId, (orders) => {
      const found = orders.find(o => o.id === orderId);
      setOrder(found);
      if (found) {
        ledgerService.subscribeToCustomers(ledgerId, (customers) => {
          setCustomer(customers.find(c => c.id === found.customerId));
        });
      }
    });

    const unsubPayments = ledgerService.subscribeToPayments(orderId, setPayments);

    setLoading(false);

    return () => {
      unsubLedger();
      unsubOrders();
      unsubPayments();
    };
  }, [ledgerId, orderId]);

  const userRole = ledger?.roles?.[auth.currentUser?.uid || ''] || (ledger?.ownerUid === auth.currentUser?.uid ? 'ledger_admin' : 'readonly');
  const canManage = ['ledger_admin', 'collector', 'auditor'].includes(userRole);
  const canRecordPayments = ['ledger_admin', 'collector'].includes(userRole);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !orderId || !ledgerId) return;
    
    const updatedNotes = [...(order.notes || []), {
      text: newNote,
      timestamp: new Date().toISOString(),
      uid: auth.currentUser?.uid,
      authorName: auth.currentUser?.displayName || 'User'
    }];

    await ledgerService.updateOrderNotes(ledgerId, orderId, updatedNotes);
    setNewNote('');
  };

  const handleDeletePayment = async (paymentId: string, amount: number) => {
    if (!ledgerId || !orderId) return;
    if (window.confirm(`您确定要删除这笔付款 $${amount} 吗？`)) {
      await ledgerService.deletePayment(ledgerId, orderId, paymentId, amount, order.paidAmount || 0);
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '活跃';
      case 'overdue': return '逾期';
      case 'completed': return '已完成';
      case 'pending_approval': return '待审批';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-500">正在加载订单详情...</div>;
  if (!order) return <div className="text-center py-20 text-neutral-500">未找到订单。</div>;

  const calculatedInterest = (order.principal || 0) * (order.interestRate || 0) / 100;
  const totalDue = (order.principal || 0) + calculatedInterest;
  const currentPaid = order.paidAmount || 0;
  const progress = Math.min(100, Math.round((currentPaid / totalDue) * 100)) || 0;

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
            <h2 className="text-2xl font-bold text-neutral-900">订单详情</h2>
            <p className="text-sm text-neutral-500">ID: #{order.id.slice(0, 8)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {canRecordPayments && order.status !== 'completed' && order.status !== 'cancelled' && (
            <button
              onClick={() => setIsRecordingPayment(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <DollarSign className="w-4 h-4" />
              记录付款
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setIsEditingOrder(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-neutral-700 font-semibold rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" />
              编辑订单
            </button>
          )}
          {canManage && (
            <button
              onClick={async () => {
                if (!ledgerId) return;
                if (!window.confirm('您确定要删除此订单吗？此操作无法撤销。')) return;
                try {
                  await ledgerService.deleteOrder(ledgerId, order.id);
                  navigate(`/ledger/${ledgerId}`);
                } catch (error: any) {
                  alert(error.message || '删除订单失败');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-100 hover:bg-red-100 transition-colors shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              删除订单
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Summary Card */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400">
                  {customer?.photoUrl ? (
                    <img src={customer.photoUrl} alt={customer.name} className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h3 
                    className="text-xl font-bold text-neutral-900 cursor-pointer hover:text-emerald-600 transition-colors"
                    onClick={() => navigate(`/ledger/${ledgerId}/customer/${order.customerId}`)}
                  >
                    {customer?.name || '加载中...'}
                  </h3>
                  <p className="text-sm text-neutral-500">{customer?.phone || '无电话'}</p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              <div>
                <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">本金</p>
                <p className="text-xl font-bold text-neutral-900">${order.principal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">利率</p>
                <p className="text-xl font-bold text-emerald-600">{order.interestRate}%</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">应付总额</p>
                <p className="text-xl font-bold text-neutral-900">${totalDue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">已付</p>
                <p className="text-xl font-bold text-blue-600">${currentPaid.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-500 font-medium">还款进度</span>
                <span className="text-neutral-900 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${order.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              付款历史
            </h4>
            <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
              {payments.length === 0 ? (
                <div className="p-12 text-center text-neutral-400">暂无付款记录。</div>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {payments.map((payment, idx) => (
                    <div key={idx} className="p-6 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">${payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-neutral-500">{format(new Date(payment.timestamp), 'yyyy年MM月dd日 HH:mm')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-neutral-400 font-medium">记录人</p>
                          <p className="text-sm font-bold text-neutral-700">UID: {payment.uid?.substring(0, 8)}</p>
                        </div>
                        {canManage && (
                          <button
                            onClick={() => handleDeletePayment(payment.id, payment.amount)}
                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除付款"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              备注和评论
            </h4>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 space-y-6">
              <div className="space-y-4">
                {(order.notes || []).map((note: any, idx: number) => (
                  <div key={idx} className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-neutral-900">{note.authorName}</span>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold">{format(new Date(note.timestamp), 'MM月dd日 HH:mm')}</span>
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed">{note.text}</p>
                  </div>
                ))}
                {(!order.notes || order.notes.length === 0) && (
                  <p className="text-center py-4 text-neutral-400 text-sm italic">暂无备注。</p>
                )}
              </div>
              
              {canManage && (
                <form onSubmit={handleAddNote} className="flex gap-3">
                  <input 
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="添加备注..."
                    className="flex-1 px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all"
                  >
                    发布
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          {/* Loan Details */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-6">贷款参数</h4>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-bold uppercase">开始日期</p>
                  <p className="font-bold text-neutral-900">{format(new Date(order.startDate), 'yyyy年MM月dd日')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-bold uppercase">到期日</p>
                  <p className="font-bold text-neutral-900">{format(new Date(order.dueDate), 'yyyy年MM月dd日')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-bold uppercase">期限长度</p>
                  <p className="font-bold text-neutral-900">{order.termDays} 天</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Context */}
          <div className="bg-neutral-900 p-8 rounded-3xl shadow-xl text-white">
            <h4 className="text-neutral-400 text-xs font-bold uppercase tracking-wider mb-4">账本</h4>
            <p className="text-xl font-bold mb-2">{ledger?.name || '加载中...'}</p>
            <p className="text-sm text-neutral-400 mb-6">团队协作智能账本</p>
            <button 
              onClick={() => navigate(`/ledger/${ledgerId}`)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              返回账本
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditingOrder && (
          <EditOrderModal
            ledgerId={ledgerId!}
            order={order}
            onClose={() => setIsEditingOrder(false)}
          />
        )}
        {isRecordingPayment && (
          <PaymentModal
            ledgerId={ledgerId!}
            orderId={orderId!}
            totalDue={totalDue}
            currentPaid={currentPaid}
            onClose={() => setIsRecordingPayment(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
