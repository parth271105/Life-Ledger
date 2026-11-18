import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-sm px-5 pt-24 text-center">
      <h1 className="text-2xl font-semibold">Nothing here</h1>
      <Link href="/" className="btn btn-primary mt-6 w-full">
        Back to Today
      </Link>
    </main>
  );
}
