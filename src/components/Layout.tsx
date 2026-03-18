import React, { ReactNode } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { LayoutDashboard, LogOut, BookOpen, Users, PieChart, Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';

interface LayoutProps {
  user: User;
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ user, children }) => {
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: BookOpen, label: 'My Ledgers', path: '/ledgers' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: PieChart, label: 'Reports', path: '/reports' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-neutral-200 flex flex-col sticky top-0 h-screen">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-neutral-900 tracking-tight">Smart Ledger</span>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                      : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-neutral-100">
          <div className="flex items-center gap-3 mb-6">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              className="w-10 h-10 rounded-full border-2 border-emerald-100" 
              alt="" 
            />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-neutral-900 truncate">{user.displayName}</p>
              <p className="text-xs text-neutral-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-20 bg-white border-b border-neutral-200 px-10 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-neutral-900">
            {navItems.find(i => i.path === location.pathname)?.label || 'Overview'}
          </h2>
          <div className="flex items-center gap-4">
            <button className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <div className="p-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
