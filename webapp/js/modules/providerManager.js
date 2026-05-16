/**
 * Provider Manager — LLM Provider 配置、连通测试、模型列表、分角色绑定、成本追踪
 */

import { getPricing } from '../data/pricingTable.js';

const PRESETS = {
  aihubmix: {
    name: 'AIHubMix',
    baseUrl: 'https://api.aihubmix.com/v1',
    defaultModel: 'gemini-3-pro'
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o'
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-6'
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat'
  },
  tongyi: {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-max'
  },
  custom: {
    name: '自定义',
    baseUrl: '',
    defaultModel: ''
  }
};

const ROLE_ICONS = {
  brief: 'blue',
  visual: 'purple',
  build: 'amber',
  review: 'rose',
  interviewer: 'emerald'
};

class ProviderManager {
  constructor() {
    this.config = this.loadConfig();
    this.models = [];
    this.filteredModels = [];
    this.connectionState = 'unknown'; // unknown, testing, online, offline
    this.listeners = [];
  }

  loadConfig() {
    const defaults = {
      preset: 'aihubmix',
      baseUrl: PRESETS.aihubmix.baseUrl,
      apiKey: '',
      defaultModel: PRESETS.aihubmix.defaultModel,
      roleModels: {
        brief: '',
        visual: '',
        build: '',
        review: '',
        interviewer: ''
      },
      providerPool: [],
      roleBindings: {
        brief: null,
        visual: null,
        build: null,
        review: null,
        interviewer: null
      }
    };

    const saved = localStorage.getItem('deck_provider_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure new fields exist in old configs
        return {
          ...defaults,
          ...parsed,
          roleModels: { ...defaults.roleModels, ...parsed.roleModels },
          providerPool: parsed.providerPool || defaults.providerPool,
          roleBindings: { ...defaults.roleBindings, ...parsed.roleBindings }
        };
      } catch (e) {
        console.warn('Failed to parse provider config:', e);
      }
    }
    return defaults;
  }

  saveConfig() {
    localStorage.setItem('deck_provider_config', JSON.stringify(this.config));
    this.emit('config:changed', this.config);
  }

  on(event, handler) {
    this.listeners.push({ event, handler });
  }

  emit(event, data) {
    this.listeners.filter(l => l.event === event).forEach(l => l.handler(data));
  }

  setPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    this.config.preset = presetKey;
    this.config.baseUrl = preset.baseUrl;
    if (presetKey !== 'custom') {
      this.config.defaultModel = preset.defaultModel;
    }
    this.saveConfig();
    this.emit('preset:changed', presetKey);
  }

  setBaseUrl(url) {
    this.config.baseUrl = url;
    this.saveConfig();
  }

  setApiKey(key) {
    this.config.apiKey = key;
    this.saveConfig();
  }

  setRoleModel(role, model) {
    this.config.roleModels[role] = model;
    this.saveConfig();
  }

  getModelForRole(role) {
    return this.config.roleModels[role] || this.config.defaultModel;
  }

  getRoleConfig(role) {
    const binding = this.config.roleBindings[role];
    if (binding && binding.providerName) {
      const provider = this.config.providerPool.find(p => p.name === binding.providerName);
      if (provider) {
        return {
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: binding.model || PRESETS[provider.preset]?.defaultModel || this.config.defaultModel,
          preset: provider.preset
        };
      }
    }
    return {
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      model: this.config.roleModels[role] || this.config.defaultModel,
      preset: this.config.preset
    };
  }

  addProviderToPool(name, preset, baseUrl, apiKey) {
    const existing = this.config.providerPool.findIndex(p => p.name === name);
    if (existing >= 0) {
      this.config.providerPool[existing] = { name, preset, baseUrl, apiKey };
    } else {
      this.config.providerPool.push({ name, preset, baseUrl, apiKey });
    }
    this.saveConfig();
    this.emit('pool:changed', this.config.providerPool);
  }

  removeProviderFromPool(name) {
    this.config.providerPool = this.config.providerPool.filter(p => p.name !== name);
    Object.keys(this.config.roleBindings).forEach(role => {
      const binding = this.config.roleBindings[role];
      if (binding && binding.providerName === name) {
        this.config.roleBindings[role] = null;
      }
    });
    this.saveConfig();
    this.emit('pool:changed', this.config.providerPool);
  }

  setRoleBinding(role, providerName, model) {
    if (!providerName || providerName === '__global__') {
      this.config.roleBindings[role] = null;
    } else {
      this.config.roleBindings[role] = { providerName, model: model || '' };
    }
    this.saveConfig();
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  _getHeadersForKey(apiKey) {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    return headers;
  }

  async testConnection() {
    return this.testConnectionWithConfig(this.config.baseUrl, this.config.apiKey);
  }

  async testConnectionWithConfig(baseUrl, apiKey) {
    this.connectionState = 'testing';
    this.emit('connection:testing');

    const headers = this._getHeadersForKey(apiKey);

    try {
      // Try /models first
      const modelsRes = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers
      });

      if (modelsRes.ok) {
        this.connectionState = 'online';
        this.emit('connection:online');
        return { success: true, method: 'models' };
      }

      // Fallback: try a minimal chat completion
      const chatRes = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1
        })
      });

      if (chatRes.ok || chatRes.status === 400) {
        this.connectionState = 'online';
        this.emit('connection:online');
        return { success: true, method: 'chat' };
      }

      // Try to get a meaningful error
      let errorText = '';
      try {
        errorText = await chatRes.text();
      } catch (e) {}
      throw new Error(`HTTP ${chatRes.status}${errorText ? ': ' + errorText.substring(0, 100) : ''}`);
    } catch (err) {
      this.connectionState = 'offline';
      this.emit('connection:offline', err.message);
      return { success: false, error: err.message };
    }
  }

  async refreshModels() {
    return this.refreshModelsForConfig(this.config.baseUrl, this.config.apiKey);
  }

  async refreshModelsForConfig(baseUrl, apiKey) {
    const headers = this._getHeadersForKey(apiKey);

    try {
      const res = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers
      });

      if (res.ok) {
        const data = await res.json();
        return (data.data || []).map(m => ({
          id: m.id,
          name: m.id,
          ...m
        }));
      }
    } catch (e) {
      // /models not available, will try fallback below
    }

    // Fallback: try chat completion to verify provider works
    try {
      const chatRes = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1
        })
      });

      if (chatRes.ok || chatRes.status === 400) {
        // Provider works but doesn't support /models — return a placeholder
        return [{ id: 'default', name: '默认模型 (models端点不可用)' }];
      }
    } catch (e) {}

    return [];
  }

  filterModels(keyword) {
    if (!keyword) {
      this.filteredModels = [...this.models];
    } else {
      const lower = keyword.toLowerCase();
      this.filteredModels = this.models.filter(m =>
        m.id.toLowerCase().includes(lower) ||
        (m.name && m.name.toLowerCase().includes(lower))
      );
    }
    this.emit('models:filtered', this.filteredModels);
    return this.filteredModels;
  }

  estimateCost(role, inputTokens, outputTokens) {
    const model = this.getModelForRole(role);
    const pricing = getPricing(model);
    const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
    return Math.round(cost * 10000) / 10000;
  }

  getPricingInfo() {
    const model = this.config.defaultModel;
    return getPricing(model);
  }

  exportConfig() {
    return { ...this.config };
  }

  importConfig(config) {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }
}

export const providerManager = new ProviderManager();
export { PRESETS, ROLE_ICONS };
