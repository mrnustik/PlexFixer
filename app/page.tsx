import LibraryBrowser from "@/components/library-browser";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">PlexFixer</h1>
        <p className="text-sm text-gray-500">Media library naming validator</p>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <LibraryBrowser />
      </main>
    </div>
  );
}
