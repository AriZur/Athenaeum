import React, { useState, useEffect } from 'react';
import { BookPlus, Edit3, Image, AlertCircle, Sparkles, Coins } from 'lucide-react';
import { Book } from '../types';
import { formatCurrency } from '../lib/formatters';

interface BookFormModalProps {
  book?: Book | null;
  overallRate?: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenOverallRateModal?: () => void;
  onSubmit: (bookData: {
    title: string;
    author: string;
    isbn?: string;
    genre: string;
    description?: string;
    cover_url?: string;
    total_copies: number;
    available_copies?: number;
    weekly_fee: number;
  }) => Promise<void>;
}

const SAMPLE_COVERS = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1532012164546-f432f2e37272?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=400'
];

export const BookFormModal: React.FC<BookFormModalProps> = ({
  book,
  overallRate = 100,
  isOpen,
  onClose,
  onOpenOverallRateModal,
  onSubmit,
}) => {
  const isEditing = Boolean(book);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [genre, setGenre] = useState('General');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [totalCopies, setTotalCopies] = useState(1);
  const [availableCopies, setAvailableCopies] = useState(1);
  const [customFee, setCustomFee] = useState<string>(String(overallRate));
  const [useCustomFee, setUseCustomFee] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (book) {
      setTitle(book.title);
      setAuthor(book.author);
      setIsbn(book.isbn || '');
      setGenre(book.genre || 'General');
      setDescription(book.description || '');
      setCoverUrl(book.cover_url || '');
      setTotalCopies(book.total_copies);
      setAvailableCopies(book.available_copies);
      const isDifferent = book.weekly_fee !== undefined && book.weekly_fee !== overallRate;
      setUseCustomFee(isDifferent);
      setCustomFee(String(book.weekly_fee ?? overallRate));
    } else {
      setTitle('');
      setAuthor('');
      setIsbn('');
      setGenre('General');
      setDescription('');
      setCoverUrl('');
      setTotalCopies(3);
      setAvailableCopies(3);
      setUseCustomFee(false);
      setCustomFee(String(overallRate));
    }
    setError(null);
  }, [book, isOpen, overallRate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      setError('Title and Author are required fields.');
      return;
    }
    if (totalCopies < 1) {
      setError('Total copies must be at least 1.');
      return;
    }

    const finalFee = useCustomFee ? parseFloat(customFee) : overallRate;
    if (isNaN(finalFee) || finalFee < 0) {
      setError('Weekly fee must be a valid positive number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim() || undefined,
        genre: genre.trim() || 'General',
        description: description.trim() || undefined,
        cover_url: coverUrl.trim() || undefined,
        total_copies: Number(totalCopies),
        available_copies: isEditing ? Number(availableCopies) : Number(totalCopies),
        weekly_fee: Number(finalFee),
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save book');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d2d26]/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#e2e0d5] space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-[#f0eee4] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#efede4] text-[#5A5A40] flex items-center justify-center">
              {isEditing ? <Edit3 className="w-4 h-4" /> : <BookPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#2d2d26]">
                {isEditing ? 'Edit Book Details' : 'Add Book to Library'}
              </h3>
              <p className="text-xs text-[#8c8c7d]">
                Configure catalog metadata, shelf copy quantity, and weekly rental rates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8c8c7d] hover:text-[#2d2d26] font-bold p-1"
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title & Author */}
          <div>
            <label className="block font-semibold text-[#434338] mb-1">
              Book Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. The Pragmatic Programmer"
              className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs sm:text-sm text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#434338] mb-1">
                Author *
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="e.g. Andy Hunt & Dave Thomas"
                className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#434338] mb-1">
                Genre / Category
              </label>
              <input
                type="text"
                value={genre}
                onChange={e => setGenre(e.target.value)}
                placeholder="e.g. Technology, Fiction, History"
                className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#434338] mb-1">
                ISBN (Optional)
              </label>
              <input
                type="text"
                value={isbn}
                onChange={e => setIsbn(e.target.value)}
                placeholder="978-0135957059"
                className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-[#434338]">
                  Weekly Loan Fee
                </label>
                {onOpenOverallRateModal && (
                  <button
                    type="button"
                    onClick={onOpenOverallRateModal}
                    className="text-[10px] text-[#5A5A40] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    title="Change default library rate"
                  >
                    <Coins className="w-3 h-3" />
                    <span>Library Rate ({formatCurrency(overallRate)})</span>
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-3 bg-[#f8f7f2] p-1.5 rounded-xl border border-[#e2e0d5]">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="feeType"
                      checked={!useCustomFee}
                      onChange={() => setUseCustomFee(false)}
                      className="text-[#5A5A40] focus:ring-[#5A5A40] cursor-pointer"
                    />
                    <span className="text-[#2d2d26] text-[11px] font-medium">Default ({formatCurrency(overallRate)}/wk)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="feeType"
                      checked={useCustomFee}
                      onChange={() => setUseCustomFee(true)}
                      className="text-[#5A5A40] focus:ring-[#5A5A40] cursor-pointer"
                    />
                    <span className="text-[#2d2d26] text-[11px] font-medium">Custom Rate</span>
                  </label>
                </div>

                {useCustomFee ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-[#8c8c7d]">
                      KSh
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      required
                      value={customFee}
                      onChange={e => setCustomFee(e.target.value)}
                      placeholder={`e.g. ${overallRate}`}
                      className="w-full pl-12 pr-3 py-1.5 bg-white border border-[#e2e0d5] rounded-xl text-xs font-semibold text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] font-mono"
                    />
                  </div>
                ) : (
                  <div className="px-2.5 py-1.5 bg-[#efede4]/50 border border-[#e2e0d5] rounded-xl flex items-center justify-between text-[11px]">
                    <span className="text-[#5A5A40] font-medium">Using Library Default</span>
                    <span className="font-mono font-bold text-[#2d2d26]">
                      {formatCurrency(overallRate)} / wk
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Copy Quantities */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#f8f7f2] rounded-2xl border border-[#f0eee4]">
            <div>
              <label className="block font-semibold text-[#434338] mb-1">
                Total Copies in Library *
              </label>
              <input
                type="number"
                min="1"
                required
                value={totalCopies}
                onChange={e => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setTotalCopies(val);
                  if (!isEditing) setAvailableCopies(val);
                }}
                className="w-full p-2 bg-white border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] font-mono"
              />
            </div>

            {isEditing ? (
              <div>
                <label className="block font-semibold text-[#434338] mb-1">
                  Available On Shelf
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalCopies}
                  value={availableCopies}
                  onChange={e => setAvailableCopies(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2 bg-white border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] font-mono"
                />
              </div>
            ) : (
              <div className="flex flex-col justify-center">
                <span className="text-[11px] text-[#8c8c7d]">Initial Availability:</span>
                <span className="font-semibold text-[#166534]">{totalCopies} Copies available</span>
              </div>
            )}
          </div>

          {/* Cover Image URL & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-[#434338]">
                Cover Image URL (Optional)
              </label>
              <span className="text-[10px] text-[#8c8c7d]">Click preset to fill:</span>
            </div>
            <input
              type="url"
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              placeholder="https://..."
              className="w-full p-2 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white mb-2"
            />
            
            {/* Sample Image Thumbnails */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {SAMPLE_COVERS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCoverUrl(sample)}
                  className={`w-10 h-14 rounded-lg overflow-hidden border border-[#e2e0d5] shrink-0 transition-transform ${
                    coverUrl === sample ? 'ring-2 ring-[#5A5A40] scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={sample} alt="Sample" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-[#434338] mb-1">
              Description / Synopsis
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief summary of the book..."
              className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-[#f0eee4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#8c8c7d] hover:text-[#2d2d26] hover:bg-[#efede4] rounded-full text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors"
            >
              {loading ? 'Saving...' : isEditing ? 'Update Book' : 'Add to Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
