import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  FileSpreadsheet,
  Layers,
  Cpu,
  Share2,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useGoogle } from '../../context/GoogleContext.tsx';

export type NavTab =
  | 'overview'
  | 'create'
  | 'forms'
  | 'templates'
  | 'models'
  | 'google'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user, appName, logout } = useAuth();
  const { isConnected, email } = useGoogle();

  const navItems: Array<{ id: NavTab; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'create', label: 'Create with AI', icon: Sparkles, badge: 'AI' },
    { id: 'forms', label: 'My Forms', icon: FileSpreadsheet },
    { id: 'templates', label: 'Templates', icon: Layers },
    { id: 'models', label: 'AI Models', icon: Cpu },
    { id: 'google', label: 'Google Connections', icon: Share2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-68 flex-col border-r border-[#1E2536] bg-[#0E121B] transition-transform duration-200 lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#1E2536] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md shadow-purple-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                {appName}
              </h1>
              <p className="text-[10px] font-medium tracking-wide uppercase text-purple-400/90">
                Self-Hosted Studio
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30 shadow-xs'
                      : 'text-slate-400 hover:bg-[#161B28] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4.5 w-4.5 transition-colors ${
                        isActive ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-md bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 rounded-xl border border-[#1E2536] bg-[#121622] p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Google Sync
              </span>
              {isConnected ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                  <AlertCircle className="h-3 w-3" />
                  Offline
                </span>
              )}
            </div>

            {isConnected ? (
              <div className="text-xs text-slate-300 truncate font-mono bg-[#0B0E17] px-2 py-1.5 rounded-md border border-[#1F273B]">
                {email || 'Connected'}
              </div>
            ) : (
              <button
                onClick={() => {
                  onNavigate('google');
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#1B2234] hover:bg-[#232B42] text-xs font-medium text-slate-200 py-1.5 px-2 transition-colors border border-slate-700/50"
              >
                <span>Connect Account</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-[#1E2536] bg-[#0B0E17] p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-purple-300 border border-slate-700">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="truncate">
                <div className="truncate text-xs font-semibold text-slate-200">
                  {user?.name || 'Administrator'}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <ShieldCheck className="h-3 w-3 text-purple-400" />
                  <span>Admin</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1E2536] hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
