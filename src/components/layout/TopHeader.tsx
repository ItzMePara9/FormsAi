import React from 'react';
import { Menu, Sparkles, Plus, ExternalLink, ShieldCheck } from 'lucide-react';
import { useGoogle } from '../../context/GoogleContext.tsx';

interface TopHeaderProps {
  title: string;
  subtitle?: string;
  onOpenMobileMenu: () => void;
  onQuickCreate: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  subtitle,
  onOpenMobileMenu,
  onQuickCreate,
}) => {
  const { isConnected, email } = useGoogle();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#1E2536] bg-[#0B0D13]/90 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-400 hover:bg-[#1A202E] hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
            {title}
          </h2>
          {subtitle && (
            <p className="hidden sm:block text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 rounded-full border border-[#1E2536] bg-[#121622] py-1 px-3 text-xs">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-xs shadow-emerald-500' : 'bg-amber-400'}`} />
          <span className="text-slate-400">Google Forms:</span>
          {isConnected ? (
            <span className="font-medium text-slate-200 truncate max-w-[130px]">{email}</span>
          ) : (
            <span className="font-medium text-amber-300">Disconnected</span>
          )}
        </div>

        <button
          onClick={onQuickCreate}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-purple-600/20 hover:from-purple-500 hover:to-indigo-500 transition-all active:scale-95"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>New AI Form</span>
        </button>
      </div>
    </header>
  );
};
