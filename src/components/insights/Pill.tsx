export function Pill({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full">
      {label}: {value}
    </span>
  );
}
