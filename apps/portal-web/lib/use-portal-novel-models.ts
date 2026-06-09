"use client";

import { useCallback, useEffect, useState } from "react";

import {
  INKOS_SELECTED_MODEL_STORAGE_KEY,
  PORTAL_MODEL_CONFIG_CHANGED_EVENT,
  PORTAL_MODEL_STORAGE_KEY,
  describeNovelLlmSetupGap,
  listNovelLlmOptions,
  loadPortalModelConfig,
  loadSelectedNovelModelId,
  saveSelectedNovelModelId,
  type NovelLlmOption
} from "@/lib/portal-model-config";

export function usePortalNovelModels() {
  const [options, setOptions] = useState<NovelLlmOption[]>([]);
  const [setupGap, setSetupGap] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const refresh = useCallback(() => {
    const config = loadPortalModelConfig();
    const nextOptions = listNovelLlmOptions(config);
    setSetupGap(describeNovelLlmSetupGap(config));
    setOptions(nextOptions);
    const storedId = loadSelectedNovelModelId();
    const resolvedId =
      nextOptions.find((option) => option.id === storedId)?.id ?? nextOptions[0]?.id ?? "";
    setSelectedId(resolvedId);
    if (resolvedId) saveSelectedNovelModelId(resolvedId);
  }, []);

  useEffect(() => {
    refresh();
    function handleStorage(event: StorageEvent) {
      if (event.key === PORTAL_MODEL_STORAGE_KEY || event.key === INKOS_SELECTED_MODEL_STORAGE_KEY) {
        refresh();
      }
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refresh);
    window.addEventListener(PORTAL_MODEL_CONFIG_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(PORTAL_MODEL_CONFIG_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  const selected = options.find((option) => option.id === selectedId) ?? options[0];

  function selectOption(option: NovelLlmOption) {
    setSelectedId(option.id);
    saveSelectedNovelModelId(option.id);
  }

  return { options, selected, selectedId, setupGap, selectOption, refresh };
}
