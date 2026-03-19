import React, { useState, useEffect } from 'react';
import { memberService } from '../services/memberService';
import { ledgerService } from '../services/ledgerService';
import { SystemMember, Ledger, UserRole, User } from '../types';
import { UserPlus, Trash2, Edit2, Shield, Key, User as UserIcon, Check, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MembersProps {
  userProfile: User | null;
}

export const Members: React.FC<MembersProps> = ({ userProfile }) => {
  const [members, setMembers] = useState<SystemMember[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<SystemMember | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'staff' as UserRole,
    accessibleLedgerIds: [] as string[]
  });

  useEffect(() => {
    const unsubMembers = memberService.subscribeToSystemMembers(setMembers);
    const unsubLedgers = ledgerService.subscribeToLedgers((data) => {
      setLedgers(data);
      setLoading(false);
    });

    return () => {
      unsubMembers();
      unsubLedgers();
    };
  }, []);

  const handleOpenModal = (member?: SystemMember) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        username: member.username,
        password: '', // Don't show password
        displayName: member.displayName,
        role: member.role,
        accessibleLedgerIds: member.accessibleLedgerIds
      });
    } else {
      setEditingMember(null);
      setFormData({
        username: '',
        password: '',
        displayName: '',
        role: 'staff',
        accessibleLedgerIds: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await memberService.updateSystemMember(editingMember.id, {
          displayName: formData.displayName,
          role: formData.role,
          accessibleLedgerIds: formData.accessibleLedgerIds,
          ...(formData.password ? { password: formData.password } : {})
        });
      } else {
        if (!formData.password) {
          alert('请输入密码');
          return;
        }
        await memberService.createSystemMember({
          username: formData.username,
          password: formData.password,
          displayName: formData.displayName,
          role: formData.role,
          accessibleLedgerIds: formData.accessibleLedgerIds
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving member:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除该成员吗？')) {
      try {
        await memberService.deleteSystemMember(id);
      } catch (error) {
        console.error('Error deleting member:', error);
      }
    }
  };

  const toggleLedger = (ledgerId: string) => {
    setFormData(prev => ({
      ...prev,
      accessibleLedgerIds: prev.accessibleLedgerIds.includes(ledgerId)
        ? prev.accessibleLedgerIds.filter(id => id !== ledgerId)
        : [...prev.accessibleLedgerIds, ledgerId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">成员管理</h1>
          <p className="text-neutral-500">管理系统成员及其账本访问权限</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <UserPlus className="w-5 h-5" />
          添加成员
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
              <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">名称</th>
              <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">账号</th>
              <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">角色</th>
              <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">可访问账本</th>
              <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                  暂无成员
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                        {member.displayName.charAt(0)}
                      </div>
                      <span className="font-medium text-neutral-900">{member.displayName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-neutral-600 font-mono text-sm">{member.username}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      <Shield className="w-3 h-3" />
                      {member.role === 'admin' ? '管理员' : '普通成员'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {member.accessibleLedgerIds.length === 0 ? (
                        <span className="text-xs text-neutral-400 italic">无权限</span>
                      ) : (
                        member.accessibleLedgerIds.map(id => {
                          const ledger = ledgers.find(l => l.id === id);
                          return (
                            <span key={id} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] font-medium">
                              {ledger?.name || '未知账本'}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(member)}
                        className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <h2 className="text-xl font-bold text-neutral-900">
                  {editingMember ? '编辑成员' : '添加新成员'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">名称</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        required
                        value={formData.displayName}
                        onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        placeholder="成员显示名称"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">账号 (用户名)</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        required
                        disabled={!!editingMember}
                        value={formData.username}
                        onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50"
                        placeholder="用于登录的用户名"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">
                      {editingMember ? '新密码 (留空则不修改)' : '密码'}
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="password"
                        required={!editingMember}
                        value={formData.password}
                        onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        placeholder="登录密码"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">角色</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, role: 'staff' }))}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                          formData.role === 'staff'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                            : 'bg-white border-neutral-100 text-neutral-500 hover:border-neutral-200'
                        }`}
                      >
                        普通成员
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                          formData.role === 'admin'
                            ? 'bg-purple-50 border-purple-600 text-purple-700'
                            : 'bg-white border-neutral-100 text-neutral-500 hover:border-neutral-200'
                        }`}
                      >
                        管理员
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">账本访问权限</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                      {ledgers.map(ledger => (
                        <button
                          key={ledger.id}
                          type="button"
                          onClick={() => toggleLedger(ledger.id)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all ${
                            formData.accessibleLedgerIds.includes(ledger.id)
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-neutral-50 border-neutral-100 text-neutral-500 hover:border-neutral-200'
                          }`}
                        >
                          <span className="truncate mr-2">{ledger.name}</span>
                          {formData.accessibleLedgerIds.includes(ledger.id) ? (
                            <Check className="w-3 h-3 shrink-0" />
                          ) : (
                            <X className="w-3 h-3 shrink-0 opacity-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-600 rounded-xl font-bold hover:bg-neutral-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                  >
                    {editingMember ? '保存修改' : '创建成员'}
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
