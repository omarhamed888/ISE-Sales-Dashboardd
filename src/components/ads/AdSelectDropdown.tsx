import { useRef, useState, useEffect } from "react";
import { useActiveAds } from "@/lib/hooks/useAds";

interface Props {
  value: string;
  adId?: string;
  onChange: (name: string, id?: string) => void;
  placeholder?: string;
  className?: string;
}

export function AdSelectDropdown({ value, onChange, placeholder = "اختر إعلان أو اكتب...", className = "" }: Props) {
  const { ads, loading } = useActiveAds();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep local text in sync when value changes externally
  useEffect(() => { setQuery(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const filtered = query.trim()
    ? ads.filter(a => a.name.includes(query) || a.name.toLowerCase().includes(query.toLowerCase()))
    : ads;

  function handleSelect(name: string, id: string) {
    setQuery(name);
    onChange(name, id);
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    onChange(v, undefined); // free-text — no adId
    setOpen(true);
  }

  function handleBlur() {
    // small delay so click on option fires first
    setTimeout(() => setOpen(false), 150);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={loading}
          className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none pr-8"
          dir="rtl"
        />
        <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-[#94A3B8] pointer-events-none">
          arrow_drop_down
        </span>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#E2E8F0] rounded-xl shadow-lg max-h-48 overflow-y-auto" dir="rtl">
          {loading && (
            <div className="px-3 py-3 text-[12px] text-[#94A3B8] font-bold text-center">
              جاري تحميل الإعلانات...
            </div>
          )}
          {!loading && ads.length === 0 && (
            <div className="px-3 py-3 text-[12px] text-[#94A3B8] font-bold text-center">
              لا توجد إعلانات نشطة
            </div>
          )}
          {!loading && filtered.length === 0 && ads.length > 0 && (
            <button
              type="button"
              onMouseDown={() => { onChange(query, undefined); setOpen(false); }}
              className="w-full text-right px-3 py-2.5 text-[12px] font-bold text-[#64748B] hover:bg-[#F7F9FC] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[14px] text-[#94A3B8]">add</span>
              استخدام "{query}" كاسم مخصص
            </button>
          )}
          {filtered.map(ad => (
            <button
              key={ad.id}
              type="button"
              onMouseDown={() => handleSelect(ad.name, ad.id)}
              className="w-full text-right px-3 py-2.5 text-[13px] font-bold text-[#1E293B] hover:bg-[#EFF6FF] hover:text-[#2563EB] flex items-center gap-2 border-b border-[#F1F5F9] last:border-0"
            >
              <span className="material-symbols-outlined text-[14px] text-[#94A3B8]">campaign</span>
              <span className="flex-1 truncate">{ad.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
