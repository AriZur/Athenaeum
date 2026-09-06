import React, { useState } from 'react';
import { CheckCircle2, BookOpen, AlertCircle } from 'lucide-react';
import { RentalWithDetails } from '../types';
import { formatCurrency, formatDate } from '../lib/formatters';

interface ReturnRentalModalProps {
  rental: RentalWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReturn: (rentalId: string, notes?: string) => Promise<void>;
}

export const ReturnRentalModal: React.FC<ReturnRentalModalProps> = ({
  rental,
  isOpen,
  onClose,
  onConfirmReturn,
}) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !rental) return null;

  const handleReturn = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirmReturn(rental.id, notes.trim() || undefined);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to mark book as returned');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d2d26]/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e2e0d5] space-y-5">
        <div className="flex items-start justify-between border-b border-[#f0eee4] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#dcfce7] text-[#166534] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2d2d26]">
                Mark Book as Returned
              </h3>
              <p className="text-xs text-[#8c8c7d]">
                Restores volume back to available inventory.
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

        <div className="bg-[#f8f7f2] rounded-2xl p-3.5 text-xs space-y-2 border border-[#f0eee4]">
          <div className="font-serif font-bold text-[#2d2d26] text-sm">
            {rental.book?.title}
          </div>
          <div className="text-[#434338]">
            Borrower: <strong className="text-[#2d2d26]">{rental.member?.full_name}</strong> ({rental.member?.membership_number})
          </div>
          <div className="flex justify-between text-[#8c8c7d] pt-1.5 border-t border-[#e2e0d5]">
            <span>Loan Status:</span>
            <span className="font-semibold text-[#2d2d26]">
              {rental.status === 'extended' ? 'Extended Loan' : rental.status === 'overdue' ? 'Overdue Loan' : 'Active Loan'}
            </span>
          </div>
          <div className="flex justify-between text-[#8c8c7d]">
            <span>Due Date:</span>
            <span className="font-medium text-[#2d2d26]">{formatDate(rental.due_date)}</span>
          </div>
          <div className="flex justify-between text-[#8c8c7d]">
            <span>Total Fees Recorded:</span>
            <span className="font-mono font-bold text-[#166534]">{formatCurrency(rental.total_fees_paid)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#434338] mb-1">
            Condition & Return Notes (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Returned on time, pristine spine and pages"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[#8c8c7d] hover:text-[#2d2d26] hover:bg-[#efede4] rounded-full text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReturn}
            disabled={loading}
            className="px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Processing Return...' : 'Confirm Return to Shelves'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
