/**
 * CMS Settings Store
 *
 * Manages user preferences for the CMS dashboard behavior.
 * Settings are stored in localStorage and persist across sessions.
 */

const SETTINGS_KEY = "cms_settings";

export interface CMSSettings {
  // UI Preferences
  showInfoBanners: boolean;
  showHelpTips: boolean;
  compactView: boolean;

  // Editor Preferences
  autoSaveEnabled: boolean;
  autoSaveIntervalMs: number;
  confirmBeforeDelete: boolean;

  // Preview Preferences
  previewInNewTab: boolean;

  // Scroll Behavior
  scrollSnapEnabled: boolean; // Enable/disable CSS section snapping globally
  scrollSnapMode: "mandatory" | "proximity"; // CSS scroll-snap-type mode
  scrollSnapThreshold: number; // Legacy: kept for backwards compatibility

  // Dismissed banners (by ID)
  dismissedBanners: string[];
}

const defaultSettings: CMSSettings = {
  showInfoBanners: true,
  showHelpTips: true,
  compactView: false,
  autoSaveEnabled: false,
  autoSaveIntervalMs: 30000,
  confirmBeforeDelete: true,
  previewInNewTab: true,
  scrollSnapEnabled: true, // Enable section snapping by default
  scrollSnapMode: "mandatory", // CSS scroll-snap-type mode (mandatory or proximity)
  scrollSnapThreshold: 40, // Legacy: kept for backwards compatibility
  dismissedBanners: [],
};

/**
 * Get all CMS settings
 */
export function getCMSSettings(): CMSSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Error reading CMS settings:", error);
  }

  return defaultSettings;
}

/**
 * Save CMS settings
 */
export function saveCMSSettings(settings: Partial<CMSSettings>): CMSSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const current = getCMSSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Error saving CMS settings:", error);
    return getCMSSettings();
  }
}

/**
 * Reset CMS settings to defaults
 */
export function resetCMSSettings(): CMSSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
  } catch (error) {
    console.error("Error resetting CMS settings:", error);
  }

  return defaultSettings;
}

/**
 * Dismiss a specific banner
 */
export function dismissBanner(bannerId: string): void {
  const settings = getCMSSettings();
  if (!settings.dismissedBanners.includes(bannerId)) {
    saveCMSSettings({
      dismissedBanners: [...settings.dismissedBanners, bannerId],
    });
  }
}

/**
 * Check if a banner is dismissed
 */
export function isBannerDismissed(bannerId: string): boolean {
  const settings = getCMSSettings();
  return settings.dismissedBanners.includes(bannerId);
}

/**
 * Restore all dismissed banners
 */
export function restoreAllBanners(): void {
  saveCMSSettings({ dismissedBanners: [] });
}

export { defaultSettings };
