import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ledgerService } from '../services/ledgerService';
import { 
  Users, 
  FileText, 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  History,
  UserPlus,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomerForm } from './CustomerForm';
import { OrderForm } from './OrderForm';
import { PaymentModal } from './PaymentModal';
import { format } from 'date-fns';
import { UserRole } from '../types';
import { auth } from '../firebase';

export const LedgerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'members' | 'logs'>('orders');
  
  const [ledger, setLedger] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState<any | null>(null);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add Member State
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('collector');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderPayments, setOrderPayments] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!id) return;
    const unsubLedger = ledgerService.subscribeToLedger(id, setLedger);
    const unsubCustomers = ledgerService.subscribeToCustomers(id, setCustomers);
    const unsubOrders = ledgerService.subscribeToOrders(id, setOrders);
    const unsubLogs = ledgerService.subscribeToAuditLogs(id, setLogs);
    return () => {
      unsubLedger();
      unsubCustomers();
      unsubOrders();
      unsubLogs();
    };
  }, [id]);

  // Subscribe to payments for expanded order
  useEffect(() => {
    if (!expandedOrder) return;
    const unsub = ledgerService.subscribeToPayments(expandedOrder, (payments) => {
      setOrderPayments(prev => ({ ...prev, [expandedOrder]: payments }));
    });
    return () => unsub();
  }, [expandedOrder]);

  const userRole = ledger?.ownerUid === auth.currentUser?.uid 
    ? 'ledger_admin' 
    : ledger?.members?.find((m: any) => m.uid === auth.currentUser?.uid)?.role || 'readonly';

  const canManageMembers = userRole === 'ledger_admin';
  const canCreateOrders = ['ledger_admin', 'auditor', 'collector'].includes(userRole);
  const canApproveOrders = ['ledger_admin', 'auditor'].includes(userRole);
  const canRecordPayments = ['ledger_admin', 'collector'].includes(userRole);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'pending_approval': return 'bg-amber-100 text-amber-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Clock;
      case 'overdue': return AlertCircle;
      case 'completed': return CheckCircle2;
      case 'pending_approval': return Clock;
      default: return Clock;
    }
  };

  const handleUpdateStatus = async (orderId: string, oldStatus: string, newStatus: string) => {
    if (!id) return;
    if (!canApproveOrders && newStatus === 'active') {
      alert('您没有权限审批订单。');
      return;
    }
    await ledgerService.updateOrderStatus(id, orderId, oldStatus, newStatus);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newMemberEmail.trim()) return;
    if (!canManageMembers) return;
    setIsAddingMember(true);
    try {
      await ledgerService.addMemberByEmail(id, newMemberEmail, newMemberRole);
      setNewMemberEmail('');
    } catch (error: any) {
      alert(error.message || '添加成员失败');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!id || !canManageMembers) return;
    if (!window.confirm('您确定要移除此成员吗？')) return;
    try {
      await ledgerService.removeMember(id, uid);
    } catch (error: any) {
      alert(error.message || '移除成员失败');
    }
  };

  const handleUpdateMemberRole = async (uid: string, newRole: UserRole) => {
    if (!id || !canManageMembers) return;
    try {
      await ledgerService.updateMemberRole(id, uid, newRole);
    } catch (error: any) {
      alert(error.message || '更新成员角色失败');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!id || !canApproveOrders) return;
    if (!window.confirm('您确定要删除此订单吗？此操作无法撤销。')) return;
    try {
      await ledgerService.deleteOrder(id, orderId);
    } catch (error: any) {
      alert(error.message || '删除订单失败');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  const filteredOrders = orders.filter(o => {
    const customer = customers.find(c => c.id === o.customerId);
    const matchesSearch = customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getActionName = (action: string) => {
    const actionMap: Record<string, string> = {
      'create_ledger': '创建账本',
      'add_member': '添加成员',
      'update_member_role': '更新成员角色',
      'remove_member': '移除成员',
      'create_customer': '创建客户',
      'create_order': '创建订单',
      'update_order_status': '更新订单状态',
      'update_order': '更新订单',
      'delete_order': '删除订单',
      'record_payment': '记录付款',
      'delete_payment': '删除付款',
      'add_order_note': '添加订单备注'
    };
    return actionMap[action] || action.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors font-medium bg-white rounded-full shadow-sm border border-neutral-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">{ledger?.name || '加载中...'}</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-neutral-500">账本详情</p>
              <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] font-bold uppercase tracking-wider">
                角色: {userRole === 'ledger_admin' ? '账本管理员' : userRole === 'auditor' ? '审计员' : userRole === 'collector' ? '收款员' : '只读'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          {canCreateOrders && (
            <button
              onClick={() => setShowCustomerForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-2xl transition-all shadow-sm"
            >
              <Plus className="w-5 h-5" />
              新客户
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
              activeTab === 'orders' ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            <FileText className="w-5 h-5" />
            订单
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
              activeTab === 'customers' ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            <Users className="w-5 h-5" />
            客户
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
              activeTab === 'members' ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            <Shield className="w-5 h-5" />
            成员
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
              activeTab === 'logs' ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            <History className="w-5 h-5" />
            审计日志
          </button>
        </div>

        {(activeTab === 'orders' || activeTab === 'customers') && (
          <div className="flex items-center gap-4 px-4 flex-1 max-w-xl ml-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`搜索 ${activeTab === 'orders' ? '订单' : activeTab === 'customers' ? '客户' : activeTab === 'members' ? '成员' : '日志'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-neutral-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            {activeTab === 'orders' && (
              <div className="relative">
                <Filter className="absolute left-4 top-3 text-neutral-400 w-5 h-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-12 pr-8 py-2.5 bg-neutral-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="all">所有状态</option>
                  <option value="active">活跃</option>
                  <option value="pending_approval">待审批</option>
                  <option value="overdue">逾期</option>
                  <option value="completed">已完成</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 gap-4"
          >
            {filteredOrders.map((order) => {
              const customer = customers.find(c => c.id === order.customerId);
              const StatusIcon = getStatusIcon(order.status);
              const calculatedInterest = (order.principal || 0) * (order.interestRate || 0) / 100;
              const totalDue = (order.principal || 0) + calculatedInterest;
              const currentPaid = order.paidAmount || 0;
              const progress = Math.min(100, Math.round((currentPaid / totalDue) * 100)) || 0;
              const isExpanded = expandedOrder === order.id;

              return (
                <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden group hover:shadow-md transition-all">
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-6 flex-1">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getStatusColor(order.status)} shrink-0`}>
                        <StatusIcon className="w-7 h-7" />
                      </div>
                      <div className="flex-1">
                        <h4 
                          className="text-lg font-bold text-neutral-900 cursor-pointer hover:text-emerald-600 transition-colors"
                          onClick={() => navigate(`/ledger/${id}/customer/${order.customerId}`)}
                        >
                          {customer?.name || '未知客户'}
                        </h4>
                        <p className="text-sm text-neutral-500 flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4" />
                          到期 {format(new Date(order.dueDate), 'yyyy年MM月dd日')}
                        </p>
                        {/* Progress Bar */}
                        <div className="w-full max-w-xs bg-neutral-100 rounded-full h-2.5 mb-1">
                          <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-xs text-neutral-500 font-medium">
                          已付: ${currentPaid.toLocaleString()} / ${totalDue.toLocaleString()} ({progress}%)
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 md:gap-8">
                      <div className="text-right">
                        <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">本金</p>
                        <p className="text-lg font-bold text-neutral-900">${order.principal.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">利息</p>
                        <p className="text-lg font-bold text-emerald-600">+{order.interestRate}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${getStatusColor(order.status)}`}>
                          {order.status === 'pending_approval' ? '待审批' : order.status === 'active' ? '活跃' : order.status === 'overdue' ? '逾期' : order.status === 'completed' ? '已完成' : order.status === 'cancelled' ? '已取消' : order.status}
                        </div>
                        
                        {/* Status Actions */}
                        <select 
                          className="ml-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2"
                          value={order.status}
                          disabled={!canApproveOrders && order.status === 'pending_approval'}
                          onChange={(e) => handleUpdateStatus(order.id, order.status, e.target.value)}
                        >
                          <option value="pending_approval">待审批</option>
                          <option value="active">活跃</option>
                          <option value="overdue">逾期</option>
                          <option value="completed">已完成</option>
                          <option value="cancelled">已取消</option>
                        </select>

                        {/* Payment Button */}
                        {canRecordPayments && order.status !== 'completed' && order.status !== 'cancelled' && (
                          <button 
                            onClick={() => setSelectedOrderForPayment({ ...order, totalDue, currentPaid })}
                            className="ml-2 p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="记录付款"
                          >
                            <DollarSign className="w-5 h-5" />
                          </button>
                        )}

                        {/* View Details Button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/ledger/${id}/order/${order.id}`);
                          }}
                          className="ml-2 p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="查看完整详情"
                        >
                          <FileText className="w-5 h-5" />
                        </button>

                        {/* Delete Order Button */}
                        {canApproveOrders && (
                          <button 
                            onClick={() => handleDeleteOrder(order.id)}
                            className="ml-2 p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="删除订单"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}

                        {/* Expand Button */}
                        <button 
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                          className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400 hover:text-neutral-900'}`}
                        >
                          <History className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Payment History */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-neutral-50 border-t border-neutral-100 overflow-hidden"
                      >
                        <div className="p-6">
                          <h5 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            付款历史
                          </h5>
                          <div className="space-y-3">
                            {orderPayments[order.id]?.map((payment, pidx) => (
                              <div key={pidx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-neutral-100">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                    <DollarSign className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-neutral-900">${payment.amount.toLocaleString()}</p>
                                    <p className="text-[10px] text-neutral-500">{format(new Date(payment.timestamp), 'yyyy年MM月dd日 HH:mm')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-[10px] font-mono text-neutral-400">UID: {payment.uid?.substring(0, 6)}</span>
                                  {canRecordPayments && (
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`您确定要删除这笔 $${payment.amount} 的付款吗？`)) {
                                          ledgerService.deletePayment(id!, order.id, payment.id, payment.amount, order.paidAmount || 0);
                                        }
                                      }}
                                      className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="删除付款"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(!orderPayments[order.id] || orderPayments[order.id].length === 0) && (
                              <p className="text-xs text-neutral-400 italic">暂无付款记录。</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {filteredOrders.length === 0 && (
              <div className="py-20 text-center text-neutral-400">未找到订单。</div>
            )}
          </motion.div>
        )}

        {activeTab === 'customers' && (
          <motion.div
            key="customers"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 group hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div 
                    className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all cursor-pointer"
                    onClick={() => navigate(`/ledger/${id}/customer/${customer.id}`)}
                  >
                    <Users className="w-8 h-8" />
                  </div>
                  <button className="p-2 text-neutral-300 hover:text-neutral-900 transition-colors">
                    <MoreVertical className="w-6 h-6" />
                  </button>
                </div>
                <h4 
                  className="text-xl font-bold text-neutral-900 mb-1 cursor-pointer hover:text-emerald-600 transition-colors"
                  onClick={() => navigate(`/ledger/${id}/customer/${customer.id}`)}
                >
                  {customer.name}
                </h4>
                <p className="text-sm text-neutral-500 mb-6">{customer.phone || '未提供电话'}</p>
                
                {canCreateOrders && (
                  <button
                    onClick={() => setSelectedCustomerForOrder(customer)}
                    className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-5 h-5" />
                    创建贷款
                  </button>
                )}
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="col-span-full py-20 text-center text-neutral-400">未找到客户。</div>
            )}
          </motion.div>
        )}

        {activeTab === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Add Member Form */}
            {canManageMembers && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
                <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  添加新成员
                </h3>
                <form onSubmit={handleAddMember} className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">用户邮箱</label>
                    <input
                      type="email"
                      required
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="w-48">
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">角色</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as UserRole)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                    >
                      <option value="ledger_admin">账本管理员</option>
                      <option value="auditor">审计员</option>
                      <option value="collector">收款员</option>
                      <option value="readonly">只读</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isAddingMember}
                    className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50"
                  >
                    {isAddingMember ? '添加中...' : '添加成员'}
                  </button>
                </form>
              </div>
            )}

            {/* Members List */}
            <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    <th className="p-4 text-sm font-semibold text-neutral-600">姓名 / 邮箱</th>
                    <th className="p-4 text-sm font-semibold text-neutral-600">角色</th>
                    <th className="p-4 text-sm font-semibold text-neutral-600 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger?.ownerUid && (
                    <tr className="border-b border-neutral-50">
                      <td className="p-4">
                        <div className="font-medium text-neutral-900">所有者</div>
                        <div className="text-sm text-neutral-500">{ledger.ownerUid}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider">
                          所有者
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-neutral-400 text-sm">无法移除</span>
                      </td>
                    </tr>
                  )}
                  {ledger?.members?.map((member: any, idx: number) => (
                    <tr key={idx} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-neutral-900">{member.name || '未知'}</div>
                        <div className="text-sm text-neutral-500">{member.email || member.uid}</div>
                      </td>
                      <td className="p-4">
                        {canManageMembers ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateMemberRole(member.uid, e.target.value as UserRole)}
                            className="bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider px-3 py-1 border-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                          >
                            <option value="ledger_admin">账本管理员</option>
                            <option value="auditor">审计员</option>
                            <option value="collector">收款员</option>
                            <option value="readonly">只读</option>
                          </select>
                        ) : (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                            {member.role === 'ledger_admin' ? '账本管理员' : member.role === 'auditor' ? '审计员' : member.role === 'collector' ? '收款员' : '只读'}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {canManageMembers && (
                          <button 
                            onClick={() => handleRemoveMember(member.uid)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                          >
                            移除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!ledger?.members || ledger.members.length === 0) && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-neutral-400">
                        未找到其他成员。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  <th className="p-4 text-sm font-semibold text-neutral-600">时间戳</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600">用户 UID</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600">操作</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600">详情</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4 text-sm text-neutral-500 whitespace-nowrap">
                      {format(new Date(log.timestamp), 'yyyy年MM月dd日 HH:mm')}
                    </td>
                    <td className="p-4 text-sm font-mono text-neutral-500">
                      {log.uid.substring(0, 8)}...
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-bold uppercase tracking-wider">
                        {getActionName(log.action)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-neutral-600">
                      {log.oldValue && <span className="line-through text-neutral-400 mr-2">{log.oldValue}</span>}
                      {log.newValue && <span className="font-medium text-emerald-600">{log.newValue}</span>}
                      {!log.oldValue && !log.newValue && <span className="text-neutral-400">目标: {log.targetId}</span>}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-neutral-400">
                      未找到审计日志。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {showCustomerForm && id && (
        <CustomerForm ledgerId={id} onClose={() => setShowCustomerForm(false)} />
      )}
      {selectedCustomerForOrder && id && (
        <OrderForm 
          ledgerId={id} 
          customerId={selectedCustomerForOrder.id} 
          customerName={selectedCustomerForOrder.name}
          onClose={() => setSelectedCustomerForOrder(null)} 
        />
      )}
      {selectedOrderForPayment && id && (
        <PaymentModal
          ledgerId={id}
          orderId={selectedOrderForPayment.id}
          totalDue={selectedOrderForPayment.totalDue}
          currentPaid={selectedOrderForPayment.currentPaid}
          onClose={() => setSelectedOrderForPayment(null)}
        />
      )}
    </div>
  );
};

