export default function HomePage() {
  return (
    <main className="p-8 text-center">
      <h1 className="text-3xl font-bold">Welcome to Quantavo</h1>
      <p className="mt-4 text-gray-600">Upload and analyze your scRNA-seq data in the cloud.</p>
      <a href="/dashboard" className="text-blue-600 underline mt-6 block">
        Go to Dashboard →
      </a>
    </main>
  );
}


