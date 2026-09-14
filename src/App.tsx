/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { RentalsManagement } from './components/RentalsManagement';
import { BooksCatalog } from './components/BooksCatalog';
import { MembersDirectory } from './components/MembersDirectory';
import { BorrowModal } from './components/BorrowModal';
import { ExtendRentalModal } from './components/ExtendRentalModal';
import { ReturnRentalModal } from './components/ReturnRentalModal';
import { BookFormModal } from './components/BookFormModal';
import { MemberFormModal } from './components/MemberFormModal';
import { AuthModal } from './components/AuthModal';
import { LoginScreen } from './components/LoginScreen';
import { OverallRateModal } from './components/OverallRateModal';

import { 
  fetchBooks, 
  fetchMembers, 
  fetchRentals, 
  createRental, 
  extendRental, 
  returnRental, 
  addBook, 
  updateBook, 
  deleteBook, 
  addMember, 
  updateMember,
  deleteMember,
  deleteRental,
  computeDashboardStats,
  subscribeToLibraryChanges,
  fetchLibrarySettings,
  updateOverallWeeklyRate
} from './lib/api';
import { Book, Member, RentalWithDetails, DashboardStats } from './types';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

function LibraryApp() {
  const { isAdmin, loading: authLoading, accountId, activeAccount, userEmail } = useAuth();
  const currentAccountId = accountId || activeAccount?.email?.toLowerCase().trim() || userEmail?.toLowerCase().trim() || 'demo_user';
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rentals' | 'books' | 'members'>('dashboard');
  const [rentalsFilter, setRentalsFilter] = useState<string>('all');

  // Core Data State
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [rentals, setRentals] = useState<RentalWithDetails[]>([]);
  const [overallRate, setOverallRate] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(true);
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Modals
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [borrowPreselectedBook, setBorrowPreselectedBook] = useState<Book | null>(null);

  const [isOverallRateModalOpen, setIsOverallRateModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendingRental, setExtendingRental] = useState<RentalWithDetails | null>(null);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returningRental, setReturningRental] = useState<RentalWithDetails | null>(null);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [targetMemberHistoryId, setTargetMemberHistoryId] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load all data from Supabase for current account
  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [fetchedBooks, fetchedMembers, fetchedRentals, fetchedSettings] = await Promise.all([
        fetchBooks(currentAccountId),
        fetchMembers(currentAccountId),
        fetchRentals(currentAccountId),
        fetchLibrarySettings(currentAccountId),
      ]);
      setBooks(fetchedBooks);
      setMembers(fetchedMembers);
      setRentals(fetchedRentals);
      if (fetchedSettings && typeof fetchedSettings.overall_weekly_rate === 'number') {
        setOverallRate(fetchedSettings.overall_weekly_rate);
      }
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error('Failed to load library data:', err);
      showToast('Error syncing with database', 'error');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentAccountId]);

  useEffect(() => {
    if (!isAdmin) {
      setBooks([]);
      setMembers([]);
      setRentals([]);
      return;
    }

    loadData();

    // Setup Realtime Subscription
    const unsubscribe = subscribeToLibraryChanges(() => {
      loadData();
    });
    setRealtimeConnected(true);

    return () => {
      unsubscribe();
    };
  }, [loadData, isAdmin, currentAccountId]);

  // Compute Dashboard KPIs
  const stats: DashboardStats = React.useMemo(() => {
    return computeDashboardStats(books, rentals, members);
  }, [books, rentals, members]);

  // Borrow Flow
  const handleOpenBorrow = (book?: Book) => {
    setBorrowPreselectedBook(book || null);
    setIsBorrowModalOpen(true);
  };

  const handleConfirmBorrow = async (params: {
    bookId: string;
    memberId: string;
    notes?: string;
    borrowDate?: string;
    isHistoricalReturned?: boolean;
    returnDate?: string;
    weeksLoaned?: number;
    totalFeesPaid?: number;
  }) => {
    await createRental(params, currentAccountId);
    await loadData();
    showToast(
      params.isHistoricalReturned
        ? 'Previous loan & return record logged!'
        : 'Book loan successfully checked out!'
    );
  };

  // Register member inline or via modal
  const handleRegisterMember = async (memberData: {
    full_name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  }) => {
    const created = await addMember(memberData, currentAccountId);
    await loadData();
    showToast(`Member "${created.full_name}" registered!`);
    return created;
  };

  // Extend Rental Flow
  const handleOpenExtend = (rental: RentalWithDetails) => {
    setExtendingRental(rental);
    setIsExtendModalOpen(true);
  };

  const handleConfirmExtend = async (rentalId: string, notes?: string) => {
    await extendRental(rentalId, notes);
    await loadData();
    showToast('Loan period extended by 1 week (+fee assessed)!');
  };

  // Return Rental Flow
  const handleOpenReturn = (rental: RentalWithDetails) => {
    setReturningRental(rental);
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = async (rentalId: string, notes?: string) => {
    await returnRental(rentalId, notes);
    await loadData();
    showToast('Book returned and copy restored to shelves!');
  };

  // Book CRUD
  const handleSaveBook = async (bookData: any) => {
    if (editingBook) {
      await updateBook(editingBook.id, bookData);
      showToast(`Updated "${bookData.title}"!`);
    } else {
      await addBook(bookData, currentAccountId);
      showToast(`Added "${bookData.title}" to library catalog!`);
    }
    await loadData();
  };

  const handleDeleteBook = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove "${title}" from the catalog?`)) {
      try {
        await deleteBook(id);
        await loadData();
        showToast(`Removed "${title}" from catalog.`);
      } catch (err: any) {
        showToast('Cannot delete book with active rental records.', 'error');
      }
    }
  };

  // Member CRUD
  const handleSaveMember = async (memberData: any) => {
    if (editingMember) {
      await updateMember(editingMember.id, memberData);
      showToast(`Updated member "${memberData.full_name}"!`);
    } else {
      await addMember(memberData, currentAccountId);
      showToast(`Registered member "${memberData.full_name}"!`);
    }
    await loadData();
  };

  const handleDeleteMember = async (member: Member) => {
    if (window.confirm(`Are you sure you want to delete member "${member.full_name}" (${member.membership_number})? This action cannot be undone.`)) {
      try {
        await deleteMember(member.id);
        await loadData();
        showToast(`Member "${member.full_name}" deleted.`);
      } catch (err: any) {
        showToast(err.message || 'Cannot delete member with active loans.', 'error');
      }
    }
  };

  const handleDeleteRental = async (rental: RentalWithDetails) => {
    const bookTitle = rental.book?.title || 'Book loan';
    const borrower = rental.member?.full_name || 'Member';
    if (window.confirm(`Are you sure you want to delete this loan record for "${bookTitle}" (borrowed by ${borrower})?`)) {
      try {
        await deleteRental(rental.id);
        await loadData();
        showToast(`Loan record for "${bookTitle}" deleted.`);
      } catch (err: any) {
        showToast(err.message || 'Failed to delete rental record.', 'error');
      }
    }
  };

  const handleSaveOverallRate = async (newRate: number) => {
    await updateOverallWeeklyRate(newRate, currentAccountId);
    setOverallRate(newRate);
    showToast(`Overall weekly rate set to KSh ${newRate} across all books!`);
    await loadData();
  };

  const handleSelectMemberHistory = (memberId: string) => {
    setTargetMemberHistoryId(memberId);
    setActiveTab('members');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8f7f2] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 text-[#5A5A40] animate-spin" />
        <div className="font-serif text-xl font-bold text-[#2d2d26]">
          Athenaeum
        </div>
        <p className="text-xs text-[#8c8c7d]">
          Loading library archives...
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#f8f7f2] text-[#434338] flex flex-col font-sans selection:bg-[#efede4] selection:text-[#5A5A40]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 ${
            toastMessage.type === 'success'
              ? 'bg-[#2d2d26] text-[#f8f7f2] border-[#5A5A40]'
              : 'bg-rose-700 text-white border-rose-800'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBorrowModal={() => handleOpenBorrow()}
        onOpenAddBookModal={() => {
          setEditingBook(null);
          setIsBookModalOpen(true);
        }}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        realtimeConnected={realtimeConnected}
        overdueCount={stats.overdueCount}
        activeRentalsCount={stats.activeRentalsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#5A5A40] animate-spin" />
            <div className="font-serif text-lg font-bold text-[#2d2d26]">
              Connecting to Database...
            </div>
            <p className="text-xs text-[#8c8c7d] max-w-sm">
              Loading library catalog, member archives, and active weekly loan records.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardOverview
                stats={stats}
                rentals={rentals}
                onNavigateToRentals={(filter) => {
                  if (filter) setRentalsFilter(filter);
                  setActiveTab('rentals');
                }}
                onNavigateToBooks={() => setActiveTab('books')}
                onNavigateToMembers={() => setActiveTab('members')}
                onOpenBorrowModal={handleOpenBorrow}
                onReturnRental={handleOpenReturn}
                onExtendRental={handleOpenExtend}
              />
            )}

            {activeTab === 'rentals' && (
              <RentalsManagement
                initialFilter={rentalsFilter}
                onReturnRental={handleOpenReturn}
                onExtendRental={handleOpenExtend}
                onDeleteRental={handleDeleteRental}
                onOpenBorrowModal={handleOpenBorrow}
                onSelectMember={handleSelectMemberHistory}
                accountId={currentAccountId || undefined}
                refreshTrigger={refreshTrigger}
              />
            )}

            {activeTab === 'books' && (
              <BooksCatalog
                overallRate={overallRate}
                onOpenOverallRateModal={() => setIsOverallRateModalOpen(true)}
                onOpenAddBookModal={() => {
                  setEditingBook(null);
                  setIsBookModalOpen(true);
                }}
                onOpenEditBookModal={(b) => {
                  setEditingBook(b);
                  setIsBookModalOpen(true);
                }}
                onDeleteBook={handleDeleteBook}
                onOpenBorrowModal={handleOpenBorrow}
                accountId={currentAccountId || undefined}
                refreshTrigger={refreshTrigger}
              />
            )}

            {activeTab === 'members' && (
              <MembersDirectory
                selectedMemberId={targetMemberHistoryId}
                onOpenAddMemberModal={() => {
                  setEditingMember(null);
                  setIsMemberModalOpen(true);
                }}
                onOpenEditMemberModal={(m) => {
                  setEditingMember(m);
                  setIsMemberModalOpen(true);
                }}
                onDeleteMember={handleDeleteMember}
                accountId={currentAccountId || undefined}
                refreshTrigger={refreshTrigger}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e0d5] bg-[#efede4]/50 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8c8c7d]">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-[#2d2d26]">Athenaeum</span>
            <span>•</span>
            <span>PostgreSQL & Realtime Sync</span>
          </div>
          <div className="flex items-center gap-4 font-medium">
            <span>Weekly Fee Model</span>
            <span>•</span>
            <span>Max 4-Week Hold Policy</span>
            <span>•</span>
            <span>Permanent Borrower History</span>
          </div>
        </div>
      </footer>

      {/* All Dialogs & Modals */}
      <BorrowModal
        books={books}
        members={members}
        preselectedBook={borrowPreselectedBook}
        isOpen={isBorrowModalOpen}
        onClose={() => setIsBorrowModalOpen(false)}
        onConfirmBorrow={handleConfirmBorrow}
        onRegisterMember={handleRegisterMember}
      />

      <ExtendRentalModal
        rental={extendingRental}
        isOpen={isExtendModalOpen}
        onClose={() => {
          setIsExtendModalOpen(false);
          setExtendingRental(null);
        }}
        onConfirmExtend={handleConfirmExtend}
      />

      <ReturnRentalModal
        rental={returningRental}
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setReturningRental(null);
        }}
        onConfirmReturn={handleConfirmReturn}
      />

      <BookFormModal
        book={editingBook}
        overallRate={overallRate}
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false);
          setEditingBook(null);
        }}
        onSubmit={handleSaveBook}
      />

      <OverallRateModal
        isOpen={isOverallRateModalOpen}
        currentRate={overallRate}
        onClose={() => setIsOverallRateModalOpen(false)}
        onSaveRate={handleSaveOverallRate}
      />

      <MemberFormModal
        member={editingMember}
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setEditingMember(null);
        }}
        onSubmit={handleSaveMember}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LibraryApp />
    </AuthProvider>
  );
}
