import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Phone, Search, ChevronDown, Check, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface CountryCodeItem {
  code: string;
  country: string;
  flag: string;
  expectedDigits: number | [number, number];
  example: string;
}

export const COUNTRY_CODES: CountryCodeItem[] = [
  { code: '+254', country: 'Kenya', flag: '🇰🇪', expectedDigits: 9, example: '712 345 678' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬', expectedDigits: 9, example: '712 345 678' },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿', expectedDigits: 9, example: '712 345 678' },
  { code: '+250', country: 'Rwanda', flag: '🇷🇼', expectedDigits: 9, example: '788 123 456' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬', expectedDigits: 10, example: '802 123 4567' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦', expectedDigits: 9, example: '82 123 4567' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭', expectedDigits: 9, example: '24 123 4567' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬', expectedDigits: 10, example: '100 123 4567' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦', expectedDigits: 9, example: '612 345 678' },
  { code: '+1', country: 'US / Canada', flag: '🇺🇸', expectedDigits: 10, example: '202 555 0199' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧', expectedDigits: 10, example: '7911 123456' },
  { code: '+91', country: 'India', flag: '🇮🇳', expectedDigits: 10, example: '98765 43210' },
  { code: '+61', country: 'Australia', flag: '🇦🇺', expectedDigits: 9, example: '412 345 678' },
  { code: '+49', country: 'Germany', flag: '🇩🇪', expectedDigits: [10, 11], example: '151 2345678' },
  { code: '+33', country: 'France', flag: '🇫🇷', expectedDigits: 9, example: '6 12 34 56 78' },
  { code: '+39', country: 'Italy', flag: '🇮🇹', expectedDigits: 10, example: '312 345 6789' },
  { code: '+34', country: 'Spain', flag: '🇪🇸', expectedDigits: 9, example: '612 345 678' },
  { code: '+81', country: 'Japan', flag: '🇯🇵', expectedDigits: 10, example: '90 1234 5678' },
  { code: '+86', country: 'China', flag: '🇨🇳', expectedDigits: 11, example: '138 0013 8000' },
  { code: '+971', country: 'UAE', flag: '🇦🇪', expectedDigits: 9, example: '50 123 4567' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷', expectedDigits: 11, example: '11 91234 5678' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽', expectedDigits: 10, example: '55 1234 5678' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭', expectedDigits: 10, example: '917 123 4567' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰', expectedDigits: 10, example: '300 1234567' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', expectedDigits: 8, example: '8123 4567' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱', expectedDigits: 9, example: '6 12345678' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪', expectedDigits: 9, example: '70 123 45 67' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭', expectedDigits: 9, example: '79 123 45 67' },
];

export function validatePhoneDigits(phoneNumber: string): {
  isValid: boolean;
  errorMessage?: string;
  countryItem?: CountryCodeItem;
  digitsCount: number;
} {
  const trimmed = phoneNumber.trim();
  if (!trimmed) {
    return { isValid: false, errorMessage: 'Phone number is required.', digitsCount: 0 };
  }

  // Find country item
  const countryItem = COUNTRY_CODES.find(c => trimmed.startsWith(c.code));
  let localPart = '';
  if (countryItem) {
    localPart = trimmed.slice(countryItem.code.length).trim();
  } else if (trimmed.startsWith('+')) {
    const parts = trimmed.split(' ');
    localPart = parts.slice(1).join(' ').trim();
  } else {
    localPart = trimmed;
  }

  // If Kenya (+254) and starts with '0', normalize
  let digits = localPart.replace(/\D/g, '');
  if (countryItem?.code === '+254' && digits.length === 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  const digitsCount = digits.length;

  if (countryItem) {
    const expected = countryItem.expectedDigits;
    if (typeof expected === 'number') {
      if (digitsCount !== expected) {
        return {
          isValid: false,
          errorMessage: `Phone number for ${countryItem.country} (${countryItem.code}) must have exactly ${expected} digits (e.g. ${countryItem.example}). You entered ${digitsCount} digits.`,
          countryItem,
          digitsCount,
        };
      }
    } else if (Array.isArray(expected)) {
      const [min, max] = expected;
      if (digitsCount < min || digitsCount > max) {
        return {
          isValid: false,
          errorMessage: `Phone number for ${countryItem.country} (${countryItem.code}) must have between ${min} and ${max} digits (e.g. ${countryItem.example}). You entered ${digitsCount} digits.`,
          countryItem,
          digitsCount,
        };
      }
    }
  } else {
    // Default fallback: 7-12 digits
    if (digitsCount < 7 || digitsCount > 12) {
      return {
        isValid: false,
        errorMessage: `Phone number must contain between 7 and 12 digits. You entered ${digitsCount} digits.`,
        digitsCount,
      };
    }
  }

  return { isValid: true, countryItem, digitsCount };
}

interface PhoneCountryInputProps {
  value: string;
  onChange: (fullPhoneNumber: string) => void;
  required?: boolean;
  placeholder?: string;
}

export const PhoneCountryInput: React.FC<PhoneCountryInputProps> = ({
  value,
  onChange,
  required = true,
  placeholder,
}) => {
  // Parse incoming value
  const parseValue = (val: string) => {
    if (!val) {
      return {
        code: '+254',
        country: COUNTRY_CODES[0],
        localNumber: '',
      };
    }

    const trimmed = val.trim();
    const matched = COUNTRY_CODES.find(c => trimmed.startsWith(c.code));
    if (matched) {
      let rest = trimmed.slice(matched.code.length).trim();
      return {
        code: matched.code,
        country: matched,
        localNumber: rest,
      };
    }

    if (trimmed.startsWith('+')) {
      const parts = trimmed.split(' ');
      const codePart = parts[0];
      const restPart = parts.slice(1).join(' ').trim();
      return {
        code: codePart,
        country: undefined,
        localNumber: restPart,
      };
    }

    return {
      code: '+254',
      country: COUNTRY_CODES[0],
      localNumber: trimmed,
    };
  };

  const initial = parseValue(value);
  const [selectedCode, setSelectedCode] = useState<string>(initial.code);
  const [activeCountry, setActiveCountry] = useState<CountryCodeItem | undefined>(initial.country);
  const [localNumber, setLocalNumber] = useState<string>(initial.localNumber);

  // Typeable country code search state
  const [codeSearchText, setCodeSearchText] = useState<string>(
    initial.country ? `${initial.country.flag} ${initial.country.code}` : initial.code
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Keep state in sync with prop
  useEffect(() => {
    const parsed = parseValue(value);
    setSelectedCode(parsed.code);
    setActiveCountry(parsed.country);
    setLocalNumber(parsed.localNumber);
    if (!isDropdownOpen) {
      setCodeSearchText(
        parsed.country ? `${parsed.country.flag} ${parsed.country.code}` : parsed.code
      );
    }
  }, [value, isDropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        // Reset displayed text to current selection
        if (activeCountry) {
          setCodeSearchText(`${activeCountry.flag} ${activeCountry.code}`);
        } else {
          setCodeSearchText(selectedCode);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCountry, selectedCode]);

  // Filter country codes based on what the user types
  const filteredCountries = useMemo(() => {
    if (!codeSearchText.trim()) return COUNTRY_CODES;
    const cleanSearch = codeSearchText
      .replace(/[^\w\s+]/g, '')
      .trim()
      .toLowerCase();

    return COUNTRY_CODES.filter(item => {
      const codeClean = item.code.toLowerCase().replace('+', '');
      const itemCode = item.code.toLowerCase();
      const country = item.country.toLowerCase();

      return (
        itemCode.includes(cleanSearch) ||
        codeClean.includes(cleanSearch) ||
        country.includes(cleanSearch)
      );
    });
  }, [codeSearchText]);

  const emitChange = (code: string, num: string) => {
    const cleanNum = num.trim();
    if (!cleanNum) {
      onChange('');
      return;
    }
    onChange(`${code} ${cleanNum}`);
  };

  const handleSelectCountry = (item: CountryCodeItem) => {
    setSelectedCode(item.code);
    setActiveCountry(item);
    setCodeSearchText(`${item.flag} ${item.code}`);
    setIsDropdownOpen(false);

    // If local number has leading 0 and Kenya, clean it up
    let cleanLocal = localNumber;
    if (item.code === '+254' && cleanLocal.startsWith('0') && cleanLocal.length === 10) {
      cleanLocal = cleanLocal.slice(1);
      setLocalNumber(cleanLocal);
    }

    emitChange(item.code, cleanLocal);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Allow digits, spaces, hyphens
    let cleaned = raw.replace(/[^\d\s-]/g, '');

    // For Kenya (+254), if user types 07... or 01..., auto-strip leading 0 if 10 digits
    const pureDigits = cleaned.replace(/\D/g, '');
    if (selectedCode === '+254' && pureDigits.startsWith('0') && pureDigits.length >= 10) {
      cleaned = pureDigits.slice(1);
    }

    setLocalNumber(cleaned);
    emitChange(selectedCode, cleaned);
  };

  // Digits validation info
  const digitsOnly = localNumber.replace(/\D/g, '');
  const digitsCount = digitsOnly.length;

  let expectedText = '9 digits';
  let isCountValid = false;
  let isCountTooShort = false;
  let isCountTooLong = false;

  if (activeCountry) {
    const exp = activeCountry.expectedDigits;
    if (typeof exp === 'number') {
      expectedText = `${exp} digits`;
      isCountValid = digitsCount === exp;
      isCountTooShort = digitsCount > 0 && digitsCount < exp;
      isCountTooLong = digitsCount > exp;
    } else {
      expectedText = `${exp[0]}-${exp[1]} digits`;
      isCountValid = digitsCount >= exp[0] && digitsCount <= exp[1];
      isCountTooShort = digitsCount > 0 && digitsCount < exp[0];
      isCountTooLong = digitsCount > exp[1];
    }
  } else {
    expectedText = '7-12 digits';
    isCountValid = digitsCount >= 7 && digitsCount <= 12;
    isCountTooShort = digitsCount > 0 && digitsCount < 7;
    isCountTooLong = digitsCount > 12;
  }

  const effectivePlaceholder =
    placeholder || (activeCountry ? `e.g. ${activeCountry.example}` : 'e.g. 712 345 678');

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-1.5">
        {/* Typeable Country Code with Interactive Dropdown */}
        <div className="relative w-36 sm:w-40 shrink-0" ref={countryDropdownRef}>
          <div className="relative flex items-center">
            <input
              ref={codeInputRef}
              type="text"
              value={codeSearchText}
              onChange={e => {
                setCodeSearchText(e.target.value);
                setIsDropdownOpen(true);
                // If user enters direct +xxx code
                if (e.target.value.startsWith('+')) {
                  const typed = e.target.value.trim();
                  setSelectedCode(typed);
                  const matched = COUNTRY_CODES.find(c => c.code === typed);
                  setActiveCountry(matched);
                  emitChange(typed, localNumber);
                }
              }}
              onFocus={() => {
                setIsDropdownOpen(true);
                // Clear text slightly to allow easy search if already selected
                if (activeCountry) {
                  setCodeSearchText(activeCountry.country);
                }
              }}
              placeholder="+254"
              className="w-full h-10 pl-2.5 pr-6 bg-white border border-[#e2e0d5] focus:border-[#5A5A40] rounded-xl text-xs font-semibold text-[#2d2d26] focus:ring-2 focus:ring-[#5A5A40]/10 shadow-2xs transition-all cursor-text"
              title="Type country name or dial code (e.g. 254, Kenya, US, +1)"
            />
            <ChevronDown className="w-3.5 h-3.5 text-[#8c8c7d] absolute right-2 pointer-events-none" />
          </div>

          {/* Interactive Dropdown as User Types */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-white border border-[#e2e0d5] rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-0.5">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#8c8c7d] tracking-wider border-b border-[#f0eee4] flex items-center justify-between">
                <span>Select Country Code ({filteredCountries.length})</span>
              </div>

              {filteredCountries.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#8c8c7d]">
                  No matching country. Type custom code like <strong className="text-[#2d2d26] font-mono">+xxx</strong>.
                </div>
              ) : (
                filteredCountries.map(item => {
                  const isSelected = selectedCode === item.code;
                  return (
                    <div
                      key={item.code + item.country}
                      onClick={() => handleSelectCountry(item)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#efede4] font-bold text-[#2d2d26]'
                          : 'hover:bg-[#f8f7f2] text-[#434338]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base leading-none">{item.flag}</span>
                        <span className="truncate">{item.country}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#5A5A40] shrink-0">
                        <span>{item.code}</span>
                        {isSelected && <Check className="w-3 h-3 text-[#166534]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Local Phone Number Input with Digit Length Indicator */}
        <div className="relative flex-1">
          <input
            type="tel"
            required={required}
            value={localNumber}
            onChange={handleNumberChange}
            placeholder={effectivePlaceholder}
            className={`w-full h-10 pl-3 pr-8 bg-white border rounded-xl text-xs sm:text-sm text-[#2d2d26] font-medium placeholder-[#8c8c7d] focus:outline-hidden transition-all shadow-2xs ${
              digitsCount === 0
                ? 'border-[#e2e0d5] focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/10'
                : isCountValid
                ? 'border-[#86efac] focus:border-[#166534] focus:ring-2 focus:ring-[#86efac]/30 bg-[#f0fdf4]/30'
                : isCountTooLong
                ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/30'
                : 'border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
            }`}
          />
          <Phone className="w-3.5 h-3.5 text-[#8c8c7d] absolute right-3 top-3.5 pointer-events-none" />
        </div>
      </div>

      {/* Real-time Digit Requirement & Validation Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[#8c8c7d]">
            Requirement ({activeCountry?.country || selectedCode}):
          </span>
          <span className="font-semibold text-[#434338] font-mono">
            {expectedText}
          </span>
        </div>

        {digitsCount > 0 && (
          <div className="flex items-center gap-1">
            {isCountValid ? (
              <span className="inline-flex items-center gap-1 text-[#166534] font-semibold bg-[#dcfce7] px-2 py-0.5 rounded-full text-[10px]">
                <CheckCircle2 className="w-3 h-3" />
                {digitsCount} digits (Valid)
              </span>
            ) : isCountTooShort ? (
              <span className="inline-flex items-center gap-1 text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                {digitsCount} digits (Need {typeof activeCountry?.expectedDigits === 'number' ? activeCountry.expectedDigits - digitsCount : 'more'} more)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-800 font-semibold bg-rose-100 px-2 py-0.5 rounded-full text-[10px]">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                {digitsCount} digits (Too many digits)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Formatted Preview */}
      {localNumber.trim() && (
        <div className="text-[10px] text-[#8c8c7d] px-1 font-mono">
          Full Dialing Number: <strong className="text-[#5A5A40]">{selectedCode} {localNumber}</strong>
        </div>
      )}
    </div>
  );
};
