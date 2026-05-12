import { useMemo, useState } from "react";
import type { Ad } from "@/lib/types";

interface AddAdModalProps {
  open: boolean;
  onClose: () => void;
  availableAds: Ad[];          // ads not yet in the buyer's "active spending" list
  onPick: (ad: Ad) => void;
}

export function AddAdModal({ open, onClose, availableAds, onPick }: AddAdModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableAds;
    return availableAds.filter((a) => a.name.toLowerCase().includes(q));
  }, [availableAds, search]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-black text-[#1E293B]">إضافة إعلان للأسبوع</h2>
            <p className="text-[11px] font-bold text-[#64748B] mt-0.5">
              اختر الإعلان اللي بدأت تصرف عليه دلوقتي
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#E2E8F0]">
          <div className="relative">
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">
              search
            </span>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن اسم الإعلان..."
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pr-10 pl-3 py-2.5 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-[40px] text-[#CBD5E1] block mb-2">
                ads_click
              </span>
              <p className="text-[13px] font-bold text-[#0F172A] mb-1">
                {availableAds.length === 0
                  ? "كل الإعلانات النشطة موجودة في قائمتك"
                  : "ولا إعلان مطابق لبحثك"}
              </p>
              {availableAds.length === 0 && (
                <p className="text-[11px] text-[#64748B]">
                  لإضافة إعلانات جديدة للنظام، تواصل مع الأدمن.
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-[#F1F5F9]">
              {filtered.map((ad) => (
                <li key={ad.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(ad);
                      onClose();
                    }}
                    className="w-full p-4 text-right hover:bg-[#F8FAFC] flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-[13px] font-black text-[#1E293B] truncate w-full text-right">
                        {ad.name}
                      </span>
                      {ad.postLink && (
                        <span className="text-[10px] font-bold text-[#64748B] truncate w-full text-right">
                          {ad.postLink}
                        </span>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-[#2563EB] text-[20px] shrink-0">
                      add_circle
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <p className="text-[11px] font-bold text-[#64748B] text-center">
            {filtered.length} إعلان متاح
          </p>
        </div>
      </div>
    </div>
  );
}
