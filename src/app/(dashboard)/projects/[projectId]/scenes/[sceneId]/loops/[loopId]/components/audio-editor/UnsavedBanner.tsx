export function UnsavedBanner() {
  return (
    <div className="bg-destructive-hover text-background text-xs px-3 h-8 flex items-center rounded-lg border border-amber-500/20 font-semibold animate-pulse">
      Ada rekaman lokal yang belum dikirim ke Cloudinary.
    </div>
  );
}
