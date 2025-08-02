interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  prefix?: string;
}

export function Input({ error, prefix, className = '', ...props }: InputProps) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {prefix}
        </span>
      )}
      <input
        className={`
          w-full rounded-lg border border-border bg-background px-3 py-2
          focus:outline-none focus:ring-2 focus:ring-primary/20
          ${error ? 'border-destructive' : 'hover:border-primary/50'}
          ${prefix ? 'pl-7' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}