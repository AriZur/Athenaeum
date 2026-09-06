import React, { useState, useEffect } from 'react';
import { Coins, AlertTriangle, CheckCircle2, Info, Sparkles, Check } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';

interface OverallRateModalProps {
  isOpen: boolean;
  currentRate: number;
  onClose: () => void;
  onSaveRate: (newRate: number, updateExistingBooks: boolean) => Promise<void>;
}

export const OverallRateModal: React.FC<OverallRateModalProps> = ({
  isOpen,
  currentRate,
  onClose,
  onSaveRate,
}) => {
  const [rateInput, setRateInput] = useState<string>(String(currentRate));
  const [updateExisting, setUpdateExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRateInput(String(currentRate));
      setUpdateExisting(true);
      setError(null);
    }
  }, [isOpen, currentRate]);

  if (!isOpen) return null;

  const quickPresets = [50, 75, 100, 120, 150, 200, 250, 300];
  const parsedRate = parseFloat(rateInput) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(rateInput);
    if (isNaN(num) || num < 0) {
      setError('Please enter a valid rate in Kenyan Shillings (0 or higher).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSaveRate(num, updateExisting);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update overall rate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d2d26]/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#e2e0d5] space-y-5 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#f0eee4] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#efede4] text-[#5A5A40] flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2d2d26]">
                Customize Library Pricing
              </h3>
              <p className="text-xs text-[#8c8c7d]">
                Set your custom overall weekly loan rate for books instead of the fixed 100 KSh.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8c8c7d] hover:text-[#2d2d26] font-bold p-1 transition-colors cursor-pointer"
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

        {/* Current Rate Banner */}
        <div className="p-3.5 bg-[#f8f7f2] border border-[#f0eee4] rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#8c8c7d] tracking-wider">
              Current Weekly Rate
            </div>
            <div className="text-xs text-[#434338] mt-0.5">
              Current default charged per book week
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-base text-[#5A5A40]">
              {formatCurrency(currentRate)} / wk
            </div>
            <span className="text-[10px] text-[#8c8c7d]">Active Library Fee</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#434338] mb-1.5">
              Custom Overall Weekly Loan Rate (Kenyan Shillings - KSh) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-[#8c8c7d]">
                KSh
              </span>
              <input
                type="number"
                min="0"
                step="5"
                required
                value={rateInput}
                onChange={e => setRateInput(e.target.value)}
                placeholder="e.g. 50, 150, 200..."
                className="w-full pl-14 pr-4 py-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-sm font-semibold text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white transition-all font-mono"
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <div className="text-[11px] font-medium text-[#8c8c7d] mb-1.5 flex items-center justify-between">
              <span>Quick Preset Options:</span>
              <span className="text-[10px] text-[#5A5A40] italic">Click to select</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRateInput(String(val))}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    rateInput === String(val)
                      ? 'bg-[#5A5A40] text-white shadow-2xs font-bold'
                      : 'bg-[#efede4] text-[#5A5A40] hover:bg-[#e2e0d5]'
                  }`}
                >
                  KSh {val}
                </button>
              ))}
            </div>
          </div>

          {/* Fee Schedule Preview Card */}
          <div className="p-3.5 bg-[#fcfbf7] border border-[#f0eee4] rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5A5A40]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Calculated Borrower Charges at KSh {parsedRate}/week:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-xl border border-[#f0eee4]">
                <div className="text-[10px] text-[#8c8c7d]">1 Week</div>
                <div className="font-mono font-bold text-[#2d2d26] mt-0.5">{formatCurrency(parsedRate)}</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-[#f0eee4]">
                <div className="text-[10px] text-[#8c8c7d]">2 Weeks</div>
                <div className="font-mono font-bold text-[#2d2d26] mt-0.5">{formatCurrency(parsedRate * 2)}</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-[#f0eee4]">
                <div className="text-[10px] text-[#8c8c7d]">3 Weeks</div>
                <div className="font-mono font-bold text-[#2d2d26] mt-0.5">{formatCurrency(parsedRate * 3)}</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-[#f0eee4]">
                <div className="text-[10px] text-[#8c8c7d]">4 Wks (Max)</div>
                <div className="font-mono font-bold text-[#2d2d26] mt-0.5">{formatCurrency(parsedRate * 4)}</div>
              </div>
            </div>
            <div className="text-[11px] text-[#8c8c7d] text-center pt-1">
              Extension fee: <strong>+{formatCurrency(parsedRate)}</strong> per additional week up to the 4-week ceiling
            </div>
          </div>

          {/* Catalog Sync Option */}
          <label className="flex items-start gap-3 p-3 bg-[#f8f7f2] hover:bg-[#efede4]/50 border border-[#e2e0d5] rounded-2xl cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={updateExisting}
              onChange={e => setUpdateExisting(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded-md text-[#5A5A40] focus:ring-[#5A5A40] border-[#d1cfc0] cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-semibold text-[#2d2d26] block">
                Update all existing library books to this new rate
              </span>
              <span className="text-[#8c8c7d] text-[11px] block mt-0.5">
                Automatically adjusts the loan price of all titles in your catalog to maintain uniform pricing.
              </span>
            </div>
          </label>

          {/* Info note */}
          <div className="p-3 bg-[#efede4]/60 border border-[#e2e0d5] rounded-2xl flex items-start gap-2.5 text-[11px] text-[#5A5A40]">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#5A5A40]" />
            <p className="leading-relaxed">
              This customized rate becomes your default library pricing and will be pre-filled whenever new books are registered or loans are checked out.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#8c8c7d] hover:text-[#2d2d26] hover:bg-[#efede4] rounded-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Saving Pricing...' : 'Save Overall Pricing'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
