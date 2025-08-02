interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: string;
}

export function Textarea({ error, className = '', ...props }: TextareaProps) {
    return (
        <div>
            <textarea
                className={`
          w-full rounded-lg border border-border bg-background px-3 py-2
          focus:outline-none focus:ring-2 focus:ring-primary/20
          ${error ? 'border-destructive' : 'hover:border-primary/50'}
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