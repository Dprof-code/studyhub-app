export default function LoadingShimmer() {
    return (
        <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-white/30 rounded-full animate-pulse"></div>
            <div className="w-4 h-4 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-4 h-4 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>
    );
}