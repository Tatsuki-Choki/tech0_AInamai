
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-6 w-6 border-2',
  md: 'h-10 w-10 border-3',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({ size = 'md', text, fullScreen = false }: LoadingSpinnerProps) {
  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${fullScreen ? '' : 'py-8'}`}>
      <div
        className={`animate-spin rounded-full border-b-[#59168b] border-t-transparent border-l-transparent border-r-transparent ${sizeClasses[size]}`}
        style={{ borderStyle: 'solid' }}
      />
      {text && <p className="text-[14px] text-[#59168b] animate-pulse">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="bg-[#fef8f5] min-h-screen flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

interface LoadingOverlayProps {
  text?: string;
}

export function LoadingOverlay({ text = '読み込み中...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-[24px] p-8 shadow-xl flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-purple-100" />
          <div className="absolute top-0 h-16 w-16 rounded-full border-4 border-t-[#59168b] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        <p className="text-[16px] text-[#59168b] font-medium">{text}</p>
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`}
      style={{ animation: 'shimmer 1.5s infinite' }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-[24px] border border-[rgba(243,232,255,0.5)] p-6">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// CSS for shimmer animation (add to index.css or use styled-components)
const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

// Inject keyframes into document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerKeyframes;
  document.head.appendChild(style);
}
