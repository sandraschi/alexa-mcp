import { create } from "zustand";
import { API_BASE } from "@/lib/api";

interface LLMProvider {
  name: string;
  detected: boolean;
  url?: string;
}

interface LLMState {
  providers: LLMProvider[];
  selectedProvider: string;
  selectedModel: string;
  availableModels: string[];
  status: "probing" | "detected" | "not_found";
  probing: boolean;
  probe: () => Promise<void>;
  setProvider: (name: string) => void;
  setModel: (model: string) => void;
}

export const useLLMStore = create<LLMState>((set, get) => ({
  providers: [],
  selectedProvider: localStorage.getItem("llm_provider") || "",
  selectedModel: localStorage.getItem("llm_model") || "",
  availableModels: [],
  status: "probing",
  probing: false,

  probe: async () => {
    set({ probing: true });
    try {
      const r = await fetch(`${API_BASE}/api/llm/discover`);
      const data = await r.json();
      const detected = (data.providers || []).filter((p: LLMProvider) => p.detected);
      set({ providers: detected, status: detected.length > 0 ? "detected" : "not_found", probing: false });

      const savedP = localStorage.getItem("llm_provider") || "";
      const provider = detected.find((p: LLMProvider) => p.name === savedP) || detected[0];
      if (provider) {
        set({ selectedProvider: provider.name });
        localStorage.setItem("llm_provider", provider.name);
        get().fetchModels(provider.name);
      }
    } catch {
      set({ status: "not_found", probing: false });
    }
  },

  fetchModels: async (provider: string) => {
    try {
      const base = provider === "ollama" ? "http://127.0.0.1:11434" : "http://127.0.0.1:1234";
      const url = provider === "ollama" ? `${base}/api/tags` : `${base}/v1/models`;
      const r = await fetch(url);
      const data = await r.json();
      const models = provider === "ollama"
        ? (data.models || []).map((m: { name: string }) => m.name)
        : (data.data || []).map((m: { id: string }) => m.id);
      set({ availableModels: models });
      const savedM = localStorage.getItem("llm_model") || "";
      if (savedM && models.includes(savedM)) {
        set({ selectedModel: savedM });
      } else if (models.length > 0) {
        set({ selectedModel: models[0] });
        localStorage.setItem("llm_model", models[0]);
      }
    } catch {
      set({ availableModels: [] });
    }
  },

  setProvider: (name: string) => {
    set({ selectedProvider: name, selectedModel: "" });
    localStorage.setItem("llm_provider", name);
    get().fetchModels(name);
  },

  setModel: (model: string) => {
    set({ selectedModel: model });
    localStorage.setItem("llm_model", model);
  },
}));
