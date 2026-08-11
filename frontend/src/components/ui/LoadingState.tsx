type LoadingStateProps = {
  rows?: number;
};

export function LoadingState({ rows = 5 }: LoadingStateProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-md border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
}
