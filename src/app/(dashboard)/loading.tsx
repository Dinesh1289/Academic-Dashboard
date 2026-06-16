export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="h-4 bg-slate-100 rounded w-64 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-5 h-28 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
