import { useEffect, useState } from 'react';
import splashImage from '@/assets/Splash.png';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [showPig, setShowPig] = useState(false);

  useEffect(() => {
    // Start pig animation after image loads
    const pigTimer = setTimeout(() => setShowPig(true), 200);
    const completeTimer = setTimeout(onComplete, 1500);
    
    return () => {
      clearTimeout(pigTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#78c348' }}
    >
      <img 
        src={splashImage} 
        alt="FinançasPRO" 
        className="w-full h-full object-cover"
      />
      
      {/* Pig animation overlay */}
      {showPig && (
        <div className="absolute inset-0 pointer-events-none flex items-center">
          {/* Pig running towards dollar */}
          <div className="animate-pig-run flex items-center gap-2">
            {/* Green Pig with sunglasses */}
            <svg viewBox="0 0 100 80" className="w-20 h-16 drop-shadow-lg">
              {/* Body */}
              <ellipse cx="50" cy="45" rx="35" ry="28" fill="#4ade80" />
              {/* Head */}
              <circle cx="75" cy="35" r="22" fill="#4ade80" />
              {/* Snout */}
              <ellipse cx="90" cy="38" rx="10" ry="8" fill="#86efac" />
              {/* Nostrils */}
              <circle cx="87" cy="36" r="2" fill="#166534" />
              <circle cx="93" cy="36" r="2" fill="#166534" />
              {/* Ears */}
              <ellipse cx="60" cy="18" rx="8" ry="10" fill="#4ade80" />
              <ellipse cx="80" cy="15" rx="8" ry="10" fill="#4ade80" />
              <ellipse cx="60" cy="18" rx="5" ry="6" fill="#86efac" />
              <ellipse cx="80" cy="15" rx="5" ry="6" fill="#86efac" />
              {/* Sunglasses */}
              <rect x="62" y="28" width="14" height="10" rx="2" fill="#1f2937" />
              <rect x="78" y="28" width="14" height="10" rx="2" fill="#1f2937" />
              <rect x="76" y="32" width="2" height="2" fill="#1f2937" />
              <line x1="62" y1="32" x2="55" y2="28" stroke="#1f2937" strokeWidth="2" />
              {/* Smile */}
              <path d="M 82 46 Q 88 52 94 46" stroke="#166534" strokeWidth="2" fill="none" strokeLinecap="round" />
              {/* Legs */}
              <rect x="25" y="65" width="8" height="12" rx="3" fill="#4ade80" />
              <rect x="40" y="65" width="8" height="12" rx="3" fill="#4ade80" />
              <rect x="55" y="65" width="8" height="12" rx="3" fill="#4ade80" />
              <rect x="70" y="65" width="8" height="12" rx="3" fill="#4ade80" />
              {/* Tail */}
              <path d="M 15 40 Q 5 35 8 45 Q 12 55 5 50" stroke="#4ade80" strokeWidth="4" fill="none" strokeLinecap="round" />
            </svg>
          </div>
          
          {/* Dollar sign at the end */}
          <div className="absolute right-8 text-5xl font-bold text-yellow-400 drop-shadow-lg animate-pulse">
            $
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes pig-run {
          0% {
            transform: translateX(-100px);
          }
          100% {
            transform: translateX(calc(100vw - 120px));
          }
        }
        
        .animate-pig-run {
          animation: pig-run 1s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}