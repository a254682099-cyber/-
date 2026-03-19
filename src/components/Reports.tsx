import React, { useState, useEffect } from 'react';
import { ledgerService } from '../services/ledgerService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { TrendingUp, DollarSign, Users, FileText, Calendar, Filter, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'motion/react';
import { format, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Reports: React.FC = () => {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    const unsubLedgers = ledgerService.subscribeToLedgers((data) => {
      setLedgers(data);
      
      const orderUnsubs: any[] = [];
      const customerUnsubs: any[] = [];
      let allOrders: any[] = [];
      let allCustomers: any[] = [];
      
      data.forEach(ledger => {
        const unsubO = ledgerService.subscribeToOrders(ledger.id, (ledgerOrders) => {
          allOrders = [...allOrders.filter(o => o.ledgerId !== ledger.id), ...ledgerOrders];
          setOrders([...allOrders]);
        });
        orderUnsubs.push(unsubO);

        const unsubC = ledgerService.subscribeToCustomers(ledger.id, (ledgerCustomers) => {
          allCustomers = [...allCustomers.filter(c => c.ledgerId !== ledger.id), ...ledgerCustomers];
          setCustomers([...allCustomers]);
        });
        customerUnsubs.push(unsubC);
      });

      setLoading(false);
      return () => {
        orderUnsubs.forEach(u => u());
        customerUnsubs.forEach(u => u());
      };
    });

    return () => unsubLedgers();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-neutral-500">正在加载报表...</div>;
  }

  // Filter Data
  const filteredOrders = orders.filter(order => {
    const matchesLedger = selectedLedgerId === 'all' || order.ledgerId === selectedLedgerId;
    const orderDate = new Date(order.createdAt);
    const matchesDate = isWithinInterval(orderDate, {
      start: new Date(dateRange.start),
      end: new Date(dateRange.end + 'T23:59:59')
    });
    return matchesLedger && matchesDate;
  });

  const filteredCustomers = customers.filter(c => selectedLedgerId === 'all' || c.ledgerId === selectedLedgerId);

  // Calculate Stats
  const totalPrincipal = filteredOrders.reduce((sum, o) => sum + (o.principal || 0), 0);
  const totalPaid = filteredOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalInterest = filteredOrders.reduce((sum, o) => sum + ((o.principal || 0) * (o.interestRate || 0) / 100), 0);
  const totalExpected = totalPrincipal + totalInterest;
  const collectionRate = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

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

  // Status Distribution Data
  const statusCounts = filteredOrders.reduce((acc: any, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  
  const statusData = Object.keys(statusCounts).map(key => ({
    name: getStatusText(key),
    value: statusCounts[key]
  }));

  // Monthly Volume Data
  const monthlyDataMap = filteredOrders.reduce((acc: any, order) => {
    const month = format(new Date(order.createdAt), 'yyyy年MM月');
    if (!acc[month]) acc[month] = { name: month, principal: 0, paid: 0 };
    acc[month].principal += order.principal || 0;
    acc[month].paid += order.paidAmount || 0;
    return acc;
  }, {});
  
  const monthlyData = Object.values(monthlyDataMap).sort((a: any, b: any) => new Date(a.name).getTime() - new Date(b.name).getTime());

  // Top Customers by Outstanding Balance
  const customerStats = filteredCustomers.map(customer => {
    const customerOrders = filteredOrders.filter(o => o.customerId === customer.id);
    const principal = customerOrders.reduce((sum, o) => sum + (o.principal || 0), 0);
    const interest = customerOrders.reduce((sum, o) => sum + ((o.principal || 0) * (o.interestRate || 0) / 100), 0);
    const paid = customerOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const outstanding = (principal + interest) - paid;
    return { ...customer, principal, outstanding, paid };
  }).sort((a, b) => b.outstanding - a.outstanding).slice(0, 5);

  const handleExport = () => {
    const data = {
      summary: {
        totalPrincipal,
        totalPaid,
        totalExpected,
        collectionRate,
        orderCount: filteredOrders.length,
        customerCount: filteredCustomers.length
      },
      orders: filteredOrders,
      customers: filteredCustomers
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">分析与报表</h2>
          <p className="text-sm text-neutral-500">财务表现概览</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-neutral-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <select 
                value={selectedLedgerId}
                onChange={(e) => setSelectedLedgerId(e.target.value)}
                className="text-sm font-bold text-neutral-700 bg-transparent outline-none cursor-pointer"
              >
                <option value="all">所有账本</option>
                {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="h-4 w-px bg-neutral-200 hidden md:block"></div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <input 
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="text-sm font-bold text-neutral-700 bg-transparent outline-none cursor-pointer"
              />
              <span className="text-neutral-300">至</span>
              <input 
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="text-sm font-bold text-neutral-700 bg-transparent outline-none cursor-pointer"
              />
            </div>
          </div>
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-3xl transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <Download className="w-5 h-5" />
            导出数据
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">总放款额</p>
              <h3 className="text-2xl font-bold text-neutral-900">${totalPrincipal.toLocaleString()}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <ArrowUpRight className="w-3 h-3" />
            <span>活跃资金</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">总收款额</p>
              <h3 className="text-2xl font-bold text-neutral-900">${totalPaid.toLocaleString()}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
            <ArrowDownRight className="w-3 h-3" />
            <span>{collectionRate.toFixed(1)}% 收款率</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">总订单数</p>
              <h3 className="text-2xl font-bold text-neutral-900">{filteredOrders.length}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
            <span>{filteredOrders.filter(o => o.status === 'active').length} 活跃贷款</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">总客户数</p>
              <h3 className="text-2xl font-bold text-neutral-900">{filteredCustomers.length}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-purple-600">
            <span>{filteredCustomers.length} 活跃档案</span>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Volume Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
          <h3 className="text-lg font-bold text-neutral-900 mb-8">月度交易量</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  cursor={{fill: '#f5f5f5'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}}
                />
                <Legend iconType="circle" />
                <Bar dataKey="principal" name="已放款" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="已收款" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
          <h3 className="text-lg font-bold text-neutral-900 mb-8">订单状态分布</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Customers & Collection Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Customers Table */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
          <h3 className="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            未结余额最高客户
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="py-4 text-sm font-semibold text-neutral-600">客户</th>
                  <th className="py-4 text-sm font-semibold text-neutral-600">总本金</th>
                  <th className="py-4 text-sm font-semibold text-neutral-600">总已付</th>
                  <th className="py-4 text-sm font-semibold text-neutral-600 text-right">未结余额</th>
                </tr>
              </thead>
              <tbody>
                {customerStats.map((customer, idx) => (
                  <tr key={customer.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 font-bold text-neutral-900">{customer.name}</td>
                    <td className="py-4 text-neutral-600">${customer.principal.toLocaleString()}</td>
                    <td className="py-4 text-emerald-600">${customer.paid.toLocaleString()}</td>
                    <td className="py-4 text-right font-bold text-red-600">${customer.outstanding.toLocaleString()}</td>
                  </tr>
                ))}
                {customerStats.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-neutral-400 italic">暂无客户数据。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Collection Efficiency (Placeholder for now as we don't fetch all payments) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
          <h3 className="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            收款效率
          </h3>
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 rounded-2xl">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">整体收款率</p>
              <p className="text-3xl font-bold text-emerald-700">{collectionRate.toFixed(1)}%</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">预期总额</span>
                <span className="text-sm font-bold text-neutral-900">${totalExpected.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">实际已收</span>
                <span className="text-sm font-bold text-emerald-600">${totalPaid.toLocaleString()}</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${collectionRate}%` }}></div>
              </div>
              <p className="text-xs text-neutral-400 text-center">
                收款率根据总本金加上预期利息计算。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
