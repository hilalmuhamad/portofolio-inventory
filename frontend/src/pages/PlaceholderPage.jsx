export default function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 className="mb-2 text-xl font-bold">{title}</h1>
      <p className="text-sm text-slate-500">Halaman {title} menyusul di tahap berikutnya.</p>
    </div>
  );
}
