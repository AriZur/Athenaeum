import React from 'react';
import { 
  BookOpen, 
  Layers, 
  Users, 
  Clock, 
  PlusCircle, 
  BookPlus, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  Radio, 
  Sparkles,
  Coins
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/formatters';

interface HeaderProps {
  activeTab: 'dashboard' | 'rentals' | 'books' | 'members';
  setActiveTab: (tab: 'dashboard' | 'rentals' | 'books' | 'members') => void;
  onOpenBorrowModal: () => void;
  onOpenAddBookModal: () => void;
  onOpenAuthModal: () => void;
  onOpenOverallRateModal?: () => void;
  overallRate?: number;
  realtimeConnected: boolean;
  overdueCount: number;
  activeRentalsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenBorrowModal,
  onOpenAddBookModal,
  onOpenAuthModal,
  onOpenOverallRateModal,
  overallRate = 100,
  realtimeConnected,
  overdueCount,
  activeRentalsCount = 0,
}) => {
  const { user, isAdmin, userName, userEmail, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#f8f7f2]/95 backdrop-blur-md border-b border-[#e2e0d5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Name */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#2d2d26]">
                Athenaeum
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8c8c7d]">
              <span className="flex items-center gap-1 font-mono">
                <Radio className={`w-3 h-3 ${realtimeConnected ? 'text-emerald-600 animate-pulse' : 'text-[#8c8c7d]'}`} />
                {realtimeConnected ? 'Live Real-Time Sync' : 'Connecting...'}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-[#efede4] p-1 rounded-full border border-[#e2e0d5]">
            <button
              id="tab-dashboard-btn"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'text-[#5A5A40] hover:text-[#2d2d26] hover:bg-[#e6e4d9]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Overview
            </button>

            <button
              id="tab-rentals-btn"
              onClick={() => setActiveTab('rentals')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all relative ${
                activeTab === 'rentals'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'text-[#5A5A40] hover:text-[#2d2d26] hover:bg-[#e6e4d9]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Borrowing & Returns
              {activeRentalsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#166534] text-white" title={`${activeRentalsCount} active borrowing(s) including extended`}>
                  {activeRentalsCount}
                </span>
              )}
              {overdueCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white" title={`${overdueCount} overdue`}>
                  {overdueCount}
                </span>
              )}
            </button>

            <button
              id="tab-books-btn"
              onClick={() => setActiveTab('books')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'books'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'text-[#5A5A40] hover:text-[#2d2d26] hover:bg-[#e6e4d9]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Catalog
            </button>

            <button
              id="tab-members-btn"
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'members'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'text-[#5A5A40] hover:text-[#2d2d26] hover:bg-[#e6e4d9]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Members
            </button>
          </nav>

          {/* Quick Actions & Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onOpenOverallRateModal && (
              <button
                id="header-pricing-btn"
                onClick={onOpenOverallRateModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#efede4] text-[#2d2d26] border border-[#e2e0d5] rounded-full text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="Customize overall library weekly rate"
              >
                <Coins className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span className="hidden sm:inline text-[#8c8c7d]">Rate:</span>
                <span className="font-mono text-[#5A5A40] font-bold">{formatCurrency(overallRate)}/wk</span>
              </button>
            )}

            <button
              id="header-borrow-btn"
              onClick={onOpenBorrowModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
              title="Issue a new rental"
            >
              <BookPlus className="w-3.5 h-3.5" />
              <span>Borrow Book</span>
            </button>

            <button
              id="header-addbook-btn"
              onClick={onOpenAddBookModal}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#efede4] text-[#5A5A40] border border-[#e2e0d5] rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Book</span>
            </button>

            {/* Auth status */}
            <div className="flex items-center pl-2 border-l border-[#e2e0d5]">
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <div className="hidden xl:flex flex-col text-right">
                    <span className="text-xs font-semibold text-[#2d2d26] flex items-center gap-1 justify-end">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#5A5A40]" />
                      {userName || 'My Account'}
                    </span>
                    <span className="text-[11px] text-[#8c8c7d] truncate max-w-[140px]">
                      {userEmail}
                    </span>
                  </div>
                  <button
                    id="header-signout-btn"
                    onClick={() => signOut()}
                    className="p-2 text-[#8c8c7d] hover:text-[#2d2d26] hover:bg-[#efede4] rounded-full transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  id="header-signin-btn"
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[#5A5A40] bg-[#efede4] hover:bg-[#e6e4d9] border border-[#e2e0d5] rounded-full text-xs font-semibold transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1.5 border-t border-[#e2e0d5] no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-[#5A5A40] text-white' : 'text-[#5A5A40] bg-[#efede4]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('rentals')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'rentals' ? 'bg-[#5A5A40] text-white' : 'text-[#5A5A40] bg-[#efede4]'
            }`}
          >
            Borrowing
            {activeRentalsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#166534] text-white">
                {activeRentalsCount}
              </span>
            )}
            {overdueCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white">
                {overdueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('books')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              activeTab === 'books' ? 'bg-[#5A5A40] text-white' : 'text-[#5A5A40] bg-[#efede4]'
            }`}
          >
            Catalog
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              activeTab === 'members' ? 'bg-[#5A5A40] text-white' : 'text-[#5A5A40] bg-[#efede4]'
            }`}
          >
            Members
          </button>
        </div>
      </div>
    </header>
  );
};
