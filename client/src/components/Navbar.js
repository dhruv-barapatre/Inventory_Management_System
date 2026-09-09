import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, User, Box } from 'lucide-react';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 glass-panel border-b border-slate-800">
      {/* Brand logo & mobile sidebar toggle */}
      <div className="flex items-center space-x-3">
        <button
          onClick={toggleSidebar}
          className="p-2 text-slate-400 rounded-lg lg:hidden hover:bg-slate-800"
        >
          <Box className="w-6 h-6 text-blue-500" />
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-slate-200 tracking-wide uppercase">
            Inventory Management System
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-4">
        {/* User Info Badge */}
        {user && (
          <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
            <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-semibold">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <div className="hidden md:flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-semibold text-slate-200">
                  {user.name}
                </span>
                {user.role === 'admin' ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Shield className="w-2.5 h-2.5 mr-0.5" /> ADMIN
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                    <User className="w-2.5 h-2.5 mr-0.5" /> USER
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">{user.email}</span>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
