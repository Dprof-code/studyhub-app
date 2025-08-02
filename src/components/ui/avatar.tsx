export function Avatar({
    size = 'md',
    src,
    alt,
    className = '',
}: {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
    src: string;
    alt: string;
    className?: string;
}) {
    const sizeClasses = {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-32 w-32',
        xxl: 'h-40 w-40',
    };

    return (
        <div className={`relative ${sizeClasses[size]} ${className}`}>
            <img
                src={src}
                alt={alt}
                className="rounded-full object-cover"
            />
        </div>
    );
}