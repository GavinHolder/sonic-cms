"use client";

import { useState, useEffect, useCallback } from "react";
import { getCMSSettings, saveCMSSettings } from "@/lib/cms-settings";

/** Reads the showHelpTips setting from CMS settings (localStorage). */
export function useHelpText(): { showHelp: boolean; toggleHelp: () => void } {
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    setShowHelp(getCMSSettings().showHelpTips);
  }, []);

  const toggleHelp = useCallback(() => {
    const settings = getCMSSettings();
    const next = !settings.showHelpTips;
    saveCMSSettings({ ...settings, showHelpTips: next });
    setShowHelp(next);
  }, []);

  return { showHelp, toggleHelp };
}
