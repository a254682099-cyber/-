import React, { useState } from 'react';
import { ledgerService } from '../services/ledgerService';
import { X, FilePlus, DollarSign, Percent, Calendar, Clock, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { addDays, format } from 'date-fns';

interface OrderFormProps {
  ledgerId: string;
  customerId: string;
  customerName: string;
  onClose: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ ledgerId, customerId, customerName, onClose }) => {
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('5'); // 5% default
  const [interestInterval, setInterestInterval] = useState<'daily' | 'weekly' | 'monthly' | 'once'>('daily');
  const [termDays, setTermDays] = useState('30'); // 30 days default
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const start = new Date(startDate);
      const due = addDays(start, parseInt(termDays));
      
      await ledgerService.createOrder(ledgerId, {
        customerId,
        principal: parseFloat(principal),
        interestRate: parseFloat(interestRate),
        interestInterval,
        termDays: parseInt(termDays),
        startDate: start.toISOString(),
        dueDate: due.toISOString(),
        notes: []
      });
      onClose();
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatedInterest = (parseFloat(principal) || 0) * (parseFloat(interestRate) || 0) / 100;
  const totalDue = (parseFloat(principal) || 0) + calculatedInterest;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-900 transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <FilePlus className="text-emerald-600 w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-neutral-900">新订单</h3>
            <p className="text-neutral-500">正在为 <span className="font-semibold text-neutral-900">{customerName}</span> 创建贷款</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">本金金额</label>
                <div className="relative">
                  <input
                    autoFocus
                    type="number"
                    required
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                  <DollarSign className="absolute left-4 top-3.5 text-neutral-400 w-5 h-5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">利率 (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                  <Percent className="absolute left-4 top-3.5 text-neutral-400 w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">利息间隔</label>
                  <select
                    value={interestInterval}
                    onChange={(e) => setInterestInterval(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                  >
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
                    <option value="monthly">每月</option>
                    <option value="once">到期</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">期限（天）</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={termDays}
                      onChange={(e) => setTermDays(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                    <Clock className="absolute left-4 top-3.5 text-neutral-400 w-5 h-5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">开始日期</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                  <Calendar className="absolute left-4 top-3.5 text-neutral-400 w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
            <div className="flex items-center gap-2 mb-4 text-neutral-500">
              <Info className="w-4 h-4" />
              <span className="text-sm font-medium">订单摘要</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">本金</p>
                <p className="text-lg font-bold text-neutral-900">${parseFloat(principal || '0').toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">利息</p>
                <p className="text-lg font-bold text-emerald-600">+${calculatedInterest.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">应付总额</p>
                <p className="text-lg font-bold text-neutral-900">${totalDue.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <p className="text-sm text-neutral-500">
                到期日： <span className="font-bold text-neutral-900">{format(addDays(new Date(startDate), parseInt(termDays || '0')), 'yyyy年MM月dd日')}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-2xl transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '创建中...' : '创建订单'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
