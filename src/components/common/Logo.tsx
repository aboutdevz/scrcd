import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const dimensions = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  }[size];

  return (
    <div className={`relative flex items-center justify-center flex-shrink-0 ${dimensions} ${className}`}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          <linearGradient id="scrcd-grad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3b82f6" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="scrcd-accent" x1="16" y1="12" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f59e0b" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Outer Rounded Container / Document Backplate */}
        <rect
          x="2"
          y="2"
          width="28"
          height="28"
          rx="7"
          fill="url(#scrcd-grad)"
        />

        {/* Inner subtle guide lines */}
        <path
          d="M8 8H18"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 12H14"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Camera / Capture Target Aperture Lens */}
        <circle
          cx="19"
          cy="19"
          r="6.5"
          fill="#0f172a"
          stroke="#ffffff"
          strokeWidth="2"
        />

        {/* Recording Indicator Dot in Center of Aperture */}
        <circle
          cx="19"
          cy="19"
          r="3"
          fill="url(#scrcd-accent)"
        />
      </svg>
    </div>
  );
};
