import splashImage from '@/assets/Splash.png';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: '#78c348' }}
    >
      <img 
        src={splashImage} 
        alt="FinançasPRO" 
        className="w-full h-full object-cover"
        onLoad={() => {
          setTimeout(onComplete, 1000);
        }}
      />
    </div>
  );
}
