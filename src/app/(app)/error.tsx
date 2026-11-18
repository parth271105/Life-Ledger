"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mt-10 text-center">
      <h1 className="text-2xl font-semibold">That didn't load</h1>
      <p className="mt-2 text-muted">It's usually the connection. Your data is safe.</p>
      <button className="btn btn-primary mt-5 w-full" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
