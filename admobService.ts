import { AdMob, AdOptions, RewardAdOptions, BannerAdOptions, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

const USE_TEST_ADS = true;

const TEST_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917'
};

const PROD_IDS = {
  banner: 'ca-app-pub-8553313988636402/1945173772',
  interstitial: 'ca-app-pub-8553313988636402/2645620958',
  rewarded: 'ca-app-pub-8553313988636402/9525167382'
};

export const initializeAdMob = async () => {
  try {
    await AdMob.initialize({
      testingDevices: [],
      initializeForTesting: USE_TEST_ADS,
    });
    console.log('AdMob Initialized with test mode:', USE_TEST_ADS);
  } catch (error) {
    console.error('AdMob Initialization Error:', error);
  }
};

export const showBannerAd = async () => {
  const options: BannerAdOptions = {
    adId: USE_TEST_ADS ? TEST_IDS.banner : PROD_IDS.banner,
    adSize: BannerAdSize.BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 60, // Margin to avoid overlapping bottom nav
    isTesting: USE_TEST_ADS
  };

  try {
    await AdMob.showBanner(options);
  } catch (error) {
    console.error('AdMob Banner Error:', error);
  }
};

export const hideBannerAd = async () => {
  try {
    await AdMob.hideBanner();
  } catch (error) {
    console.error('AdMob Hide Banner Error:', error);
  }
};

export const showRewardAd = async (onReward: (reward: any) => void, onDismiss: () => void) => {
  console.log('Requesting Reward Ad...');
  
  // Mock implementation for Web/Preview environment
  if (typeof window !== 'undefined' && !window.hasOwnProperty('Capacitor')) {
    console.log('Running in Web/Preview mode, showing Mock Reward Ad');
    window.dispatchEvent(new CustomEvent('showMockAd', { 
      detail: { 
        type: 'rewarded',
        onReward: () => onReward({ amount: 10, type: 'coins' }),
        onDismiss
      } 
    }));
    return;
  }

  const options: RewardAdOptions = {
    adId: USE_TEST_ADS ? TEST_IDS.rewarded : PROD_IDS.rewarded,
  };

  try {
    await AdMob.prepareRewardVideoAd(options);
    console.log('Reward Ad Prepared, showing...');
    const reward = await AdMob.showRewardVideoAd();
    console.log('Reward Ad Showed, reward:', reward);
    if (reward) {
      onReward(reward);
    }
  } catch (error) {
    console.error('AdMob Reward Error:', error);
    onDismiss();
  }
};

export const showInterstitialAd = async () => {
  console.log('Requesting Interstitial Ad...');

  // Mock implementation for Web/Preview environment
  if (typeof window !== 'undefined' && !window.hasOwnProperty('Capacitor')) {
    console.log('Running in Web/Preview mode, showing Mock Interstitial Ad');
    window.dispatchEvent(new CustomEvent('showMockAd', { 
      detail: { 
        type: 'interstitial'
      } 
    }));
    return;
  }

  const options: AdOptions = {
    adId: USE_TEST_ADS ? TEST_IDS.interstitial : PROD_IDS.interstitial,
    isTesting: USE_TEST_ADS,
  };

  try {
    await AdMob.prepareInterstitial(options);
    console.log('Interstitial Ad Prepared, showing...');
    await AdMob.showInterstitial();
    console.log('Interstitial Ad Showed');
  } catch (error) {
    console.error('AdMob Interstitial Error:', error);
  }
};
