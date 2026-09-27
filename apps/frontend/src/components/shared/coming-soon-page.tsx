interface Props {
  title: string;
  note: string;
}

// Halaman placeholder untuk modul yang belum diimplementasi pada tahap ini.
// Struktur folder & routing sudah disiapkan — tinggal isi mengikuti pola Module Area.
export function ComingSoonPage({ title, note }: Props) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
      <h2 className="text-base font-semibold text-text">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-text-muted">{note}</p>
    </div>
  );
}
