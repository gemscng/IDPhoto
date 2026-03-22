export default function UploadLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-muted animate-pulse" />
            <div className="w-20 h-5 rounded bg-muted animate-pulse" />
          </div>
          <div className="w-24 h-8 rounded bg-muted animate-pulse" />
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="text-center mb-10">
            <div className="h-9 w-64 mx-auto rounded bg-muted animate-pulse" />
            <div className="h-5 w-80 mx-auto mt-3 rounded bg-muted animate-pulse" />
          </div>
          <div className="rounded-xl border-2 border-dashed border-muted p-16 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
            <div className="h-5 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-56 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}
