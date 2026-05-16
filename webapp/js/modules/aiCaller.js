/**
 * AI Caller — 直接 fetch() 到 Provider，流式 SSE 解析
 */

import { providerManager } from './providerManager.js';

class AICaller {
  constructor() {
    this.abortControllers = new Map();
  }

  async streamChat({ role, messages, onChunk, onDone, onError, temperature = 0.7 }) {
    const roleConfig = providerManager.getRoleConfig(role);
    const model = roleConfig.model;
    const baseUrl = roleConfig.baseUrl;
    const apiKey = roleConfig.apiKey;

    const controller = new AbortController();
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.abortControllers.set(callId, controller);

    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          stream: true
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                onChunk?.(delta, fullText);
              }

              // Track usage if available in non-streaming chunks
              if (parsed.usage) {
                inputTokens = parsed.usage.prompt_tokens || inputTokens;
                outputTokens = parsed.usage.completion_tokens || outputTokens;
              }
            } catch (e) {
              // Ignore malformed JSON in stream
            }
          }
        }
      }

      // Estimate tokens if not provided
      if (inputTokens === 0) {
        const promptText = messages.map(m => m.content).join('\n');
        inputTokens = Math.ceil(promptText.length / 4);
      }
      if (outputTokens === 0) {
        outputTokens = Math.ceil(fullText.length / 4);
      }

      const cost = providerManager.estimateCost(role, inputTokens, outputTokens);

      onDone?.({
        text: fullText,
        inputTokens,
        outputTokens,
        cost,
        model
      });

      return { text: fullText, inputTokens, outputTokens, cost };

    } catch (err) {
      if (err.name === 'AbortError') {
        onError?.(new Error('请求已取消'));
      } else {
        onError?.(err);
      }
      throw err;
    } finally {
      this.abortControllers.delete(callId);
    }
  }

  abort(callId) {
    const controller = this.abortControllers.get(callId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(callId);
    }
  }

  abortAll() {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }
}

export const aiCaller = new AICaller();
