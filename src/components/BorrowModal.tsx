import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  User, 
  Calendar,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  History,
  Check
} from 'lucide-react';
import { Book, Member } from '../types';
import { formatCurrency, formatDate } from '../lib/formatters';
import { PhoneCountryInput, validatePhoneDigits } from './PhoneCountryInput';

interface BorrowModalProps {
  books: Book[];
  members: Member[];
  preselectedBook?: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmBorrow: (params: {
    bookId: string;
    memberId: string;
    notes?: string;
    borrowDate?: string;
    isHistoricalReturned?: boolean;
    returnDate?: string;
    weeksLoaned?: number;
    totalFeesPaid?: number;
  }) => Promise<void>;
  onRegisterMember: (memberData: {
    full_name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }) => Promise<Member>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Format a date object to YYYY-MM-DD
function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse YYYY-MM-DD safely into year, month (0-indexed), day
function parseDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m, day: d };
}

// Calculate elapsed whole calendar days between two YYYY-MM-DD strings
function getDaysDifference(startDateStr: string, endDateStr: string): number {
  const start = parseDateParts(startDateStr);
  const end = parseDateParts(endDateStr);
  if (!start || !end) return 0;
  const utcStart = Date.UTC(start.year, start.month, start.day);
  const utcEnd = Date.UTC(end.year, end.month, end.day);
  const diffMs = utcEnd - utcStart;
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

// Add days to a YYYY-MM-DD string
function addDaysToDateStr(dateStr: string, days: number): string {
  const p = parseDateParts(dateStr);
  if (!p) return dateStr;
  const d = new Date(Date.UTC(p.year, p.month, p.day));
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Calculate billed weeks based on elapsed days:
// 0 to 7 days = 1 week
// 8 to 14 days = 2 weeks
// 15 to 21 days = 3 weeks
// 22 to 28 days = 4 weeks
// >28 days = ceil(days / 7)
function calculateWeeksFromDays(days: number): number {
  if (days <= 7) return 1;
  return Math.ceil(days / 7);
}

export const BorrowModal: React.FC<BorrowModalProps> = ({
  books,
  members,
  preselectedBook,
  isOpen,
  onClose,
  onConfirmBorrow,
  onRegisterMember,
}) => {
  const todayStr = toDateStr(new Date());

  // Book selection state
  const [selectedBookId, setSelectedBookId] = useState<string>(preselectedBook?.id || '');
  const [bookSearchText, setBookSearchText] = useState<string>(preselectedBook?.title || '');
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState<boolean>(false);

  // Member selection state
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberSearchText, setMemberSearchText] = useState<string>('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState<boolean>(false);

  // Calendar / Previous Transaction state
  const [borrowDate, setBorrowDate] = useState<string>(todayStr);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());

  // Historical Return log option
  const [isHistoricalReturned, setIsHistoricalReturned] = useState<boolean>(false);
  const [returnDate, setReturnDate] = useState<string>(todayStr);
  const [isReturnCalendarOpen, setIsReturnCalendarOpen] = useState<boolean>(false);
  const [returnCalendarYear, setReturnCalendarYear] = useState<number>(new Date().getFullYear());
  const [returnCalendarMonth, setReturnCalendarMonth] = useState<number>(new Date().getMonth());
  const [weeksLoaned, setWeeksLoaned] = useState<number>(1);

  const [isCreatingNewMember, setIsCreatingNewMember] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New member form fields
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('+254 ');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberAddress, setNewMemberAddress] = useState('');

  const bookDropdownRef = useRef<HTMLDivElement>(null);
  const bookSearchInputRef = useRef<HTMLInputElement>(null);

  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const memberSearchInputRef = useRef<HTMLInputElement>(null);

  const calendarPopoverRef = useRef<HTMLDivElement>(null);
  const returnCalendarPopoverRef = useRef<HTMLDivElement>(null);

  // Sync when preselectedBook arrives
  useEffect(() => {
    if (preselectedBook) {
      setSelectedBookId(preselectedBook.id);
      setBookSearchText(preselectedBook.title);
      setIsBookDropdownOpen(false);
    } else {
      setSelectedBookId('');
      setBookSearchText('');
    }
    setError(null);
  }, [preselectedBook, isOpen]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMemberId('');
      setMemberSearchText('');
      setIsMemberDropdownOpen(false);
      setIsCreatingNewMember(false);
      setNewMemberName('');
      setNewMemberPhone('+254 ');
      setNewMemberEmail('');
      setNewMemberAddress('');
      
      const now = new Date();
      setBorrowDate(toDateStr(now));
      setCalendarYear(now.getFullYear());
      setCalendarMonth(now.getMonth());
      setIsCalendarOpen(false);

      setIsHistoricalReturned(false);
      setReturnDate(toDateStr(now));
      setReturnCalendarYear(now.getFullYear());
      setReturnCalendarMonth(now.getMonth());
      setIsReturnCalendarOpen(false);
      setWeeksLoaned(1);

      setError(null);
    }
  }, [isOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (bookDropdownRef.current && !bookDropdownRef.current.contains(target)) {
        setIsBookDropdownOpen(false);
      }
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(target)) {
        setIsMemberDropdownOpen(false);
      }
      if (calendarPopoverRef.current && !calendarPopoverRef.current.contains(target)) {
        setIsCalendarOpen(false);
      }
      if (returnCalendarPopoverRef.current && !returnCalendarPopoverRef.current.contains(target)) {
        setIsReturnCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentBook = books.find(b => b.id === selectedBookId);
  const currentMember = members.find(m => m.id === selectedMemberId);

  // Filter books matching search text
  const filteredBooks = books.filter(b => {
    if (!bookSearchText.trim()) return true;
    const q = bookSearchText.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.genre.toLowerCase().includes(q) ||
      (b.isbn && b.isbn.toLowerCase().includes(q))
    );
  });

  // Filter members matching search text
  const filteredMembers = members.filter(m => {
    if (!memberSearchText.trim()) return true;
    const q = memberSearchText.toLowerCase();
    return (
      m.full_name.toLowerCase().includes(q) ||
      m.membership_number.toLowerCase().includes(q) ||
      (m.phone && m.phone.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  // Effective end date of the loan (returnDate if historical returned, otherwise today)
  const effectiveEndDate = isHistoricalReturned && returnDate ? returnDate : todayStr;

  // Duration in whole calendar days
  const durationInDays = useMemo(() => {
    if (!borrowDate) return 0;
    return getDaysDifference(borrowDate, effectiveEndDate);
  }, [borrowDate, effectiveEndDate]);

  const isBackdated = borrowDate < todayStr;
  const daysAgo = useMemo(() => {
    if (!borrowDate) return 0;
    return getDaysDifference(borrowDate, todayStr);
  }, [borrowDate, todayStr]);

  // Handle Borrow Date selection (calendar click, native input, presets)
  const handleBorrowDateChange = (newDateStr: string) => {
    if (!newDateStr) return;
    setBorrowDate(newDateStr);
    const p = parseDateParts(newDateStr);
    if (p) {
      setCalendarYear(p.year);
      setCalendarMonth(p.month);
    }
    
    // If historical return date is earlier than new borrow date, push return date up to borrow date
    let endToUse = isHistoricalReturned ? returnDate : todayStr;
    if (isHistoricalReturned && returnDate < newDateStr) {
      setReturnDate(newDateStr);
      endToUse = newDateStr;
      if (p) {
        setReturnCalendarYear(p.year);
        setReturnCalendarMonth(p.month);
      }
    }

    // Immediately recalculate weeks & fees based on the newly selected dates
    const days = getDaysDifference(newDateStr, endToUse);
    const autoWeeks = calculateWeeksFromDays(days);
    setWeeksLoaned(autoWeeks);
  };

  // Handle Return Date selection (return calendar click, native input)
  const handleReturnDateChange = (newDateStr: string) => {
    if (!newDateStr) return;
    setReturnDate(newDateStr);
    const p = parseDateParts(newDateStr);
    if (p) {
      setReturnCalendarYear(p.year);
      setReturnCalendarMonth(p.month);
    }

    // Immediately recalculate weeks & fees based on the newly selected dates
    const days = getDaysDifference(borrowDate, newDateStr);
    const autoWeeks = calculateWeeksFromDays(days);
    setWeeksLoaned(autoWeeks);
  };

  // Handle preset days ago (Yesterday, -7d, -14d)
  const setPresetDaysAgo = (days: number) => {
    const newBorrowDate = addDaysToDateStr(todayStr, -days);
    handleBorrowDateChange(newBorrowDate);
    setIsCalendarOpen(false);
  };

  // Handle week buttons (1w, 2w, 3w, 4w) or stepper (+ / -)
  const handleWeeksChange = (newWeeks: number) => {
    const validWeeks = Math.max(1, newWeeks);
    setWeeksLoaned(validWeeks);
    // If historical returned, also sync returnDate to borrowDate + (weeks * 7 days)
    if (isHistoricalReturned) {
      const calculatedEnd = addDaysToDateStr(borrowDate, validWeeks * 7);
      const cappedEnd = calculatedEnd > todayStr ? todayStr : calculatedEnd;
      setReturnDate(cappedEnd);
      const rp = parseDateParts(cappedEnd);
      if (rp) {
        setReturnCalendarYear(rp.year);
        setReturnCalendarMonth(rp.month);
      }
    }
  };

  // Handle toggling "Was this previous loan already returned in the past?"
  const handleToggleHistoricalReturned = (checked: boolean) => {
    setIsHistoricalReturned(checked);
    if (checked) {
      let targetReturn = returnDate;
      if (targetReturn < borrowDate) {
        targetReturn = borrowDate;
        setReturnDate(borrowDate);
      }
      const days = getDaysDifference(borrowDate, targetReturn);
      setWeeksLoaned(calculateWeeksFromDays(days));
    } else {
      const days = getDaysDifference(borrowDate, todayStr);
      setWeeksLoaned(calculateWeeksFromDays(days));
    }
  };

  // Calculate due date based on borrowDate and weeksLoaned
  const calculatedDueDateStr = useMemo(() => {
    if (!borrowDate) return '';
    return addDaysToDateStr(borrowDate, weeksLoaned * 7);
  }, [borrowDate, weeksLoaned]);

  const weeklyRate = currentBook ? Number(currentBook.weekly_fee) : 0;
  const totalFeesToCharge = weeklyRate * weeksLoaned;

  // Calendar month days calculation for borrow date
  const borrowDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const borrowFirstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();

  // Calendar month days calculation for return date
  const returnDaysInMonth = new Date(returnCalendarYear, returnCalendarMonth + 1, 0).getDate();
  const returnFirstDayOfWeek = new Date(returnCalendarYear, returnCalendarMonth, 1).getDay();

  const handleSelectBook = (book: Book) => {
    if (!isHistoricalReturned && book.available_copies <= 0) return;
    setSelectedBookId(book.id);
    setBookSearchText(book.title);
    setIsBookDropdownOpen(false);
    setError(null);
  };

  const handleClearBook = () => {
    setSelectedBookId('');
    setBookSearchText('');
    setIsBookDropdownOpen(true);
    setTimeout(() => bookSearchInputRef.current?.focus(), 50);
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMemberId(member.id);
    setMemberSearchText(member.full_name);
    setIsMemberDropdownOpen(false);
    setError(null);
  };

  const handleClearMember = () => {
    setSelectedMemberId('');
    setMemberSearchText('');
    setIsMemberDropdownOpen(true);
    setTimeout(() => memberSearchInputRef.current?.focus(), 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedBookId) {
      setError('Please search for a book title and select it to activate the loan.');
      return;
    }

    if (!isHistoricalReturned && currentBook && currentBook.available_copies <= 0) {
      setError('Selected book has 0 copies available in stock.');
      return;
    }

    if (!borrowDate) {
      setError('Please select a valid transaction borrow date.');
      return;
    }

    if (isHistoricalReturned) {
      if (!returnDate) {
        setError('Please specify the date this previous loan was returned.');
        return;
      }
      if (returnDate < borrowDate) {
        setError('Return date cannot be earlier than the borrow date.');
        return;
      }
    }

    setLoading(true);
    try {
      let finalMemberId = selectedMemberId;

      if (isCreatingNewMember) {
        if (!newMemberName.trim()) {
          setError('Please provide the new member full legal name.');
          setLoading(false);
          return;
        }

        const phoneValidation = validatePhoneDigits(newMemberPhone);
        if (!phoneValidation.isValid) {
          setError(phoneValidation.errorMessage || 'Please provide a valid phone number with the right amount of digits.');
          setLoading(false);
          return;
        }

        const createdMember = await onRegisterMember({
          full_name: newMemberName.trim(),
          phone: newMemberPhone.trim(),
          email: newMemberEmail.trim() ? newMemberEmail.trim().toLowerCase() : null,
          address: newMemberAddress.trim() || null,
        });
        finalMemberId = createdMember.id;
      }

      if (!finalMemberId) {
        setError('Please search for a registered member and select them, or register a new borrower.');
        setLoading(false);
        return;
      }

      await onConfirmBorrow({
        bookId: selectedBookId,
        memberId: finalMemberId,
        notes: notes.trim() || undefined,
        borrowDate,
        isHistoricalReturned,
        returnDate: isHistoricalReturned ? returnDate : undefined,
        weeksLoaned,
        totalFeesPaid: totalFeesToCharge,
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete borrow transaction.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d2d26]/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#e2e0d5] space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#f0eee4] pb-3">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#2d2d26] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#5A5A40]" />
              <span>Issue Book Loan</span>
            </h2>
            <p className="text-xs text-[#8c8c7d] mt-0.5">
              Select book, borrower, and specify transaction date using the calendar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8c8c7d] hover:text-[#2d2d26] text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. BOOK SELECTION with Visible Search Input and Interactive Dropdown */}
          <div className="space-y-1.5" ref={bookDropdownRef}>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#434338]">
                Book Title * <span className="font-normal text-[#8c8c7d]">(Type title to search)</span>
              </label>
              {currentBook && (
                <button
                  type="button"
                  onClick={handleClearBook}
                  className="text-xs font-semibold text-[#5A5A40] hover:text-[#484833] underline cursor-pointer"
                >
                  Change book
                </button>
              )}
            </div>

            {/* Book Writing Input */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#8c8c7d] absolute left-3 pointer-events-none" />
                <input
                  ref={bookSearchInputRef}
                  type="text"
                  required={!selectedBookId}
                  value={bookSearchText}
                  onChange={e => {
                    setBookSearchText(e.target.value);
                    setIsBookDropdownOpen(true);
                    if (selectedBookId && e.target.value !== currentBook?.title) {
                      setSelectedBookId('');
                    }
                  }}
                  onFocus={() => setIsBookDropdownOpen(true)}
                  placeholder="Write book title, author, or genre..."
                  className="w-full pl-9 pr-8 py-2.5 bg-white border-2 border-[#e2e0d5] focus:border-[#5A5A40] rounded-xl text-xs sm:text-sm font-medium text-[#2d2d26] placeholder-[#8c8c7d] focus:ring-2 focus:ring-[#5A5A40]/10 transition-all shadow-xs"
                />
                {bookSearchText && (
                  <button
                    type="button"
                    onClick={handleClearBook}
                    className="absolute right-2.5 p-1 text-[#8c8c7d] hover:text-[#2d2d26] rounded-full cursor-pointer"
                    title="Clear title search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Book Autocomplete Dropdown Menu */}
              {isBookDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-white border border-[#e2e0d5] rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-1">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#8c8c7d] tracking-wider border-b border-[#f0eee4] flex items-center justify-between">
                    <span>Matching Books ({filteredBooks.length})</span>
                    <span>Click to activate</span>
                  </div>

                  {filteredBooks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#8c8c7d]">
                      No books found matching <strong className="text-[#2d2d26]">"{bookSearchText}"</strong>.
                    </div>
                  ) : (
                    filteredBooks.map(b => {
                      const isSelected = b.id === selectedBookId;
                      const isAvailable = b.available_copies > 0 || isHistoricalReturned;

                      return (
                        <div
                          key={b.id}
                          onClick={() => isAvailable && handleSelectBook(b)}
                          className={`p-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-3 ${
                            !isAvailable
                              ? 'opacity-60 bg-rose-50/40 cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#efede4] border border-[#5A5A40] cursor-pointer'
                              : 'hover:bg-[#f8f7f2] cursor-pointer border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-10 rounded bg-[#efede4] shrink-0 border border-[#e2e0d5] overflow-hidden flex items-center justify-center">
                              {b.cover_url ? (
                                <img
                                  src={b.cover_url}
                                  alt={b.title}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <BookOpen className="w-3.5 h-3.5 text-[#5A5A40]" />
                              )}
                            </div>
                            <div className="truncate">
                              <div className="font-semibold text-[#2d2d26] truncate">
                                {b.title}
                              </div>
                              <div className="text-[#8c8c7d] text-[11px] truncate">
                                by {b.author} • <span className="italic">{b.genre}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-right">
                            <span className="font-mono font-semibold text-[#5A5A40]">
                              {formatCurrency(b.weekly_fee)}/wk
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                b.available_copies > 0
                                  ? 'bg-[#dcfce7] text-[#166534]'
                                  : 'bg-[#fee2e2] text-[#991b1b]'
                              }`}
                            >
                              {b.available_copies > 0 ? `${b.available_copies} Avail` : '0 in stock'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Active Book Card */}
            {currentBook ? (
              <div className="p-3.5 bg-[#f5f4ee] rounded-2xl border-2 border-[#5A5A40]/40 flex items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-12 rounded-lg bg-[#efede4] border border-[#e2e0d5] shrink-0 overflow-hidden flex items-center justify-center">
                    {currentBook.cover_url ? (
                      <img
                        src={currentBook.cover_url}
                        alt={currentBook.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <BookOpen className="w-4 h-4 text-[#5A5A40]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#166534] text-white text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" /> Active Loan Book
                      </span>
                      <span className="text-[11px] font-mono text-[#5A5A40] font-bold">
                        {formatCurrency(currentBook.weekly_fee)} / week
                      </span>
                    </div>
                    <div className="font-serif font-bold text-[#2d2d26] text-sm mt-0.5">
                      {currentBook.title}
                    </div>
                    <div className="text-[11px] text-[#8c8c7d]">
                      by {currentBook.author} ({currentBook.available_copies} of {currentBook.total_copies} available)
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearBook}
                  className="px-2.5 py-1 text-xs font-semibold text-[#8c8c7d] hover:text-[#2d2d26] hover:bg-white rounded-lg transition-colors cursor-pointer border border-[#e2e0d5]"
                  title="Reselect another book"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="p-2 bg-[#f8f7f2] rounded-xl border border-dashed border-[#e2e0d5] text-[11px] text-[#8c8c7d] flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                <span>Type title above and click a suggested book to activate it.</span>
              </div>
            )}
          </div>

          {/* 2. MEMBER SELECTION with Visible Search Input and Interactive Dropdown */}
          <div className="space-y-2 pt-2 border-t border-[#f0eee4]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#434338] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>Choose Registered Member *</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewMember(!isCreatingNewMember)}
                className="text-xs font-semibold text-[#5A5A40] hover:text-[#484833] flex items-center gap-1 cursor-pointer"
              >
                {isCreatingNewMember ? 'Search registered members' : '+ Register new member'}
              </button>
            </div>

            {!isCreatingNewMember ? (
              <div className="space-y-1.5" ref={memberDropdownRef}>
                {/* Searchable Member Input */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-[#8c8c7d] absolute left-3 pointer-events-none" />
                    <input
                      ref={memberSearchInputRef}
                      type="text"
                      required={!selectedMemberId}
                      value={memberSearchText}
                      onChange={e => {
                        setMemberSearchText(e.target.value);
                        setIsMemberDropdownOpen(true);
                        if (selectedMemberId && e.target.value !== currentMember?.full_name) {
                          setSelectedMemberId('');
                        }
                      }}
                      onFocus={() => setIsMemberDropdownOpen(true)}
                      placeholder="Type member name, membership ID, or phone number..."
                      className="w-full pl-9 pr-8 py-2.5 bg-white border-2 border-[#e2e0d5] focus:border-[#5A5A40] rounded-xl text-xs sm:text-sm font-medium text-[#2d2d26] placeholder-[#8c8c7d] focus:ring-2 focus:ring-[#5A5A40]/10 transition-all shadow-xs"
                    />
                    {memberSearchText && (
                      <button
                        type="button"
                        onClick={handleClearMember}
                        className="absolute right-2.5 p-1 text-[#8c8c7d] hover:text-[#2d2d26] rounded-full cursor-pointer"
                        title="Clear member search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Interactive Dropdown as User Types */}
                  {isMemberDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-white border border-[#e2e0d5] rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-1">
                      <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#8c8c7d] tracking-wider border-b border-[#f0eee4] flex items-center justify-between">
                        <span>Matching Members ({filteredMembers.length})</span>
                        <span>Click to choose</span>
                      </div>

                      {filteredMembers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[#8c8c7d] space-y-2">
                          <div>
                            No members found matching <strong className="text-[#2d2d26]">"{memberSearchText}"</strong>.
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingNewMember(true);
                              setIsMemberDropdownOpen(false);
                              setNewMemberName(memberSearchText);
                            }}
                            className="text-xs font-semibold text-[#5A5A40] hover:underline cursor-pointer"
                          >
                            + Register "{memberSearchText}" as a new member
                          </button>
                        </div>
                      ) : (
                        filteredMembers.map(m => {
                          const isSelected = m.id === selectedMemberId;
                          return (
                            <div
                              key={m.id}
                              onClick={() => handleSelectMember(m)}
                              className={`p-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#efede4] border border-[#5A5A40]'
                                  : 'hover:bg-[#f8f7f2] border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-[#efede4] text-[#5A5A40] shrink-0 font-bold flex items-center justify-center text-xs">
                                  {m.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="truncate">
                                  <div className="font-semibold text-[#2d2d26] truncate">
                                    {m.full_name}
                                  </div>
                                  <div className="text-[#8c8c7d] text-[11px] flex items-center gap-2 truncate">
                                    <span className="font-mono text-[#5A5A40] font-semibold">{m.membership_number}</span>
                                    {m.phone && <span>• {m.phone}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  m.status === 'active'
                                    ? 'bg-[#dcfce7] text-[#166534]'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {m.status}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Active Chosen Member Confirmation Card */}
                {currentMember ? (
                  <div className="p-3.5 bg-[#f5f4ee] rounded-2xl border-2 border-[#5A5A40]/40 flex items-center justify-between gap-3 text-xs shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#5A5A40] text-white shrink-0 font-bold flex items-center justify-center text-sm">
                        {currentMember.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#166534] text-white text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Chosen Borrower
                          </span>
                          <span className="text-[11px] font-mono text-[#5A5A40] font-bold">
                            {currentMember.membership_number}
                          </span>
                        </div>
                        <div className="font-serif font-bold text-[#2d2d26] text-sm mt-0.5">
                          {currentMember.full_name}
                        </div>
                        <div className="text-[11px] text-[#8c8c7d] flex items-center gap-2">
                          {currentMember.phone && <span>📞 {currentMember.phone}</span>}
                          {currentMember.email && <span>✉️ {currentMember.email}</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearMember}
                      className="px-2.5 py-1 text-xs font-semibold text-[#8c8c7d] hover:text-[#2d2d26] hover:bg-white rounded-lg transition-colors cursor-pointer border border-[#e2e0d5]"
                      title="Select different member"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="p-2 bg-[#f8f7f2] rounded-xl border border-dashed border-[#e2e0d5] text-[11px] text-[#8c8c7d] flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                    <span>Type member name above and click a suggested borrower to assign this loan.</span>
                  </div>
                )}
              </div>
            ) : (
              /* Inline Member Registration */
              <div className="p-3.5 bg-[#f8f7f2] rounded-2xl border border-[#e2e0d5] space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#e2e0d5] pb-1.5">
                  <span className="font-semibold text-[#2d2d26] text-[11px] uppercase tracking-wider">
                    New Member Registration
                  </span>
                  <span className="text-[10px] text-[#5A5A40] font-medium">
                    Phone with Country Code required
                  </span>
                </div>

                {/* Member Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#434338] mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Eleanor Vance"
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    className="w-full p-2 bg-white border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40]"
                    required={isCreatingNewMember}
                  />
                </div>

                {/* Phone Number with Typeable Country Code and Exact Digit Validation */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#434338] mb-1">
                    Phone Number with Country Calling Code *
                  </label>
                  <PhoneCountryInput
                    value={newMemberPhone}
                    onChange={setNewMemberPhone}
                    required={isCreatingNewMember}
                  />
                </div>

                {/* Optional Email & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8c8c7d] mb-1">
                      Email Address (optional)
                    </label>
                    <input
                      type="email"
                      placeholder="Optional"
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      className="w-full p-2 bg-white border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8c8c7d] mb-1">
                      Physical Address (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={newMemberAddress}
                      onChange={e => setNewMemberAddress(e.target.value)}
                      className="w-full p-2 bg-white border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. CALENDAR & TRANSACTION DATE SELECTOR (Allows logging previous transactions) */}
          <div className="space-y-2 pt-2 border-t border-[#f0eee4]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#434338] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>Transaction / Borrow Date *</span>
              </label>

              {/* Quick Presets */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPresetDaysAgo(0)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    borrowDate === todayStr
                      ? 'bg-[#5A5A40] text-white shadow-2xs'
                      : 'bg-[#efede4] text-[#5A5A40] hover:bg-[#e6e4d9]'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDaysAgo(1)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    daysAgo === 1
                      ? 'bg-[#5A5A40] text-white shadow-2xs'
                      : 'bg-[#efede4] text-[#5A5A40] hover:bg-[#e6e4d9]'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDaysAgo(7)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    daysAgo === 7
                      ? 'bg-[#5A5A40] text-white shadow-2xs'
                      : 'bg-[#efede4] text-[#5A5A40] hover:bg-[#e6e4d9]'
                  }`}
                >
                  -7d
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDaysAgo(14)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    daysAgo === 14
                      ? 'bg-[#5A5A40] text-white shadow-2xs'
                      : 'bg-[#efede4] text-[#5A5A40] hover:bg-[#e6e4d9]'
                  }`}
                >
                  -14d
                </button>
              </div>
            </div>

            {/* Date Input with Calendar Trigger */}
            <div className="relative" ref={calendarPopoverRef}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <CalendarDays className="w-4 h-4 text-[#5A5A40] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    max={todayStr}
                    value={borrowDate}
                    onChange={e => handleBorrowDateChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#e2e0d5] focus:border-[#5A5A40] rounded-xl text-xs sm:text-sm font-semibold text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40]/10 transition-all shadow-xs cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isCalendarOpen
                      ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                      : 'bg-[#f8f7f2] hover:bg-[#efede4] text-[#434338] border-[#e2e0d5]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Calendar Grid</span>
                </button>
              </div>

              {/* Interactive Calendar Grid Popover */}
              {isCalendarOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-white border border-[#e2e0d5] rounded-3xl shadow-2xl p-4 space-y-3">
                  {/* Month / Year Navigator */}
                  <div className="flex items-center justify-between border-b border-[#f0eee4] pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarMonth === 0) {
                          setCalendarMonth(11);
                          setCalendarYear(y => y - 1);
                        } else {
                          setCalendarMonth(m => m - 1);
                        }
                      }}
                      className="p-1 text-[#8c8c7d] hover:text-[#2d2d26] hover:bg-[#f8f7f2] rounded-full cursor-pointer"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="font-serif font-bold text-sm text-[#2d2d26]">
                      {MONTH_NAMES[calendarMonth]} {calendarYear}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (calendarMonth === 11) {
                          setCalendarMonth(0);
                          setCalendarYear(y => y + 1);
                        } else {
                          setCalendarMonth(m => m + 1);
                        }
                      }}
                      disabled={calendarYear >= new Date().getFullYear() && calendarMonth >= new Date().getMonth()}
                      className={`p-1 rounded-full cursor-pointer ${
                        calendarYear >= new Date().getFullYear() && calendarMonth >= new Date().getMonth()
                          ? 'text-[#d4d2c9] cursor-not-allowed'
                          : 'text-[#8c8c7d] hover:text-[#2d2d26] hover:bg-[#f8f7f2]'
                      }`}
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#8c8c7d] uppercase tracking-wider">
                    {WEEKDAY_NAMES.map(w => (
                      <div key={w} className="py-0.5">{w}</div>
                    ))}
                  </div>

                  {/* Day Tiles */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: borrowFirstDayOfWeek }).map((_, i) => (
                      <div key={`blank-${i}`} className="p-2" />
                    ))}

                    {Array.from({ length: borrowDaysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isSelected = borrowDate === dateStr;
                      const isToday = dateStr === todayStr;
                      const isFuture = dateStr > todayStr;

                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={isFuture}
                          onClick={() => {
                            handleBorrowDateChange(dateStr);
                            setIsCalendarOpen(false);
                          }}
                          className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-[#5A5A40] text-white shadow-xs font-bold'
                              : isToday
                              ? 'bg-[#efede4] text-[#5A5A40] border border-[#5A5A40]'
                              : isFuture
                              ? 'text-[#d4d2c9] cursor-not-allowed'
                              : 'text-[#2d2d26] hover:bg-[#f8f7f2]'
                          }`}
                        >
                          <span>{day}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-[#f0eee4] flex items-center justify-between text-[11px] text-[#8c8c7d]">
                    <span className="italic">Click any past date to log historic loans</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleBorrowDateChange(todayStr);
                        setIsCalendarOpen(false);
                      }}
                      className="text-[#5A5A40] font-bold hover:underline cursor-pointer"
                    >
                      Reset to Today
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline Calculation Preview Card */}
            <div className={`p-3 rounded-2xl border text-xs space-y-1.5 transition-colors ${
              isBackdated
                ? 'bg-[#fcfbf7] border-[#d4d1c3]'
                : 'bg-[#f8f7f2] border-[#e2e0d5]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[#8c8c7d] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span>Borrow Date:</span>
                </span>
                <span className="font-bold text-[#2d2d26]">
                  {formatDate(borrowDate)} {isBackdated ? `(${daysAgo} day${daysAgo === 1 ? '' : 's'} ago)` : '(Today)'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8c8c7d] flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span>Initial 7-Day Due Date:</span>
                </span>
                <span className={`font-bold ${
                  calculatedDueDateStr < todayStr ? 'text-rose-700' : 'text-[#2d2d26]'
                }`}>
                  {formatDate(calculatedDueDateStr)}
                </span>
              </div>

              {isBackdated && calculatedDueDateStr < todayStr && !isHistoricalReturned && (
                <div className="pt-1 text-[11px] text-amber-800 flex items-center gap-1.5 font-medium border-t border-[#e2e0d5]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>
                    The initial 7-day period ended on {formatDate(calculatedDueDateStr)}. This loan will appear with overdue status unless marked as returned below.
                  </span>
                </div>
              )}
            </div>

            {/* Option to Log Previous Loan That Was Already Returned */}
            <div className="p-3 bg-[#f8f7f2] rounded-2xl border border-[#e2e0d5] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isHistoricalReturned}
                  onChange={e => handleToggleHistoricalReturned(e.target.checked)}
                  className="w-4 h-4 rounded-md text-[#5A5A40] border-[#e2e0d5] focus:ring-[#5A5A40] cursor-pointer"
                />
                <span className="text-xs font-semibold text-[#2d2d26] flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span>Was this previous loan already returned in the past?</span>
                </span>
              </label>

              {isHistoricalReturned && (
                <div className="pt-2 border-t border-[#e2e0d5] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-[#434338]">
                      Date Returned to Shelves *
                    </label>
                    <span className="text-[10px] text-[#166534] font-medium">
                      ✓ Book inventory won't be deducted
                    </span>
                  </div>

                  <div className="relative" ref={returnCalendarPopoverRef}>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        min={borrowDate}
                        max={todayStr}
                        value={returnDate}
                        onChange={e => handleReturnDateChange(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-[#e2e0d5] focus:border-[#5A5A40] rounded-xl text-xs font-semibold text-[#2d2d26] shadow-xs cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setIsReturnCalendarOpen(!isReturnCalendarOpen)}
                        className="px-2.5 py-2 bg-white hover:bg-[#efede4] border border-[#e2e0d5] rounded-xl text-xs font-semibold text-[#434338] cursor-pointer"
                      >
                        Calendar
                      </button>
                    </div>

                    {isReturnCalendarOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-white border border-[#e2e0d5] rounded-3xl shadow-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-[#f0eee4] pb-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (returnCalendarMonth === 0) {
                                setReturnCalendarMonth(11);
                                setReturnCalendarYear(y => y - 1);
                              } else {
                                setReturnCalendarMonth(m => m - 1);
                              }
                            }}
                            className="p-1 text-[#8c8c7d] hover:text-[#2d2d26] rounded-full cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="font-serif font-bold text-sm text-[#2d2d26]">
                            {MONTH_NAMES[returnCalendarMonth]} {returnCalendarYear}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (returnCalendarMonth === 11) {
                                setReturnCalendarMonth(0);
                                setReturnCalendarYear(y => y + 1);
                              } else {
                                setReturnCalendarMonth(m => m + 1);
                              }
                            }}
                            className="p-1 text-[#8c8c7d] hover:text-[#2d2d26] rounded-full cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#8c8c7d] uppercase tracking-wider">
                          {WEEKDAY_NAMES.map(w => (
                            <div key={w} className="py-0.5">{w}</div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: returnFirstDayOfWeek }).map((_, i) => (
                            <div key={`ret-blank-${i}`} className="p-2" />
                          ))}

                          {Array.from({ length: returnDaysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${returnCalendarYear}-${String(returnCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = returnDate === dateStr;
                            const isBeforeBorrow = dateStr < borrowDate;
                            const isFuture = dateStr > todayStr;
                            const isDisabled = isBeforeBorrow || isFuture;

                            return (
                              <button
                                key={day}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => {
                                  handleReturnDateChange(dateStr);
                                  setIsReturnCalendarOpen(false);
                                }}
                                className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                                  isSelected
                                    ? 'bg-[#5A5A40] text-white font-bold'
                                    : isDisabled
                                    ? 'text-[#d4d2c9] cursor-not-allowed'
                                    : 'text-[#2d2d26] hover:bg-[#f8f7f2]'
                                }`}
                              >
                                <span>{day}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Loan Duration & Weeks Calculator for Historical Returns */}
                    <div className="p-3 bg-white border border-[#e2e0d5] rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d2d26]">
                          <Calendar className="w-3.5 h-3.5 text-[#5A5A40]" />
                          <span>Loan Duration & Billed Weeks</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#efede4] text-[#5A5A40]">
                          {durationInDays} day{durationInDays === 1 ? '' : 's'} on loan
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#f0eee4]">
                        <div className="text-xs text-[#434338]">
                          <span>Billed Duration: </span>
                          <strong className="text-[#2d2d26] font-mono">{weeksLoaned} week{weeksLoaned === 1 ? '' : 's'}</strong>
                          <span className="text-[10px] text-[#8c8c7d] block">
                            (Auto-calculated: 7 days per week)
                          </span>
                        </div>

                        {/* Quick Week Selectors / Stepper */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map(w => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => handleWeeksChange(w)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                weeksLoaned === w
                                  ? 'bg-[#5A5A40] text-white shadow-xs'
                                  : 'bg-[#f8f7f2] hover:bg-[#efede4] text-[#434338] border border-[#e2e0d5]'
                              }`}
                            >
                              {w}w
                            </button>
                          ))}
                          <div className="flex items-center ml-1 border border-[#e2e0d5] rounded-lg bg-[#f8f7f2] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleWeeksChange(weeksLoaned - 1)}
                              className="px-2 py-1 text-xs font-bold hover:bg-[#efede4] text-[#434338] cursor-pointer"
                              title="Decrease week"
                            >
                              -
                            </button>
                            <span className="px-1.5 text-xs font-mono font-bold text-[#2d2d26]">
                              {weeksLoaned}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleWeeksChange(weeksLoaned + 1)}
                              className="px-2 py-1 text-xs font-bold hover:bg-[#efede4] text-[#434338] cursor-pointer"
                              title="Increase week"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. NOTES */}
          <div>
            <label className="block text-xs font-semibold text-[#434338] mb-1">
              Loan Transaction Notes (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Backdated transaction from physical log sheet #14"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
            />
          </div>

          {/* 5. FEE & DURATION SUMMARY CARD */}
          <div className="p-3.5 bg-[#efede4] border border-[#e2e0d5] rounded-2xl text-xs space-y-2 text-[#2d2d26]">
            <div className="flex justify-between items-center font-bold">
              <span>
                {isHistoricalReturned
                  ? `Historical Total Fees (${weeksLoaned} wk${weeksLoaned === 1 ? '' : 's'}):`
                  : isBackdated && weeksLoaned > 1
                  ? `Backdated Total Fees (${weeksLoaned} wk${weeksLoaned === 1 ? '' : 's'}):`
                  : 'Week 1 Loan Fee:'}
              </span>
              <span className="font-mono text-base text-[#5A5A40]">
                {formatCurrency(totalFeesToCharge)}
              </span>
            </div>

            {isHistoricalReturned || (isBackdated && weeksLoaned > 1) ? (
              <div className="text-[11px] text-[#434338] bg-white/70 p-2.5 rounded-xl border border-[#e2e0d5] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#8c8c7d]">Loan Dates:</span>
                  <span className="font-medium text-[#2d2d26]">
                    {formatDate(borrowDate)} → {isHistoricalReturned ? formatDate(returnDate) : 'Today'} ({durationInDays} day{durationInDays === 1 ? '' : 's'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c8c7d]">Weekly Rate:</span>
                  <span className="font-medium text-[#2d2d26]">
                    {formatCurrency(weeklyRate)}/week
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#e2e0d5] font-semibold text-[#2d2d26]">
                  <span>Total Calculated:</span>
                  <span className="font-mono text-[#5A5A40]">
                    {weeksLoaned} week{weeksLoaned === 1 ? '' : 's'} × {formatCurrency(weeklyRate)} = {formatCurrency(totalFeesToCharge)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-[#434338] leading-tight">
                <strong>Rules:</strong> Initial duration is 7 days from borrow date ({formatDate(borrowDate)} → {formatDate(calculatedDueDateStr)}). Weekly renewals allowed up to 4 weeks max hold.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f0eee4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#8c8c7d] hover:text-[#2d2d26] hover:bg-[#efede4] rounded-full text-xs font-semibold transition-colors uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedBookId || (!isCreatingNewMember && !selectedMemberId)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                !selectedBookId || (!isCreatingNewMember && !selectedMemberId) || loading
                  ? 'bg-[#a3a38c] text-white opacity-60 cursor-not-allowed'
                  : 'bg-[#5A5A40] hover:bg-[#484833] text-white'
              }`}
            >
              {loading ? 'Processing...' : isHistoricalReturned ? 'Save Historical Record' : 'Confirm Loan & Collect Fee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
