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
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Stacks of money at the end */}
          <div className="absolute right-6 flex flex-col items-center gap-1">
            {/* Money stack 1 */}
            <div className="flex flex-col -space-y-1">
              <div className="w-14 h-6 bg-gradient-to-r from-green-600 to-green-500 rounded-sm border border-green-700 flex items-center justify-center shadow-md">
                <span className="text-green-900 text-xs font-bold">$100</span>
              </div>
              <div className="w-14 h-6 bg-gradient-to-r from-green-500 to-green-400 rounded-sm border border-green-600 flex items-center justify-center shadow-md">
                <span className="text-green-800 text-xs font-bold">$100</span>
              </div>
              <div className="w-14 h-6 bg-gradient-to-r from-green-600 to-green-500 rounded-sm border border-green-700 flex items-center justify-center shadow-md">
                <span className="text-green-900 text-xs font-bold">$100</span>
              </div>
            </div>
            {/* Money stack 2 */}
            <div className="flex flex-col -space-y-1">
              <div className="w-14 h-6 bg-gradient-to-r from-green-500 to-green-400 rounded-sm border border-green-600 flex items-center justify-center shadow-md">
                <span className="text-green-800 text-xs font-bold">$100</span>
              </div>
              <div className="w-14 h-6 bg-gradient-to-r from-green-600 to-green-500 rounded-sm border border-green-700 flex items-center justify-center shadow-md">
                <span className="text-green-900 text-xs font-bold">$100</span>
              </div>
              <div className="w-14 h-6 bg-gradient-to-r from-green-500 to-green-400 rounded-sm border border-green-600 flex items-center justify-center shadow-md">
                <span className="text-green-800 text-xs font-bold">$100</span>
              </div>
            </div>
            {/* Flying $ symbols */}
            <div className="absolute -top-4 text-yellow-400 text-2xl font-bold animate-bounce">$</div>
            <div className="absolute -top-2 -left-3 text-yellow-300 text-lg font-bold animate-pulse">$</div>
            <div className="absolute -top-2 -right-3 text-yellow-300 text-lg font-bold animate-pulse delay-100">$</div>
          </div>
          
          {/* Pig running towards vault */}
          <div className="animate-pig-run flex items-center">
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
        </div>
      )}
      
      <style>{`
        @keyframes pig-run {
          0% {
            transform: translateX(-100px);
          }
          100% {
            transform: translateX(calc(50vw - 40px));
          }
        }
        
        .animate-pig-run {
          animation: pig-run 1s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}