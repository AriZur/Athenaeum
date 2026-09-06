import React, { useState, useEffect } from 'react';
import { UserPlus, Edit3, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';
import { Member } from '../types';
import { PhoneCountryInput, validatePhoneDigits } from './PhoneCountryInput';

interface MemberFormModalProps {
  member?: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    full_name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    status?: 'active' | 'suspended' | 'expired';
  }) => Promise<void>;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  member,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(member);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+254 ');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'active' | 'suspended' | 'expired'>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setFullName(member.full_name || '');
      setEmail(member.email || '');
      setPhone(member.phone || '+254 ');
      setAddress(member.address || '');
      setStatus(member.status || 'active');
    } else {
      setFullName('');
      setEmail('');
      setPhone('+254 ');
      setAddress('');
      setStatus('active');
    }
    setError(null);
  }, [member, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter the member full legal name.');
      return;
    }

    if (!phone.trim()) {
      setError('Please provide a phone number with country calling code.');
      return;
    }

    const phoneValidation = validatePhoneDigits(phone);
    if (!phoneValidation.isValid) {
      setError(phoneValidation.errorMessage || 'Please enter a valid phone number with the correct number of digits.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() ? email.trim().toLowerCase() : null,
        address: address.trim() || null,
        status: isEditing ? status : 'active',
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save member record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d2d26]/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e2e0d5] space-y-5">
        <div className="flex items-start justify-between border-b border-[#f0eee4] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#efede4] text-[#5A5A40] flex items-center justify-center">
              {isEditing ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#2d2d26]">
                {isEditing ? 'Edit Member Record' : 'Register Library Member'}
              </h3>
              <p className="text-xs text-[#8c8c7d]">
                Permanent borrower record with country-coded phone contact.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8c8c7d] hover:text-[#2d2d26] font-bold p-1 cursor-pointer"
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
          {/* Full Name */}
          <div>
            <label className="block font-semibold text-[#434338] mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Eleanor Vance"
              className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
            />
          </div>

          {/* Phone Number with Country Code (Required) */}
          <div>
            <label className="block font-semibold text-[#434338] mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>Phone Number with Country Code *</span>
              </span>
              <span className="text-[10px] text-[#5A5A40] font-normal">Required</span>
            </label>
            <PhoneCountryInput
              value={phone}
              onChange={setPhone}
              required
              placeholder="e.g. 555-0199 or 801 234 5678"
            />
          </div>

          {/* Email Address (Optional) */}
          <div>
            <label className="block font-semibold text-[#434338] mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#8c8c7d]" />
                <span>Email Address</span>
              </span>
              <span className="text-[10px] text-[#8c8c7d] font-normal">Optional</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com (not required)"
              className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
            />
            <p className="text-[11px] text-[#8c8c7d] mt-1">
              Email address is optional. All checkout logs and records are bound to the member phone & membership ID.
            </p>
          </div>

          {/* Address (Optional) */}
          <div>
            <label className="block font-semibold text-[#434338] mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#8c8c7d]" />
              <span>Physical Address (Optional)</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 42 Pine Crest Rd, City"
              className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
            />
          </div>

          {isEditing && (
            <div>
              <label className="block font-semibold text-[#434338] mb-1">
                Account Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full p-2.5 bg-[#f8f7f2] border border-[#e2e0d5] rounded-xl text-xs text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40] focus:bg-white"
              >
                <option value="active">Active (Permitted to borrow)</option>
                <option value="suspended">Suspended (Holds blocked)</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2 border-t border-[#f0eee4]">
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
              className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
            >
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
