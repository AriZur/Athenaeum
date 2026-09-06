import React from 'react';
import { 
  Coins, 
  AlertTriangle, 
  Trophy, 
  BookMarked, 
  Users, 
  ArrowUpRight, 
  Clock, 
  BookPlus, 
  RotateCw, 
  CheckCircle2, 
  Layers,
  Sliders
} from 'lucide-react';
import { DashboardStats, RentalWithDetails, Book } from '../types';
import { formatCurrency, formatDate, getDueDateRelative } from '../lib/formatters';

interface DashboardOverviewProps {
  stats: DashboardStats;
  rentals: RentalWithDetails[];
  overallRate?: number;
  onOpenOverallRateModal?: () => void;
  onNavigateToRentals: (filter?: string) => void;
  onNavigateToBooks: () => void;
  onNavigateToMembers: () => void;
  onOpenBorrowModal: (preselectedBook?: Book) => void;
  onReturnRental: (rental: RentalWithDetails) => void;
  onExtendRental: (rental: RentalWithDetails) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  rentals,
  overallRate = 100,
  onOpenOverallRateModal,
  onNavigateToRentals,
  onNavigateToBooks,
  onNavigateToMembers,
  onOpenBorrowModal,
  onReturnRental,
  onExtendRental,
}) => {
  const recentRentals = rentals.slice(0, 6);
  const overdueRentals = rentals.filter(r => r.status === 'overdue');

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome & System Summary Banner */}
      <div className="bg-[#2d2d26] rounded-3xl p-6 sm:p-8 text-[#f8f7f2] shadow-sm relative overflow-hidden border border-[#434338]">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#5A5A40]/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#5A5A40]/40 text-[#efede4] border border-[#5A5A40] mb-3">
            <span>Circulation & Revenue Control Active</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#f8f7f2] mb-2">
            Library Management & Financial Ledger
          </h1>
          <p className="text-[#e2e0d5] text-sm sm:text-base leading-relaxed mb-6">
            Real-time book circulation with weekly fee charging, 4-week maximum loan limits, borrower transaction histories, and live inventory tracking.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenBorrowModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-[#f8f7f2] font-semibold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
            >
              <BookPlus className="w-4 h-4" />
              <span>Issue New Book Loan</span>
            </button>
            <button
              onClick={() => onNavigateToRentals('overdue')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-transparent hover:bg-white/10 text-[#efede4] border border-[#e2e0d5]/40 font-medium text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-rose-300" />
              <span>Review Overdue ({stats.overdueCount})</span>
            </button>
            {onOpenOverallRateModal && (
              <button
                onClick={onOpenOverallRateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[#f8f7f2] border border-[#e2e0d5]/30 font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer"
                title="Customize overall library weekly rate"
              >
                <Coins className="w-4 h-4 text-amber-300" />
                <span>Overall Rate: {formatCurrency(overallRate)}/wk</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Total Revenue Generated */}
        <div className="bg-white rounded-3xl p-6 border border-[#f0eee4] shadow-xs hover:border-[#e2e0d5] transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8c8c7d]">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-full bg-[#efede4] text-[#5A5A40] flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-serif font-bold text-[#2d2d26] mb-2">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div className="flex items-center justify-between text-xs text-[#8c8c7d] pt-3 border-t border-[#f0eee4]">
            <span>Base Fees: <strong className="text-[#2d2d26]">{formatCurrency(stats.rentalBaseRevenue)}</strong></span>
            <span>Extensions: <strong className="text-[#2d2d26]">{formatCurrency(stats.extensionRevenue)}</strong></span>
          </div>
        </div>

        {/* Metric 2: Books Overdue */}
        <div 
          onClick={() => onNavigateToRentals('overdue')}
          className={`rounded-3xl p-6 border transition-all cursor-pointer ${
            stats.overdueCount > 0 
              ? 'border-rose-300 bg-rose-50/40 hover:bg-rose-50/70 shadow-xs' 
              : 'bg-white border-[#f0eee4] shadow-xs hover:border-[#e2e0d5]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8c8c7d]">
              Books Overdue
            </span>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
              stats.overdueCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-[#efede4] text-[#8c8c7d]'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-serif font-bold mb-2 ${
            stats.overdueCount > 0 ? 'text-rose-700' : 'text-[#2d2d26]'
          }`}>
            {stats.overdueCount}
          </div>
          <div className="flex items-center justify-between text-xs text-[#8c8c7d] pt-3 border-t border-[#f0eee4]">
            <span>Action Required</span>
            <span className="text-[#5A5A40] font-medium flex items-center">
              Inspect list <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Metric 3: Active Loans & Capacity */}
        <div 
          onClick={() => onNavigateToRentals('active')}
          className="bg-white rounded-3xl p-6 border border-[#f0eee4] shadow-xs hover:border-[#e2e0d5] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8c8c7d]">
              Active Borrowings
            </span>
            <div className="w-9 h-9 rounded-full bg-[#efede4] text-[#5A5A40] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-serif font-bold text-[#2d2d26] mb-2">
            {stats.activeRentalsCount}
          </div>
          <div className="flex items-center justify-between text-xs text-[#8c8c7d] pt-3 border-t border-[#f0eee4]">
            <span>In circulation: <strong className="text-[#2d2d26]">{stats.borrowedCopies}</strong></span>
            <span>On shelves: <strong className="text-[#2d2d26]">{stats.availableCopies}</strong></span>
          </div>
        </div>

        {/* Metric 4: Library Catalog & Members */}
        <div 
          onClick={onNavigateToBooks}
          className="bg-white rounded-3xl p-6 border border-[#f0eee4] shadow-xs hover:border-[#e2e0d5] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8c8c7d]">
              Catalog Volumes
            </span>
            <div className="w-9 h-9 rounded-full bg-[#efede4] text-[#5A5A40] flex items-center justify-center">
              <BookMarked className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-serif font-bold text-[#2d2d26] mb-2">
            {stats.totalBooks}
          </div>
          <div className="flex items-center justify-between text-xs text-[#8c8c7d] pt-3 border-t border-[#f0eee4]">
            <span>Total Copies: <strong className="text-[#2d2d26]">{stats.totalCopies}</strong></span>
            <span>Members: <strong className="text-[#2d2d26]">{stats.totalMembers}</strong></span>
          </div>
        </div>
      </div>

      {/* Library Loan Rate & Pricing Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#f0eee4] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#efede4] text-[#5A5A40] flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base sm:text-lg font-bold text-[#2d2d26]">
                Universal Loan Rate: <span className="font-mono text-[#5A5A40]">{formatCurrency(overallRate)}</span> / week
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#efede4] text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider">
                Configurable
              </span>
            </div>
            <p className="text-xs text-[#8c8c7d] mt-0.5">
              Standard borrowing fee charged upon checkout and for each weekly extension up to 4 weeks max.
            </p>
          </div>
        </div>
        {onOpenOverallRateModal && (
          <button
            onClick={onOpenOverallRateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize Library Pricing</span>
          </button>
        )}
      </div>

      {/* Top Revenue Book Showcase & Overdue Attention Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Lucrative Book Card */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-[#f0eee4] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#efede4] text-[#5A5A40] flex items-center justify-center shadow-2xs">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">
                    Highest Revenue Book
                  </h3>
                  <p className="text-xs text-[#8c8c7d] italic">Top earning title in catalog</p>
                </div>
              </div>
            </div>

            {stats.topRevenueBook?.book ? (
              <div className="flex gap-4 items-start">
                <div className="w-20 h-28 rounded-xl overflow-hidden bg-[#efede4] shrink-0 shadow-xs border border-[#e2e0d5] relative">
                  {stats.topRevenueBook.book.cover_url ? (
                    <img
                      src={stats.topRevenueBook.book.cover_url}
                      alt={stats.topRevenueBook.book.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#5A5A40] text-white p-1 text-center">
                      <BookMarked className="w-6 h-6 mb-1 opacity-70" />
                      <span className="text-[9px] line-clamp-2">{stats.topRevenueBook.book.title}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-serif font-bold text-[#2d2d26] text-base leading-tight truncate">
                    {stats.topRevenueBook.book.title}
                  </h4>
                  <p className="text-xs text-[#8c8c7d] truncate mb-2 italic">
                    by {stats.topRevenueBook.book.author}
                  </p>
                  
                  <div className="space-y-1">
                    <div className="inline-flex items-baseline gap-1.5 bg-[#dcfce7] px-2 py-0.5 rounded-full text-[#166534]">
                      <span className="text-[11px] font-medium">Earned:</span>
                      <span className="text-xs font-bold font-mono">
                        {formatCurrency(stats.topRevenueBook.revenue)}
                      </span>
                    </div>
                    <p className="text-xs text-[#8c8c7d]">
                      {stats.topRevenueBook.rentalCount} checkout transaction{stats.topRevenueBook.rentalCount === 1 ? '' : 's'}
                    </p>
                    <p className="text-xs text-[#5A5A40] font-semibold">
                      Fee: {formatCurrency(stats.topRevenueBook.book.weekly_fee)} / week
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-[#8c8c7d] text-sm">
                No revenue transactions recorded yet.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#f0eee4] flex items-center justify-between text-xs">
            <span className="text-[#8c8c7d]">Stock Availability</span>
            <span className="font-semibold text-[#2d2d26]">
              {stats.topRevenueBook?.book?.available_copies ?? 0} of {stats.topRevenueBook?.book?.total_copies ?? 0} available
            </span>
          </div>
        </div>

        {/* Real-Time Circulation Activity Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#f0eee4] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2d2d26]">
                Recent Circulation Activity
              </h3>
              <p className="text-xs text-[#8c8c7d]">
                Real-time tracking of active loans, extensions, and book returns
              </p>
            </div>
            <button
              onClick={() => onNavigateToRentals()}
              className="text-xs font-semibold text-[#5A5A40] hover:text-[#2d2d26] flex items-center gap-1"
            >
              <span>View All ({rentals.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#f0eee4] text-[#8c8c7d] uppercase tracking-widest font-semibold text-[10px]">
                  <th className="pb-2.5">Book Title</th>
                  <th className="pb-2.5">Borrower</th>
                  <th className="pb-2.5">Due Date & Timeline</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Revenue</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8f7f2]">
                {recentRentals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#8c8c7d]">
                      No rental records found. Click &quot;Borrow Book&quot; to issue the first loan!
                    </td>
                  </tr>
                ) : (
                  recentRentals.map(rental => {
                    const dueInfo = getDueDateRelative(rental.due_date, rental.status === 'returned');
                    const isMaxWeeks = rental.weeks_borrowed >= 4;

                    return (
                      <tr key={rental.id} className="hover:bg-[#faf9f5] transition-colors">
                        <td className="py-3 pr-2">
                          <div className="font-semibold text-[#2d2d26] truncate max-w-[180px]">
                            {rental.book?.title || 'Unknown Title'}
                          </div>
                          <div className="text-[#8c8c7d] text-[11px] truncate max-w-[180px] italic">
                            {rental.book?.author}
                          </div>
                        </td>

                        <td className="py-3 pr-2">
                          <div className="font-medium text-[#2d2d26] truncate max-w-[140px]">
                            {rental.member?.full_name || 'Member'}
                          </div>
                          <div className="text-[11px] text-[#8c8c7d] font-mono">
                            {rental.member?.membership_number}
                          </div>
                        </td>

                        <td className="py-3 pr-2 whitespace-nowrap">
                          <div className="font-medium text-[#2d2d26]">
                            {formatDate(rental.due_date)}
                          </div>
                          <div className={`text-[11px] font-medium ${
                            dueInfo.isOverdue ? 'text-rose-700' : 'text-[#8c8c7d]'
                          }`}>
                            {dueInfo.label}
                          </div>
                        </td>

                        <td className="py-3 pr-2 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                            rental.status === 'returned'
                              ? 'bg-[#efede4] text-[#5A5A40]'
                              : rental.status === 'overdue'
                              ? 'bg-[#fee2e2] text-[#991b1b]'
                              : rental.status === 'extended'
                              ? 'bg-[#fef3c7] text-[#92400e]'
                              : 'bg-[#dcfce7] text-[#166534]'
                          }`}>
                            {rental.status === 'extended' && 'Extended Loan'}
                            {rental.status === 'active' && 'Active Loan'}
                            {rental.status === 'overdue' && 'Overdue'}
                            {rental.status === 'returned' && 'Returned'}
                          </span>
                        </td>

                        <td className="py-3 pr-2 font-mono font-medium text-[#2d2d26] whitespace-nowrap">
                          {formatCurrency(rental.total_fees_paid)}
                        </td>

                        <td className="py-3 text-right whitespace-nowrap">
                          {rental.status !== 'returned' ? (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => onReturnRental(rental)}
                                className="px-2.5 py-1 bg-[#efede4] hover:bg-[#e6e4d9] text-[#5A5A40] border border-[#e2e0d5] rounded-md font-medium text-[11px] transition-colors"
                                title="Mark Book as Returned"
                              >
                                Return
                              </button>
                              
                              <button
                                onClick={() => onExtendRental(rental)}
                                disabled={isMaxWeeks}
                                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                                  isMaxWeeks
                                    ? 'bg-[#efede4] text-[#8c8c7d] cursor-not-allowed'
                                    : 'bg-[#5A5A40] hover:bg-[#484833] text-white'
                                }`}
                                title={isMaxWeeks ? '4 weeks maximum reached' : 'Extend +1 week (Collect weekly fee)'}
                              >
                                {isMaxWeeks ? 'Max 4 Wks' : 'Extend'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8c8c7d] font-medium">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rules Notice and Feature Highlights */}
      <div className="bg-[#efede4] rounded-3xl p-6 border border-[#e2e0d5] grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-[#434338]">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-white text-[#5A5A40] border border-[#e2e0d5] flex items-center justify-center shrink-0 font-bold text-xs">
            1
          </div>
          <div>
            <h4 className="font-semibold text-[#2d2d26] mb-0.5">Weekly Billing Standard</h4>
            <p className="text-[#8c8c7d]">Every book is borrowed at a transparent weekly fee, billed up-front upon checkout and on each extension.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-white text-[#5A5A40] border border-[#e2e0d5] flex items-center justify-center shrink-0 font-bold text-xs">
            2
          </div>
          <div>
            <h4 className="font-semibold text-[#2d2d26] mb-0.5">4-Week Borrowing Ceiling</h4>
            <p className="text-[#8c8c7d]">Borrowers can retain a book for up to 4 consecutive weeks maximum. After 4 weeks, the system requires immediate return.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-white text-[#5A5A40] border border-[#e2e0d5] flex items-center justify-center shrink-0 font-bold text-xs">
            3
          </div>
          <div>
            <h4 className="font-semibold text-[#2d2d26] mb-0.5">Retained Member History</h4>
            <p className="text-[#8c8c7d]">Borrower profiles maintain complete audit trails with contact info, current loans, and lifetime revenue contribution.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
