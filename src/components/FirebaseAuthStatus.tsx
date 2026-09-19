import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Cloud, CloudCheck, LogIn, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';

export const FirebaseAuthStatus: React.FC = () => {
  const { user, loading, signInWithGoogle, signOutUser, authError, clearError } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 rounded-xl text-xs text-slate-400 border border-slate-700">
        <Cloud className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
        <span>Đang kết nối Firebase...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {user ? (
        <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs text-slate-200">
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden ring-1 ring-indigo-400">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              (user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()
            )}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="font-semibold text-slate-200 text-[11px] truncate max-w-[140px]">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <span className="text-[9px] text-teal-400 flex items-center gap-0.5">
              <CloudCheck className="w-2.5 h-2.5" />
              Đã đồng bộ Firestore
            </span>
          </div>
          <button
            onClick={signOutUser}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer ml-1"
            title="Đăng xuất khỏi Firebase"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer border border-indigo-500 active:scale-95"
          title="Đăng nhập Google để đồng bộ dữ liệu lịch khám lên Cloud Firestore"
        >
          <LogIn className="w-3.5 h-3.5 text-indigo-200" />
          <span>Đăng nhập Google</span>
        </button>
      )}

      {authError && (
        <div className="fixed bottom-4 right-4 z-50 bg-rose-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-rose-700 text-xs flex items-center gap-2">
          <span>{authError}</span>
          <button onClick={clearError} className="underline text-rose-200 ml-2 font-bold cursor-pointer">
            Đóng
          </button>
        </div>
      )}
    </div>
  );
};
