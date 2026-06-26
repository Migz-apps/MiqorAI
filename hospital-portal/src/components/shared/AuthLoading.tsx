export function AuthLoading({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-grey text-text-secondary text-sm">
      {message}
    </div>
  );
}
