package com.carlos.controledefinancas;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.widget.FrameLayout;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.share.SharePlugin;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.appopen.AppOpenAd;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.LoadAdError;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "AdMob";
    
    // IDs de Teste
    private static final String BANNER_ID = "ca-app-pub-3940256099942544/6300978111";
    private static final String APP_OPEN_ID = "ca-app-pub-3940256099942544/9257395921";
    private static final String INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";
    
    private AdView adView;
    private AppOpenAd appOpenAd;
    private InterstitialAd mInterstitialAd;
    private Handler adHandler;
    
    private boolean isFirstLaunch = true;
    private boolean isAppOpenLoading = false;
    private boolean isInterstitialLoading = false;
    private boolean isInterstitialLoopStarted = false;
    private boolean splashFinished = false;
    private boolean adReadyToShow = false;
    
    private static final long AD_INTERVAL = 8 * 60 * 1000; // 8 minutos
    private static final long SPLASH_MIN_TIME = 2500; // 2.5s
    private static final long AD_EXTRA_DELAY = 100; // +0.1s após splash

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        registerPlugin(SharePlugin.class);
        Log.d(TAG, "onCreate iniciado");
        
        adHandler = new Handler(Looper.getMainLooper());

        MobileAds.initialize(this, initializationStatus -> {
            Log.d(TAG, "MobileAds inicializado");
        });

        // ✅ ALTERADO: Agora adiciona banner no container específico, não no root
        createBanner();
        loadAppOpenAd();
        loadInterstitial();
        
        adHandler.postDelayed(() -> {
            splashFinished = true;
            Log.d(TAG, "Splash terminado, adReadyToShow=" + adReadyToShow);
            
            if (adReadyToShow && isFirstLaunch) {
                adHandler.postDelayed(() -> {
                    if (isFirstLaunch) {
                        showAppOpenAd();
                    }
                }, AD_EXTRA_DELAY);
            } else if (isFirstLaunch) {
                startInterstitialLoopIfNeeded();
            }
        }, SPLASH_MIN_TIME);
    }

    /**
     * ✅ ALTERADO: Banner agora é adicionado no FrameLayout específico (ad_container)
     * em vez de ser adicionado diretamente no root, evitando sobreposição do WebView
     */
    private void createBanner() {
        Log.d(TAG, "Criando banner...");
        
        adView = new AdView(this);
        adView.setAdSize(AdSize.BANNER);
        adView.setAdUnitId(BANNER_ID);

        AdRequest adRequest = new AdRequest.Builder().build();
        adView.loadAd(adRequest);

        // ✅ ALTERADO: Busca o container específico do layout em vez do root
        FrameLayout adContainer = findViewById(R.id.ad_container);
        
        if (adContainer != null) {
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );
            params.gravity = Gravity.CENTER; // Centralizado no container
            
            adContainer.addView(adView, params);
            Log.d(TAG, "Banner adicionado ao ad_container");
        } else {
            // Fallback: adiciona no root se não encontrar o container (para compatibilidade)
            Log.w(TAG, "ad_container não encontrado, usando root como fallback");
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );
            params.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
            
            FrameLayout rootLayout = findViewById(android.R.id.content);
            if (rootLayout != null) {
                rootLayout.addView(adView, params);
            }
        }
    }

    private void loadAppOpenAd() {
        if (isAppOpenLoading || appOpenAd != null) {
            return;
        }
        
        isAppOpenLoading = true;
        Log.d(TAG, "Carregando App Open Ad...");

        AppOpenAd.load(this, APP_OPEN_ID, new AdRequest.Builder().build(),
                new AppOpenAd.AppOpenAdLoadCallback() {
                    @Override
                    public void onAdLoaded(AppOpenAd ad) {
                        appOpenAd = ad;
                        isAppOpenLoading = false;
                        adReadyToShow = true;
                        Log.d(TAG, "App Open Ad carregado, splashFinished=" + splashFinished);
                        
                        if (splashFinished && isFirstLaunch) {
                            adHandler.postDelayed(() -> {
                                if (isFirstLaunch) {
                                    showAppOpenAd();
                                }
                            }, AD_EXTRA_DELAY);
                        }
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError loadAdError) {
                        Log.e(TAG, "Falha App Open: " + loadAdError.getMessage());
                        isAppOpenLoading = false;
                        adReadyToShow = false;
                    }
                });
    }

    private void showAppOpenAd() {
        if (appOpenAd != null && isFirstLaunch) {
            Log.d(TAG, "Mostrando App Open Ad");
            
            appOpenAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override
                public void onAdDismissedFullScreenContent() {
                    Log.d(TAG, "App Open Ad fechado");
                    appOpenAd = null;
                    isFirstLaunch = false;
                    loadAppOpenAd();
                    startInterstitialLoopIfNeeded();
                }

                @Override
                public void onAdFailedToShowFullScreenContent(AdError adError) {
                    Log.e(TAG, "Falha ao mostrar App Open: " + adError.getMessage());
                    appOpenAd = null;
                    isFirstLaunch = false;
                    startInterstitialLoopIfNeeded();
                }

                @Override
                public void onAdShowedFullScreenContent() {
                    Log.d(TAG, "App Open Ad mostrado");
                }
            });
            
            appOpenAd.show(this);
        } else {
            Log.d(TAG, "App Open Ad não pode ser mostrado");
            isFirstLaunch = false;
        }
    }

    private void startInterstitialLoopIfNeeded() {
        if (!isInterstitialLoopStarted) {
            Log.d(TAG, "Iniciando loop do Interstitial (8 minutos)");
            isInterstitialLoopStarted = true;
            
            adHandler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    showInterstitial();
                    adHandler.postDelayed(this, AD_INTERVAL);
                }
            }, AD_INTERVAL);
        }
    }

    private void loadInterstitial() {
        if (isInterstitialLoading || mInterstitialAd != null) {
            return;
        }
        
        isInterstitialLoading = true;
        Log.d(TAG, "Carregando Interstitial...");

        InterstitialAd.load(this, INTERSTITIAL_ID, new AdRequest.Builder().build(),
                new InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(InterstitialAd interstitialAd) {
                        mInterstitialAd = interstitialAd;
                        isInterstitialLoading = false;
                        Log.d(TAG, "Interstitial carregado");
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError loadAdError) {
                        Log.e(TAG, "Falha Interstitial: " + loadAdError.getMessage());
                        isInterstitialLoading = false;
                        adHandler.postDelayed(() -> loadInterstitial(), 10000);
                    }
                });
    }

    private void showInterstitial() {
        if (mInterstitialAd != null) {
            Log.d(TAG, "Mostrando Interstitial");
            mInterstitialAd.show(this);
            mInterstitialAd = null;
            loadInterstitial();
        } else {
            Log.d(TAG, "Interstitial não pronto, carregando...");
            loadInterstitial();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        
        if (!isFirstLaunch && appOpenAd != null) {
            showAppOpenAd();
            loadAppOpenAd();
        }
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy");
        if (adView != null) {
            adView.destroy();
        }
        if (adHandler != null) {
            adHandler.removeCallbacksAndMessages(null);
        }
        super.onDestroy();
    }
}