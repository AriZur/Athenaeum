import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Plus, 
  BookOpen, 
  Tag, 
  Edit3, 
  Trash2, 
  Coins, 
  BookPlus,
  RefreshCw
} from 'lucide-react';
import { Book } from '../types';
import { formatCurrency } from '../lib/formatters';
import { fetchBooksPaginated, fetchDistinctGenres } from '../lib/api';
import { Pagination } from './Pagination';

interface BooksCatalogProps {
  overallRate?: number;
  onOpenOverallRateModal?: () => void;
  onOpenAddBookModal: () => void;
  onOpenEditBookModal: (book: Book) => void;
  onDeleteBook: (id: string, title: string) => void;
  onOpenBorrowModal: (book: Book) => void;
  accountId?: string;
  refreshTrigger?: number;
}

export const BooksCatalog: React.FC<BooksCatalogProps> = ({
  overallRate = 100,
  onOpenOverallRateModal,
  onOpenAddBookModal,
  onOpenEditBookModal,
  onDeleteBook,
  onOpenBorrowModal,
  accountId,
  refreshTrigger = 0,
}) => {
  // Pagination & Filter State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [totalBooks, setTotalBooks] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [books, setBooks] = useState<Book[]>([]);
  const [isListLoading, setIsListLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter Controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'loaned'>('all');
  const [genres, setGenres] = useState<string[]>(['All']);

  // Debounce search query to prevent excessive database calls
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // Fetch distinct genres on initial load or account switch
  useEffect(() => {
    let isMounted = true;
    fetchDistinctGenres(accountId)
      .then((gList) => {
        if (isMounted) setGenres(gList);
      })
      .catch(console.error);
    return () => {
      isMounted = false;
    };
  }, [accountId]);

  // Load books independently for the current list section
  const loadBooks = useCallback(async () => {
    setIsListLoading(true);
    setError(null);
    try {
      const res = await fetchBooksPaginated({
        page: currentPage,
        pageSize,
        search: debouncedSearch,
        genre: selectedGenre,
        availability: availabilityFilter,
        accountId,
      });
      setBooks(res.items);
      setTotalBooks(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch paginated books:', err);
      setError('Unable to load book collection. Please retry.');
    } finally {
      setIsListLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedGenre, availabilityFilter, accountId]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks, refreshTrigger]);

  // Filter change handlers (always reset to page 1)
  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre);
    setCurrentPage(1);
  };

  const handleAvailabilityChange = (filter: 'all' | 'available' | 'loaned') => {
    setAvailabilityFilter(filter);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Title & Actions Bar - Always mounted & immediate */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2d2d26]">
            Library Catalog & Inventory
          </h1>
          <p className="text-[#8c8c7d] text-sm mt-1">
            Browse collection titles, configure available copies, and manage shelf inventory in real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenOverallRateModal && (
            <button
              id="catalog-pricing-btn"
              onClick={onOpenOverallRateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#efede4] text-[#2d2d26] border border-[#e2e0d5] rounded-full text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Customize overall library weekly rate"
            >
              <Coins className="w-4 h-4 text-[#5A5A40]" />
              <span>
                Library Pricing: <strong className="font-mono text-[#5A5A40]">{formatCurrency(overallRate)}</strong> / wk
              </span>
              <span className="text-[10px] bg-[#efede4] text-[#5A5A40] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                Customize
              </span>
            </button>
          )}

          <button
            id="add-book-catalog-btn"
            onClick={onOpenAddBookModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Book to Collection</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls - Always mounted & responsive */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#f0eee4] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-[#8c8c7d] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by title, author, genre, or ISBN..."
              className="w-full pl-9 pr-4 py-2 bg-[#f8f7f2] border border-[#e2e0d5] rounded-full text-xs sm:text-sm text-[#2d2d26] placeholder:text-[#8c8c7d] focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40] focus:bg-white transition-all"
            />
          </div>

          {/* Availability filter tabs */}
          <div className="flex items-center gap-1 bg-[#efede4] p-1 rounded-full shrink-0 text-xs">
            <button
              onClick={() => handleAvailabilityChange('all')}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                availabilityFilter === 'all'
                  ? 'bg-white text-[#2d2d26] shadow-2xs font-semibold'
                  : 'text-[#8c8c7d] hover:text-[#2d2d26]'
              }`}
            >
              All Volumes
            </button>
            <button
              onClick={() => handleAvailabilityChange('available')}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                availabilityFilter === 'available'
                  ? 'bg-white text-[#166534] shadow-2xs font-semibold'
                  : 'text-[#8c8c7d] hover:text-[#2d2d26]'
              }`}
            >
              Available On Shelf
            </button>
            <button
              onClick={() => handleAvailabilityChange('loaned')}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                availabilityFilter === 'loaned'
                  ? 'bg-white text-[#92400e] shadow-2xs font-semibold'
                  : 'text-[#8c8c7d] hover:text-[#2d2d26]'
              }`}
            >
              On Loan
            </button>
          </div>
        </div>

        {/* Genre Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-[#8c8c7d] font-bold text-[10px] uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Tag className="w-3 h-3" /> Genre:
          </span>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => handleGenreChange(g)}
              className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap text-xs cursor-pointer ${
                selectedGenre === g
                  ? 'bg-[#5A5A40] text-white font-medium shadow-2xs'
                  : 'bg-[#efede4] text-[#5A5A40] hover:bg-[#e6e4d9]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadBooks()}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: pageSize > 12 ? 12 : pageSize }).map((_, i) => (
              <div
                key={`book-skeleton-${i}`}
                className="bg-white rounded-3xl border border-[#f0eee4] shadow-xs overflow-hidden animate-pulse flex flex-col justify-between"
              >
                <div>
                  <div className="h-48 bg-[#efede4]/60" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-[#efede4] rounded-md w-1/3" />
                    <div className="h-5 bg-[#efede4] rounded-md w-3/4" />
                    <div className="h-3 bg-[#efede4] rounded-md w-1/2" />
                    <div className="h-3 bg-[#efede4] rounded-md w-full" />
                  </div>
                </div>
                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-[#f0eee4] flex items-center justify-between">
                    <div className="h-7 w-16 bg-[#efede4] rounded-full" />
                    <div className="h-7 w-24 bg-[#efede4] rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#f0eee4] shadow-xs">
            <BookOpen className="w-12 h-12 text-[#e2e0d5] mx-auto mb-3" />
            <h3 className="font-serif text-lg font-semibold text-[#2d2d26] mb-1">
              No Books Found
            </h3>
            <p className="text-xs text-[#8c8c7d] max-w-sm mx-auto mb-4">
              No titles match your current search or genre filter. Try modifying filters or add a new title.
            </p>
            <button
              onClick={onOpenAddBookModal}
              className="px-4 py-2 bg-[#5A5A40] text-white rounded-full text-xs font-semibold hover:bg-[#484833] uppercase tracking-wider cursor-pointer"
            >
              Add Book to Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {books.map((book) => {
              const isAvailable = book.available_copies > 0;

              return (
                <div
                  key={book.id}
                  className="bg-white rounded-3xl border border-[#f0eee4] shadow-xs hover:border-[#5A5A40]/40 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div>
                    {/* Book Card Header / Cover */}
                    <div className="h-48 bg-[#f8f7f2] relative overflow-hidden flex items-center justify-center p-3 border-b border-[#f0eee4]">
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="h-full max-w-full object-contain rounded-md shadow-2xs group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-28 h-40 rounded-lg bg-[#5A5A40] text-[#f8f7f2] p-3 flex flex-col justify-between shadow-xs">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#efede4]/80">
                            {book.genre}
                          </span>
                          <h4 className="font-serif font-bold text-xs line-clamp-3 leading-tight text-white">
                            {book.title}
                          </h4>
                          <span className="text-[10px] text-[#e2e0d5] truncate italic">
                            {book.author}
                          </span>
                        </div>
                      )}

                      {/* Stock badge overlay */}
                      <div className="absolute top-2.5 right-2.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide shadow-2xs ${
                            isAvailable ? 'bg-[#166534] text-white' : 'bg-rose-700 text-white'
                          }`}
                        >
                          {isAvailable
                            ? `${book.available_copies} of ${book.total_copies} Available`
                            : 'All Copies Out'}
                        </span>
                      </div>

                      {/* Genre tag */}
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="px-2.5 py-0.5 bg-[#2d2d26]/85 backdrop-blur-xs text-white rounded-full text-[10px] font-medium">
                          {book.genre}
                        </span>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-5 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-xs font-semibold text-[#5A5A40] flex items-center">
                          <Coins className="w-3.5 h-3.5 mr-1 text-[#5A5A40]" />
                          <span className="font-mono">{formatCurrency(book.weekly_fee)}</span>
                          <span className="text-[10px] font-normal text-[#8c8c7d] ml-1">/ week</span>
                        </div>
                        {book.isbn && (
                          <span className="text-[10px] text-[#8c8c7d] font-mono">
                            {book.isbn}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-serif font-bold text-[#2d2d26] text-base leading-snug line-clamp-1 group-hover:text-[#5A5A40] transition-colors">
                          {book.title}
                        </h3>
                        <p className="text-xs text-[#8c8c7d] truncate italic">
                          by {book.author}
                        </p>
                      </div>

                      {book.description && (
                        <p className="text-xs text-[#434338] line-clamp-2 leading-relaxed">
                          {book.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-[#f0eee4] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenEditBookModal(book)}
                          className="p-1.5 text-[#8c8c7d] hover:text-[#2d2d26] hover:bg-[#efede4] rounded-full transition-colors cursor-pointer"
                          title="Edit book details & copy counts"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteBook(book.id, book.title)}
                          className="p-1.5 text-[#8c8c7d] hover:text-rose-700 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                          title="Delete book from catalog"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => onOpenBorrowModal(book)}
                        disabled={!isAvailable}
                        className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          isAvailable
                            ? 'bg-[#5A5A40] hover:bg-[#484833] text-white shadow-xs'
                            : 'bg-[#efede4] text-[#8c8c7d] cursor-not-allowed'
                        }`}
                        title={isAvailable ? 'Issue a loan for this title' : 'No copies currently available'}
                      >
                        <BookPlus className="w-3.5 h-3.5" />
                        <span>{isAvailable ? 'Issue Loan' : 'Out of Stock'}</span>
                      </button>
                    </div>
                  </div>
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
        totalItems={totalBooks}
        pageSize={pageSize}
        pageSizeOptions={[12, 24, 48]}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isListLoading}
        itemLabel="books"
      />
    </div>
  );
};
