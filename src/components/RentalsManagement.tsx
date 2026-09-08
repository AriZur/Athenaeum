import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BookOpen, 
  Search, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RotateCw, 
  User, 
  DollarSign, 
  ChevronRight, 
  LayoutGrid, 
  Table as TableIcon,
  Phone,
  Mail,
  History,
  Info,
  Layers,
  Trash2
} from 'lucide-react';
import { RentalWithDetails, Book } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../lib/formatters';
import { fetchRentalsPaginated, fetchRentalStatusCounts } from '../lib/api';
import { Pagination } from './Pagination';

interface RentalsManagementProps {
  initialFilter?: string;
  onReturnRental: (rental: RentalWithDetails) => void;
  onExtendRental: (rental: RentalWithDetails) => void;
  onDeleteRental?: (rental: RentalWithDetails) => void;
  onOpenBorrowModal: (book?: Book) => void;
  onSelectMember: (memberId: string) => void;
  accountId?: string;
  refreshTrigger?: number;
}

export const RentalsManagement: React.FC<RentalsManagementProps> = ({
  initialFilter = 'all',
  onReturnRental,
  onExtendRental,
  onDeleteRental,
  onOpenBorrowModal,
  onSelectMember,
  accountId,
  refreshTrigger = 0,
}) => {
  // Pagination & Filter State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalRentals, setTotalRentals] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [rentals, setRentals] = useState<RentalWithDetails[]>([]);
  const [isListLoading, setIsListLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tab filter & Search
  const [filter, setFilter] = useState<string>(initialFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedRentalForDetail, setSelectedRentalForDetail] = useState<RentalWithDetails | null>(null);

  // Tab Status Counts
  const [statusCounts, setStatusCounts] = useState<{
    total: number;
    active: number;
    extended: number;
    overdue: number;
    returned: number;
  }>({ total: 0, active: 0, extended: 0, overdue: 0, returned: 0 });

  // Debounce search input
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setCurrentPage(1);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // Fetch status counts on mount or refresh
  const loadStatusCounts = useCallback(async () => {
    try {
      const counts = await fetchRentalStatusCounts(accountId);
      setStatusCounts(counts);
    } catch (err) {
      console.error('Failed to fetch rental status counts:', err);
    }
  }, [accountId]);

  useEffect(() => {
    loadStatusCounts();
  }, [loadStatusCounts, refreshTrigger]);

  // Load paginated rentals independently for the current list section
  const loadRentals = useCallback(async () => {
    setIsListLoading(true);
    setError(null);
    try {
      const res = await fetchRentalsPaginated({
        page: currentPage,
        pageSize,
        status: filter,
        search: debouncedSearch,
        accountId,
      });
      setRentals(res.items);
      setTotalRentals(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch paginated rentals:', err);
      setError('Unable to load loan records. Please retry.');
    } finally {
      setIsListLoading(false);
    }
  }, [currentPage, pageSize, filter, debouncedSearch, accountId]);

  useEffect(() => {
    loadRentals();
  }, [loadRentals, refreshTrigger]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Helper for due date badge
  const getDueDateRelative = (dueDateStr: string, isReturned: boolean) => {
    if (isReturned) return { text: 'Closed', days: 0, urgent: false, overdue: false };
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)}d overdue`,
        days: diffDays,
        urgent: true,
        overdue: true,
      };
    } else if (diffDays === 0) {
      return { text: 'Due today', days: 0, urgent: true, overdue: false };
    } else if (diffDays <= 2) {
      return { text: `Due in ${diffDays}d`, days: diffDays, urgent: true, overdue: false };
    }
    return { text: `Due in ${diffDays}d`, days: diffDays, urgent: false, overdue: false };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Title - Always visible & responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2d2d26]">
            Circulation & Loan Tracking
          </h1>
          <p className="text-[#8c8c7d] text-xs sm:text-sm mt-1">
            Manage active loans, enforce 4-week holding limits, process weekly renewals, and record returns.
          </p>
        </div>

        <button
          onClick={() => onOpenBorrowModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span>New Borrow Transaction</span>
        </button>
      </div>

      {/* Filter Tabs, Search Bar & Responsive View Mode Toggle - Always responsive & interactive */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#f0eee4] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs with live counts */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'bg-[#efede4] text-[#5A5A40] hover:bg-[#e6e4d9]'
              }`}
            >
              All Loans ({statusCounts.total})
            </button>

            <button
              onClick={() => handleFilterChange('active')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                filter === 'active'
                  ? 'bg-[#166534] text-white shadow-xs'
                  : 'bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]'
              }`}
            >
              Active ({statusCounts.active})
            </button>

            <button
              onClick={() => handleFilterChange('overdue')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                filter === 'overdue'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-[#fee2e2] text-[#991b1b] hover:bg-rose-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Overdue ({statusCounts.overdue})
            </button>

            <button
              onClick={() => handleFilterChange('extended')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                filter === 'extended'
                  ? 'bg-[#b45309] text-white shadow-xs'
                  : 'bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a]'
              }`}
            >
              Extended ({statusCounts.extended})
            </button>

            <button
              onClick={() => handleFilterChange('returned')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                filter === 'returned'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'bg-[#efede4] text-[#5A5A40] hover:bg-[#e6e4d9]'
              }`}
            >
              Returned ({statusCounts.returned})
            </button>
          </div>

          {/* Search Box & View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#8c8c7d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search borrower or book..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-full text-xs text-[#2d2d26] placeholder:text-[#8c8c7d] focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40] focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center bg-[#efede4] p-1 rounded-full border border-[#e2e0d5] shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-[#2d2d26] shadow-2xs' : 'text-[#8c8c7d] hover:text-[#2d2d26]'
                }`}
                title="Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-[#2d2d26] shadow-2xs' : 'text-[#8c8c7d] hover:text-[#2d2d26]'
                }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4-Week Max Extension Policy Notice */}
        <div className="flex items-start sm:items-center gap-2 p-3 bg-[#f8f7f2] border border-[#e2e0d5] rounded-2xl text-xs text-[#5A5A40]">
          <Info className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-[#5A5A40]" />
          <p className="leading-tight">
            <strong>Standard Lending Policy:</strong> Books are checked out for 1 week and can be renewed up to 3 additional weeks (maximum 4 weeks total holding period) to prevent hoarding.
          </p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadRentals()}
            className="font-bold underline ml-3 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* INDEPENDENT LIST SECTION */}
      <div className="relative min-h-[350px]">
        {isListLoading ? (
          /* Sleek Skeleton Loading - only the list section shimmers! */
          viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: pageSize > 6 ? 6 : pageSize }).map((_, i) => (
                <div
                  key={`rental-skeleton-${i}`}
                  className="bg-white rounded-3xl border border-[#f0eee4] p-5 shadow-xs animate-pulse space-y-4"
                >
                  <div className="flex gap-3">
                    <div className="w-16 h-22 bg-[#efede4] rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[#efede4] rounded-md w-3/4" />
                      <div className="h-3 bg-[#efede4] rounded-md w-1/2" />
                      <div className="h-3 bg-[#efede4] rounded-md w-1/3" />
                    </div>
                  </div>
                  <div className="h-16 bg-[#efede4]/50 rounded-2xl" />
                  <div className="h-9 bg-[#efede4] rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#f0eee4] shadow-xs overflow-hidden p-6 animate-pulse space-y-4">
              <div className="h-6 bg-[#efede4] rounded-md w-1/4" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`row-skeleton-${i}`} className="h-12 bg-[#efede4]/40 rounded-xl" />
              ))}
            </div>
          )
        ) : rentals.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#f0eee4] p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#efede4] text-[#5A5A40] flex items-center justify-center">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#2d2d26]">
              No loan records found
            </h3>
            <p className="text-xs text-[#8c8c7d] max-w-md">
              {debouncedSearch
                ? `No circulation records match "${debouncedSearch}". Try clearing your search query.`
                : filter !== 'all'
                ? `There are currently no loans in the "${filter}" category.`
                : 'No book loans have been issued yet. Click "New Borrow Transaction" above to issue a volume.'}
            </p>
            <button
              onClick={() => onOpenBorrowModal()}
              className="mt-2 px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
            >
              Issue Book Loan
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          /* RESPONSIVE CARDS VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {rentals.map((rental) => {
              const dueInfo = getDueDateRelative(rental.due_date, rental.status === 'returned');
              const isMaxWeeks = rental.weeks_borrowed >= 4;
              const isReturned = rental.status === 'returned';

              return (
                <div
                  key={rental.id}
                  className={`bg-white rounded-3xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                    rental.status === 'overdue'
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : 'border-[#f0eee4] hover:border-[#5A5A40]/40'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Row: Book Spine & Title + Status Pill */}
                    <div className="flex gap-3 items-start justify-between">
                      <div className="flex gap-3 items-start flex-1 min-w-0">
                        <div className="w-14 h-20 rounded-xl overflow-hidden bg-[#efede4] shrink-0 border border-[#e2e0d5] shadow-2xs flex items-center justify-center">
                          {rental.book?.cover_url ? (
                            <img
                              src={rental.book.cover_url}
                              alt={rental.book.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#5A5A40] text-white flex flex-col justify-between p-1.5 text-[9px]">
                              <span className="font-mono text-[8px] opacity-75">BOOK</span>
                              <span className="font-serif font-bold line-clamp-2 leading-tight">
                                {rental.book?.title}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-serif font-bold text-sm text-[#2d2d26] leading-snug line-clamp-2">
                            {rental.book?.title || 'Unknown Title'}
                          </h3>
                          <p className="text-xs text-[#8c8c7d] truncate italic mt-0.5">
                            by {rental.book?.author || 'Unknown'}
                          </p>

                          {rental.book?.isbn && (
                            <p className="text-[10px] text-[#8c8c7d] font-mono mt-1">
                              ISBN: {rental.book.isbn}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          rental.status === 'returned'
                            ? 'bg-[#efede4] text-[#5A5A40]'
                            : rental.status === 'overdue'
                            ? 'bg-[#fee2e2] text-[#991b1b] border border-rose-200'
                            : rental.status === 'extended'
                            ? 'bg-[#fef3c7] text-[#92400e] border border-amber-200'
                            : 'bg-[#dcfce7] text-[#166534]'
                        }`}
                      >
                        {rental.status}
                      </span>
                    </div>

                    {/* Borrower Box */}
                    <div className="bg-[#f8f7f2] p-3 rounded-2xl border border-[#f0eee4] flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#efede4] text-[#5A5A40] flex items-center justify-center shrink-0 font-bold text-xs">
                          {rental.member?.full_name?.charAt(0) || 'M'}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => rental.member_id && onSelectMember(rental.member_id)}
                            className="font-semibold text-xs text-[#2d2d26] hover:text-[#5A5A40] transition-colors truncate block text-left cursor-pointer"
                            title="View borrower details & history"
                          >
                            {rental.member?.full_name || 'Anonymous Borrower'}
                          </button>
                          <div className="flex items-center gap-2 text-[11px] text-[#8c8c7d]">
                            <span className="font-mono">{rental.member?.membership_number}</span>
                            {rental.member?.phone && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{rental.member.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-[#8c8c7d] shrink-0" />
                    </div>

                    {/* Timeline & Policy Indicator */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-[#e2e0d5]/60">
                        <div className="text-[10px] uppercase font-bold text-[#8c8c7d] flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Borrowed
                        </div>
                        <div className="font-semibold text-[#2d2d26] mt-0.5">
                          {formatDate(rental.borrow_date)}
                        </div>
                      </div>

                      <div
                        className={`p-2.5 rounded-xl border ${
                          dueInfo.overdue
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : dueInfo.urgent
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-white border-[#e2e0d5]/60 text-[#2d2d26]'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold text-[#8c8c7d] flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due Date
                          </span>
                          {!isReturned && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                dueInfo.overdue
                                  ? 'bg-rose-600 text-white'
                                  : dueInfo.urgent
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-[#efede4] text-[#5A5A40]'
                              }`}
                            >
                              {dueInfo.text}
                            </span>
                          )}
                        </div>
                        <div className="font-semibold mt-0.5">
                          {isReturned && rental.return_date ? (
                            <span className="text-[#166534]">
                              Returned {formatDate(rental.return_date)}
                            </span>
                          ) : (
                            formatDate(rental.due_date)
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 4-Week Holding Progression Bar */}
                    <div className="p-2.5 bg-[#efede4]/40 rounded-xl border border-[#e2e0d5]/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#8c8c7d] font-medium flex items-center gap-1">
                          <RotateCw className="w-3 h-3 text-[#5A5A40]" />
                          Week {rental.weeks_borrowed} of 4 Max Hold
                        </span>
                        <span className="font-mono font-bold text-[#2d2d26]">
                          {formatCurrency(rental.total_fees_paid)} Paid
                        </span>
                      </div>

                      {/* 4 segments representing the 4 allowable weeks */}
                      <div className="grid grid-cols-4 gap-1 h-2">
                        {[1, 2, 3, 4].map((step) => {
                          const isFilled = step <= rental.weeks_borrowed;
                          return (
                            <div
                              key={step}
                              className={`rounded-full transition-all ${
                                isFilled
                                  ? step === 4
                                    ? 'bg-[#b45309]'
                                    : 'bg-[#5A5A40]'
                                  : 'bg-[#e2e0d5]'
                              }`}
                              title={`Week ${step}`}
                            />
                          );
                        })}
                      </div>

                      {isMaxWeeks ? (
                        <div className="text-[11px] text-amber-800 font-semibold flex items-center justify-between">
                          <span>Max 4-week holding reached. Must be returned.</span>
                          {rental.renewals && rental.renewals.length > 0 && (
                            <button
                              onClick={() => setSelectedRentalForDetail(rental)}
                              className="underline text-[#5A5A40] text-[10px] cursor-pointer"
                            >
                              Ledger
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[#8c8c7d]">
                          <span>4-Wk Max Hold Policy</span>
                          {rental.renewals && rental.renewals.length > 0 ? (
                            <button
                              onClick={() => setSelectedRentalForDetail(rental)}
                              className="text-[11px] text-[#5A5A40] underline font-semibold flex items-center gap-0.5 cursor-pointer"
                            >
                              <History className="w-3 h-3" />
                              <span>{rental.renewals.length} extension(s)</span>
                            </button>
                          ) : (
                            <span className="text-[10px]">Renewable weekly</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-2 border-t border-[#f0eee4] flex items-center gap-2 mt-4">
                    {!isReturned ? (
                      <>
                        <button
                          onClick={() => onReturnRental(rental)}
                          className="flex-1 py-2 px-3 bg-[#efede4] hover:bg-[#e6e4d9] text-[#5A5A40] border border-[#e2e0d5] rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Return Book</span>
                        </button>

                        <button
                          onClick={() => onExtendRental(rental)}
                          disabled={isMaxWeeks}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                            isMaxWeeks
                              ? 'bg-[#f0eee4] text-[#8c8c7d] border border-[#e2e0d5] cursor-not-allowed'
                              : 'bg-[#5A5A40] hover:bg-[#484833] text-white shadow-xs'
                          }`}
                          title={
                            isMaxWeeks
                              ? 'Cannot extend: 4-week maximum hold limit reached'
                              : `Extend 7 days (+${formatCurrency(rental.weekly_fee)})`
                          }
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>{isMaxWeeks ? 'Max Limit' : 'Extend (+7d)'}</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 py-1.5 text-center text-xs font-medium text-[#8c8c7d] bg-[#f8f7f2] rounded-xl border border-[#f0eee4]">
                        Returned on shelf
                      </div>
                    )}

                    {onDeleteRental && (
                      <button
                        onClick={() => onDeleteRental(rental)}
                        className="p-2 text-[#8c8c7d] hover:text-rose-700 hover:bg-rose-50 border border-[#e2e0d5] hover:border-rose-200 rounded-xl transition-colors cursor-pointer shrink-0"
                        title="Delete rental record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* RESPONSIVE DESKTOP TABLE VIEW */
          <div className="bg-white rounded-3xl border border-[#f0eee4] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[860px]">
                <thead className="bg-[#efede4]/50 border-b border-[#e2e0d5] text-[#8c8c7d] uppercase font-bold text-[10px] tracking-widest">
                  <tr>
                    <th className="py-3.5 px-4">Book Details</th>
                    <th className="py-3.5 px-4">Borrower Info</th>
                    <th className="py-3.5 px-4">Timeline (Borrowed & Due)</th>
                    <th className="py-3.5 px-4">Policy Status</th>
                    <th className="py-3.5 px-4">Fee Breakdown</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f8f7f2]">
                  {rentals.map((rental) => {
                    const dueInfo = getDueDateRelative(rental.due_date, rental.status === 'returned');
                    const isMaxWeeks = rental.weeks_borrowed >= 4;
                    const isReturned = rental.status === 'returned';

                    return (
                      <tr key={rental.id} className="hover:bg-[#faf9f5] transition-colors">
                        {/* Book Details */}
                        <td className="py-4 px-4 align-top">
                          <div className="flex gap-3 items-start">
                            <div className="w-10 h-14 rounded-lg overflow-hidden bg-[#efede4] shrink-0 border border-[#e2e0d5] shadow-2xs flex items-center justify-center">
                              {rental.book?.cover_url ? (
                                <img
                                  src={rental.book.cover_url}
                                  alt={rental.book.title}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <BookOpen className="w-4 h-4 text-[#5A5A40]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#2d2d26] text-sm leading-snug line-clamp-1">
                                {rental.book?.title || 'Unknown Title'}
                              </div>
                              <div className="text-[#8c8c7d] text-xs truncate italic">
                                by {rental.book?.author || 'Unknown'}
                              </div>
                              {rental.book?.isbn && (
                                <div className="text-[10px] text-[#8c8c7d] font-mono mt-0.5">
                                  ISBN: {rental.book.isbn}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Borrower Info */}
                        <td className="py-4 px-4 align-top">
                          <div className="space-y-1">
                            <button
                              onClick={() => rental.member_id && onSelectMember(rental.member_id)}
                              className="font-semibold text-[#2d2d26] hover:text-[#5A5A40] text-left transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <User className="w-3 h-3 text-[#8c8c7d]" />
                              <span>{rental.member?.full_name || 'Anonymous'}</span>
                            </button>
                            <div className="text-[11px] font-mono text-[#5A5A40]">
                              {rental.member?.membership_number}
                            </div>
                            {rental.member?.phone && (
                              <div className="text-[10px] text-[#8c8c7d] font-mono flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{rental.member.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Timeline */}
                        <td className="py-4 px-4 align-top space-y-1">
                          <div className="text-[#8c8c7d]">
                            Borrowed: <strong className="text-[#2d2d26]">{formatDate(rental.borrow_date)}</strong>
                          </div>
                          <div className={dueInfo.overdue ? 'text-rose-700 font-bold' : 'text-[#2d2d26]'}>
                            Due: {formatDate(rental.due_date)}{' '}
                            {!isReturned && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                                  dueInfo.overdue ? 'bg-rose-100 text-rose-800' : 'bg-[#efede4] text-[#5A5A40]'
                                }`}
                              >
                                {dueInfo.text}
                              </span>
                            )}
                          </div>
                          {isReturned && rental.return_date && (
                            <div className="text-[#166534] font-medium text-[11px]">
                              Returned: {formatDate(rental.return_date)}
                            </div>
                          )}
                        </td>

                        {/* Policy Status */}
                        <td className="py-4 px-4 align-top">
                          <div className="space-y-1.5">
                            <div className="font-semibold text-[#2d2d26]">
                              Week {rental.weeks_borrowed} of 4 Max
                            </div>
                            <div className="flex gap-1 w-24 h-1.5">
                              {[1, 2, 3, 4].map((w) => (
                                <div
                                  key={w}
                                  className={`flex-1 rounded-full ${
                                    w <= rental.weeks_borrowed
                                      ? w === 4
                                        ? 'bg-[#b45309]'
                                        : 'bg-[#5A5A40]'
                                      : 'bg-[#e2e0d5]'
                                  }`}
                                />
                              ))}
                            </div>
                            {rental.renewals && rental.renewals.length > 0 && (
                              <button
                                onClick={() => setSelectedRentalForDetail(rental)}
                                className="text-[10px] text-[#5A5A40] underline font-semibold flex items-center gap-0.5 cursor-pointer"
                              >
                                <History className="w-2.5 h-2.5" />
                                <span>{rental.renewals.length} extension(s)</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Fee Breakdown */}
                        <td className="py-4 px-4 align-top font-mono">
                          <div className="font-bold text-[#2d2d26] text-sm">
                            {formatCurrency(rental.total_fees_paid)}
                          </div>
                          <div className="text-[10px] text-[#8c8c7d]">
                            Rate: {formatCurrency(rental.weekly_fee)}/wk
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 align-top">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              rental.status === 'returned'
                                ? 'bg-[#efede4] text-[#5A5A40]'
                                : rental.status === 'overdue'
                                ? 'bg-[#fee2e2] text-[#991b1b]'
                                : rental.status === 'extended'
                                ? 'bg-[#fef3c7] text-[#92400e]'
                                : 'bg-[#dcfce7] text-[#166534]'
                            }`}
                          >
                            {rental.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isReturned ? (
                              <>
                                <button
                                  onClick={() => onReturnRental(rental)}
                                  className="px-3 py-1.5 bg-[#efede4] hover:bg-[#e6e4d9] text-[#5A5A40] border border-[#e2e0d5] rounded-full font-semibold text-[11px] transition-colors cursor-pointer"
                                >
                                  Return
                                </button>
                                <button
                                  onClick={() => onExtendRental(rental)}
                                  disabled={isMaxWeeks}
                                  className={`px-3 py-1.5 rounded-full font-semibold text-[11px] transition-colors cursor-pointer ${
                                    isMaxWeeks
                                      ? 'bg-[#f0eee4] text-[#8c8c7d] border border-[#e2e0d5] cursor-not-allowed'
                                      : 'bg-[#5A5A40] hover:bg-[#484833] text-white'
                                  }`}
                                >
                                  {isMaxWeeks ? 'Max Limit' : 'Extend (+7d)'}
                                </button>
                              </>
                            ) : (
                              <span className="text-[#8c8c7d] italic text-[11px] mr-1">Returned</span>
                            )}
                            {onDeleteRental && (
                              <button
                                onClick={() => onDeleteRental(rental)}
                                className="p-1.5 text-[#8c8c7d] hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-full transition-colors cursor-pointer"
                                title="Delete rental record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalRentals}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isListLoading}
        itemLabel="loans"
      />

      {/* Loan History & Extension Ledger Modal */}
      {selectedRentalForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d2d26]/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e2e0d5] space-y-4">
            <div className="flex items-start justify-between border-b border-[#f0eee4] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#2d2d26]">
                  Extension Ledger
                </h3>
                <p className="text-xs text-[#8c8c7d]">
                  {selectedRentalForDetail.book?.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedRentalForDetail(null)}
                className="text-[#8c8c7d] hover:text-[#2d2d26] text-sm font-semibold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-[#f8f7f2] rounded-2xl p-3 text-xs space-y-1.5 border border-[#f0eee4]">
                <div className="flex justify-between">
                  <span className="text-[#8c8c7d]">Borrower:</span>
                  <span className="font-semibold text-[#2d2d26]">
                    {selectedRentalForDetail.member?.full_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c8c7d]">Date Borrowed:</span>
                  <span className="font-medium text-[#2d2d26]">
                    {formatDate(selectedRentalForDetail.borrow_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c8c7d]">Loan Due Date:</span>
                  <span className="font-medium text-[#2d2d26]">
                    {formatDate(selectedRentalForDetail.due_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c8c7d]">Current Total Paid:</span>
                  <span className="font-bold text-[#2d2d26]">
                    {formatCurrency(selectedRentalForDetail.total_fees_paid)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8c8c7d]">
                  Weekly Extension Records
                </h4>
                {selectedRentalForDetail.renewals && selectedRentalForDetail.renewals.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedRentalForDetail.renewals.map((rn) => (
                      <div
                        key={rn.id}
                        className="p-2.5 rounded-xl border border-[#e2e0d5] bg-white text-xs flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold text-[#2d2d26]">
                            Extension Renewal (+7 Days)
                          </div>
                          <div className="text-[11px] text-[#8c8c7d]">
                            Approved: {formatDateTime(rn.renewed_at)}
                          </div>
                          {rn.notes && (
                            <div className="text-[10px] text-[#8c8c7d] italic">
                              {rn.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-[#166534]">
                            +{formatCurrency(rn.fee_amount)}
                          </div>
                          <div className="text-[10px] text-[#8c8c7d]">
                            Due {formatDate(rn.new_due_date)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8c8c7d] py-2">No extensions recorded yet.</p>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              {onDeleteRental && selectedRentalForDetail ? (
                <button
                  onClick={() => {
                    const toDelete = selectedRentalForDetail;
                    setSelectedRentalForDetail(null);
                    onDeleteRental(toDelete);
                  }}
                  className="px-4 py-2.5 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Loan Record</span>
                </button>
              ) : <div />}
              <button
                onClick={() => setSelectedRentalForDetail(null)}
                className="px-6 py-2.5 bg-[#5A5A40] text-white rounded-full text-xs font-semibold hover:bg-[#484833] uppercase tracking-wider cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
