import { useState } from 'react';
import Modal from './Modal';
import { t, type Lang } from '../i18n';

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
  lang: Lang;
}

const CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' }
];

const COUNTRY_CODES: { code: string; dial: string; name: string }[] = [
  { code: 'RW', dial: '+250', name: 'Rwanda' },
  { code: 'KE', dial: '+254', name: 'Kenya' },
  { code: 'UG', dial: '+256', name: 'Uganda' },
  { code: 'TZ', dial: '+255', name: 'Tanzania' },
  { code: 'NG', dial: '+234', name: 'Nigeria' },
  { code: 'GH', dial: '+233', name: 'Ghana' },
  { code: 'ZA', dial: '+27', name: 'South Africa' },
  { code: 'GB', dial: '+44', name: 'United Kingdom' },
  { code: 'US', dial: '+1', name: 'United States' },
  { code: 'CA', dial: '+1', name: 'Canada' },
  { code: 'FR', dial: '+33', name: 'France' },
  { code: 'DE', dial: '+49', name: 'Germany' },
  { code: 'BE', dial: '+32', name: 'Belgium' },
  { code: 'CH', dial: '+41', name: 'Switzerland' },
  { code: 'IN', dial: '+91', name: 'India' },
  { code: 'AU', dial: '+61', name: 'Australia' },
  { code: 'JP', dial: '+81', name: 'Japan' }
];

export default function SupportModal({ open, onClose, lang }: SupportModalProps) {
  const s = t(lang);
  const [currency, setCurrency] = useState('RWF');
  const [countryCode, setCountryCode] = useState('+250');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currencyInfo = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

  const validate = (): string | null => {
    const num = phone.replace(/\D/g, '');
    if (num.length < 6) return s.supportInvalidPhone;
    const amt = Number(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) return s.supportInvalidAmount;
    return null;
  };

  const handleConfirm = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          amount: Number(amount),
          phone: fullPhone,
          lang
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Payment init failed');
      }
      const link = data?.data?.link || data?.link || data?.checkout_url;
      if (link) {
        window.location.href = link;
      } else {
        setError(data?.message || 'Payment initiated. Follow the prompt on your phone.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title={s.supportTitle} closeLabel={s.close} onClose={onClose}>
      <div className="space-y-3">
        {/* Currency */}
        <div>
          <label className="mb-1 block text-[10px] font-bold tracking-[0.18em] text-[#FACC15]/80 uppercase">
            {s.supportCurrency}
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#FACC15]/70"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-[#2B0F5C] text-white">
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* From which number */}
        <div>
          <label className="mb-1 block text-[10px] font-bold tracking-[0.18em] text-[#FACC15]/80 uppercase">
            {s.supportFromNumber}
          </label>
          <div className="rounded-2xl border border-violet-400/40 bg-gradient-to-br from-[#5B21B6]/60 to-[#3B1277]/80 p-3 shadow-[0_0_24px_rgba(91,33,182,0.45)]">
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-28 shrink-0 rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-xs text-white outline-none focus:border-[#FACC15]/70"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.dial} className="bg-[#2B0F5C] text-white">
                    {c.dial} {c.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={s.supportPhonePlaceholder}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-100/40 focus:border-[#FACC15]/70"
              />
            </div>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="mb-1 block text-[10px] font-bold tracking-[0.18em] text-[#FACC15]/80 uppercase">
            {s.supportAmount}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 focus-within:border-[#FACC15]/70">
            <span className="text-sm font-bold text-[#FACC15]">{currencyInfo.symbol}</span>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-violet-100/40"
            />
            <span className="text-xs text-violet-100/60">{currency}</span>
          </div>
        </div>

        {/* Non-reversible notice */}
        <p className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-3 py-2 text-[11px] text-rose-100/90">
          ⚠ {s.supportNonReversible}
        </p>

        {error && <p className="text-[11px] font-semibold text-rose-300">{error}</p>}

        {/* Confirm button */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-black tracking-wide text-white shadow-[0_0_24px_rgba(16,185,129,0.5)] transition hover:scale-[1.02] hover:shadow-[0_0_36px_rgba(16,185,129,0.7)] disabled:opacity-60"
        >
          <span className="relative z-10">{loading ? s.supportProcessing : s.supportConfirm}</span>
          <span className="absolute inset-0 animate-pulse bg-white/10" />
        </button>
      </div>
    </Modal>
  );
}
