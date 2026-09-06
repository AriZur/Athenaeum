import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  History, 
  BookOpen, 
  Edit,
  RefreshCw
} from 'lucide-react';
import { Member, RentalWithDetails } from '../types';
import { formatCurrency, formatDate } from '../lib/formatters';
import { fetchMembersPaginated, fetchRentalsPaginated } from '../lib/api';
import { Pagination } from './Pagination';

interface MembersDirectoryProps {
  selectedMemberId?: string | null;
  onOpenAddMemberModal: () => void;
  onOpenEditMemberModal: (member: Member) => void;
  accountId?: string;
  refreshTrigger?: number;
}

export const MembersDirectory: React.FC<MembersDirectoryProps> = ({
  selectedMemberId,
  onOpenAddMemberModal,
  onOpenEditMemberModal,
  accountId,
  refreshTrigger = 0,
}) => {
  // Pagination & Filter State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberStats, setMemberStats] = useState<Record<string, { totalRentals: number; activeRentals: number; totalSpent: number }>>({});
  const [isListLoading, setIsListLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search Controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // History Drawer / Modal
  const [activeHistoryMember, setActiveHistoryMember] = useState<Member | null>(null);
  const [memberRentals, setMemberRentals] = useState<RentalWithDetails[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Debounce search
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

  // Load paginated members independently
  const loadMembers = useCallback(async () => {
    setIsListLoading(true);
    setError(null);
    try {
      const res = await fetchMembersPaginated({
        page: currentPage,
        pageSize,
        search: debouncedSearch,
        accountId,
      });
      setMembers(res.items);
      setTotalMembers(res.total);
      setTotalPages(res.totalPages);
      setMemberStats(res.memberStats || {});
    } catch (err: any) {
      console.error('Failed to fetch paginated members:', err);
      setError('Unable to load member directory. Please retry.');
    } finally {
      setIsListLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, accountId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers, refreshTrigger]);

  // Load rentals for history modal when activeHistoryMember is selected
  useEffect(() => {
    if (!activeHistoryMember) {
      setMemberRentals([]);
      return;
    }

    let isMounted = true;
    setIsLoadingHistory(true);
    fetchRentalsPaginated({
      memberId: activeHistoryMember.id,
      pageSize: 50,
      accountId,
    })
      .then((res) => {
        if (isMounted) setMemberRentals(res.items);
      })
      .catch((err) => {
        console.error('Failed to load member rentals:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeHistoryMember, accountId]);

  // Handle selectedMemberId passed from other views
  useEffect(() => {
    if (selectedMemberId) {
      const found = members.find((m) => m.id === selectedMemberId);
      if (found) {
        setActiveHistoryMember(found);
      }
    }
  }, [selectedMemberId, members]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & New Member Action - Always visible & responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2d2d26]">
            Library Members & Borrower Archives
          </h1>
          <p className="text-[#8c8c7d] text-sm mt-1">
            Maintain permanent borrower records with comprehensive rental transaction ledgers and contact details.
          </p>
        </div>

        <button
          onClick={onOpenAddMemberModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Member</span>
        </button>
      </div>

      {/* Search Bar & Counter - Always visible & interactive */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#f0eee4] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-[#8c8c7d] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search member by name, membership ID, email, or phone..."
            className="w-full pl-9 pr-4 py-2 bg-[#f8f7f2] border border-[#e2e0d5] rounded-full text-xs sm:text-sm text-[#2d2d26] placeholder:text-[#8c8c7d] focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40] focus:bg-white transition-all"
          />
        </div>
        <div className="text-xs text-[#8c8c7d] font-medium">
          Total Members: <strong className="text-[#2d2d26]">{totalMembers}</strong>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadMembers()}
            className="font-bold underline ml-3 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* INDEPENDENT LIST SECTION */}
      <div className="relative min-h-[350px]">
        {isListLoading ? (
          /* Sleek Skeleton Loading Grid - only the list section shimmers! */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: pageSize > 6 ? 6 : pageSize }).map((_, i) => (
              <div
                key={`member-skeleton-${i}`}
                className="bg-white rounded-3xl border border-[#f0eee4] p-6 shadow-xs animate-pulse space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-[#efede4] rounded-md w-1/2" />
                  <div className="h-4 bg-[#efede4] rounded-full w-16" />
                </div>
                <div className="h-16 bg-[#efede4]/50 rounded-2xl" />
                <div className="h-12 bg-[#efede4]/30 rounded-2xl" />
                <div className="h-8 bg-[#efede4] rounded-full w-full" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#f0eee4] p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#efede4] text-[#5A5A40] flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#2d2d26]">
              No registered library members found
            </h3>
            <p className="text-xs text-[#8c8c7d] max-w-md">
              {debouncedSearch
                ? `No members found matching "${debouncedSearch}". Try a different name, phone, or membership number.`
                : 'The member archives are currently empty. Register the first borrower to start issuing book loans and tracking rental histories.'}
            </p>
            <button
              onClick={onOpenAddMemberModal}
              className="mt-2 px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
            >
              Register First Member
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {members.map((member) => {
              const stats = memberStats[member.id] || { totalRentals: 0, activeRentals: 0, totalSpent: 0 };

              return (
                <div
                  key={member.id}
                  className="bg-white rounded-3xl border border-[#f0eee4] p-6 shadow-xs hover:border-[#5A5A40]/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Member Top Row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-bold text-[#2d2d26] text-base">
                            {member.full_name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              member.status === 'active'
                                ? 'bg-[#dcfce7] text-[#166534]'
                                : 'bg-[#efede4] text-[#5A5A40]'
                            }`}
                          >
                            {member.status}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-[#5A5A40] font-semibold">
                          {member.membership_number}
                        </span>
                      </div>

                      <button
                        onClick={() => onOpenEditMemberModal(member)}
                        className="p-1.5 text-[#8c8c7d] hover:text-[#2d2d26] hover:bg-[#efede4] rounded-full transition-colors cursor-pointer"
                        title="Edit contact info"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1.5 text-xs text-[#434338] mb-4 bg-[#f8f7f2] p-3.5 rounded-2xl border border-[#f0eee4]">
                      {member.phone && (
                        <div className="flex items-center gap-2 font-medium text-[#2d2d26]">
                          <Phone className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                          <span className="font-mono">{member.phone}</span>
                        </div>
                      )}
                      {member.email ? (
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-[#8c8c7d] shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      ) : !member.phone ? (
                        <div className="text-[#8c8c7d] italic">No contact details</div>
                      ) : null}
                      {member.address && (
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#8c8c7d] shrink-0" />
                          <span className="truncate">{member.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Rental Activity Metrics */}
                    <div className="grid grid-cols-3 gap-2 text-center py-2.5 bg-[#efede4]/50 rounded-2xl mb-4 text-xs border border-[#e2e0d5]/60">
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-[#8c8c7d]">
                          Total Loans
                        </div>
                        <div className="font-bold font-serif text-sm text-[#2d2d26]">
                          {stats.totalRentals}
                        </div>
                      </div>
                      <div className="border-x border-[#e2e0d5]">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-[#8c8c7d]">
                          Active Loans
                        </div>
                        <div
                          className={`font-bold font-serif text-sm ${
                            stats.activeRentals > 0 ? 'text-[#166534]' : 'text-[#8c8c7d]'
                          }`}
                        >
                          {stats.activeRentals}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-[#8c8c7d]">
                          Fees Paid
                        </div>
                        <div className="font-mono font-bold text-xs text-[#2d2d26] pt-0.5">
                          {formatCurrency(stats.totalSpent)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* View Full History Button */}
                  <button
                    onClick={() => setActiveHistoryMember(member)}
                    className="w-full py-2.5 bg-[#efede4] hover:bg-[#e6e4d9] text-[#5A5A40] border border-[#e2e0d5] rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Full Rental History ({stats.totalRentals})</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalMembers}
        pageSize={pageSize}
        pageSizeOptions={[12, 24, 48]}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isListLoading}
        itemLabel="members"
      />

      {/* Full Rental History Modal */}
      {activeHistoryMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d2d26]/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#e2e0d5] space-y-5 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#f0eee4] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl font-bold text-[#2d2d26]">
                    {activeHistoryMember.full_name}
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#efede4] text-[#5A5A40] border border-[#e2e0d5]">
                    {activeHistoryMember.membership_number}
                  </span>
                </div>
                <p className="text-xs text-[#8c8c7d] mt-0.5">
                  Complete lifetime borrowing archive & contact details
                </p>
              </div>
              <button
                onClick={() => setActiveHistoryMember(null)}
                className="text-[#8c8c7d] hover:text-[#2d2d26] font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Member Contact Card */}
            <div className="bg-[#f8f7f2] rounded-2xl p-3.5 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2 border border-[#f0eee4]">
              <div>
                <span className="text-[#8c8c7d] block text-[10px] uppercase font-bold tracking-wider">
                  Phone (with country code)
                </span>
                <span className="font-semibold text-[#2d2d26] font-mono">
                  {activeHistoryMember.phone || 'None listed'}
                </span>
              </div>
              <div>
                <span className="text-[#8c8c7d] block text-[10px] uppercase font-bold tracking-wider">
                  Email (optional)
                </span>
                <span className="font-medium text-[#2d2d26]">
                  {activeHistoryMember.email || 'None listed'}
                </span>
              </div>
              <div>
                <span className="text-[#8c8c7d] block text-[10px] uppercase font-bold tracking-wider">
                  Address
                </span>
                <span className="font-medium text-[#2d2d26]">
                  {activeHistoryMember.address || 'None listed'}
                </span>
              </div>
            </div>

            {/* Rentals List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8c8c7d]">
                Borrowing Ledger ({memberRentals.length} transaction{memberRentals.length === 1 ? '' : 's'})
              </h4>

              {isLoadingHistory ? (
                <div className="py-8 flex items-center justify-center text-xs text-[#8c8c7d] gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#5A5A40]" />
                  <span>Loading history records...</span>
                </div>
              ) : memberRentals.length === 0 ? (
                <div className="text-center py-8 text-[#8c8c7d] text-xs bg-[#f8f7f2] rounded-2xl border border-dashed border-[#e2e0d5]">
                  No books borrowed yet by this member.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {memberRentals.map((rental) => (
                    <div
                      key={rental.id}
                      className="p-3.5 rounded-2xl border border-[#f0eee4] bg-white hover:border-[#e2e0d5] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-[#efede4] shrink-0 border border-[#e2e0d5]">
                          {rental.book?.cover_url ? (
                            <img
                              src={rental.book.cover_url}
                              alt={rental.book.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#5A5A40] text-white">
                              <BookOpen className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="font-semibold text-[#2d2d26] text-sm">
                            {rental.book?.title}
                          </div>
                          <div className="text-[#8c8c7d] text-xs italic">
                            by {rental.book?.author}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8c8c7d]">
                            <span>Borrowed: {formatDate(rental.borrow_date)}</span>
                            <span>•</span>
                            <span>Duration: Week {rental.weeks_borrowed} of 4</span>
                            {rental.return_date && (
                              <>
                                <span>•</span>
                                <span className="text-[#166534]">
                                  Returned: {formatDate(rental.return_date)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-[#f0eee4] gap-1 shrink-0">
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
                        <div className="font-mono font-bold text-[#2d2d26] text-sm">
                          {formatCurrency(rental.total_fees_paid)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[#f0eee4] flex justify-end">
              <button
                onClick={() => setActiveHistoryMember(null)}
                className="px-4 py-2 bg-[#5A5A40] text-white rounded-full text-xs font-semibold hover:bg-[#484833] uppercase tracking-wider cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
