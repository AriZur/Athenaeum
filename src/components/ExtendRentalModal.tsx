import React, { useState } from 'react';
import { RotateCw, AlertTriangle, CheckCircle, Calendar, DollarSign, Clock } from 'lucide-react';
import { RentalWithDetails } from '../types';
import { formatCurrency, formatDate } from '../lib/formatters';

interface ExtendRentalModalProps {
  rental: RentalWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmExtend: (rentalId: string, notes?: string) => Promise<void>;
}

export const ExtendRentalModal: React.FC<ExtendRentalModalProps> = ({
  rental,
  isOpen,
  onClose,
  onConfirmExtend,
}) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !rental) return null;

  const currentWeeks = rental.weeks_borrowed;
  const nextWeek = currentWeeks + 1;
  const isAtLimit = currentWeeks >= 4;

  const currentDueDate = new Date(rental.due_date);
  const baseDate = currentDueDate > new Date() ? currentDueDate : new Date();
  const nextDueDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const handleExtend = async () => {
    if (isAtLimit) {
      setError('Cannot extend: Maximum 4-week holding limit reached.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirmExtend(rental.id, notes.trim() || undefined);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to extend rental');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d2d26]/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e2e0d5] space-y-5">
        <div className="flex items-start justify-between border-b border-[#f0eee4] pb-3">
          <div>
            <h3 className="font-serif text-xl font-bold text-[#2d2d26]">
              Extend Weekly Loan
            </h3>
            <p className="text-xs text-[#8c8c7d]">
              Renew borrow duration by 1 week and assess weekly renewal fee.
            </p>
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
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          {/* Book and borrower header */}
          <div className="bg-[#f8f7f2] rounded-2xl p-3.5 border border-[#f0eee4] space-y-1">
            <div className="font-bold text-[#2d2d26] text-sm font-serif">
              {rental.book?.title}
            </div>
            <div className="text-[#8c8c7d]">
              Borrower: <strong className="text-[#2d2d26]">{rental.member?.full_name}</strong> ({rental.member?.membership_number})
            </div>
          </div>

          {/* 4-Week Holding Policy Banner */}
          <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
            isAtLimit 
              ? 'bg-rose-50 border-rose-200 text-rose-900' 
              : 'bg-[#efede4] border-[#e2e0d5] text-[#2d2d26]'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[#8c8c7d] font-medium">Holding Policy Status:</span>
              <span className={`font-bold ${isAtLimit ? 'text-rose-700' : 'text-[#5A5A40]'}`}>
                {isAtLimit ? 'Maximum 4-Week Limit Reached' : 'Eligible for 1-Week Extension'}
              </span>
            </div>

            <div className="text-[11px] leading-relaxed">
              {isAtLimit ? (
                <span className="font-semibold text-rose-700">
                  Borrowers are not permitted to continuously extend loans beyond 4 weeks total. This book must now be returned to the library shelves.
                </span>
              ) : (
                <span className="text-[#434338]">
                  Library rules allow weekly renewals up to a strict 4-week maximum limit. Each extension renews the active loan for +7 calendar days.
                </span>
              )}
            </div>
          </div>

          {/* Timeline & Fee Calculation */}
          <div className="border border-[#f0eee4] rounded-2xl p-3.5 space-y-2 bg-white">
            <div className="flex justify-between items-center">
              <span className="text-[#8c8c7d]">Current Due Date:</span>
              <span className="font-medium text-[#2d2d26]">{formatDate(rental.due_date)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8c8c7d]">New Due Date (+7 Days):</span>
              <span className="font-bold text-[#2d2d26]">{formatDate(nextDueDate.toISOString())}</span>
            </div>
            <div className="pt-2 border-t border-[#f0eee4] flex justify-between items-center">
              <span className="font-semibold text-[#2d2d26]">Extension Fee (Kenyan Shillings):</span>
              <span className="font-mono font-bold text-[#166534] text-sm">
                +{formatCurrency(rental.weekly_fee)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-[#8c8c7d]">
              <span>Cumulative Fees Paid:</span>
              <span className="font-mono">{formatCurrency(rental.total_fees_paid + rental.weekly_fee)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-[#434338] mb-1">
              Extension Notes (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Extended by phone, fee collected in cash"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-[#5A5A40]"
            />
          </div>
        </div>

        {/* Action Buttons */}
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
            onClick={handleExtend}
            disabled={loading || isAtLimit}
            className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-colors flex items-center gap-1.5 ${
              isAtLimit
                ? 'bg-[#efede4] text-[#8c8c7d] cursor-not-allowed'
                : 'bg-[#5A5A40] hover:bg-[#484833]'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Extending...' : isAtLimit ? 'Max 4-Week Limit Reached' : `Extend +7 Days (${formatCurrency(rental.weekly_fee)})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
