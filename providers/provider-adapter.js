/**
 * @file provider-adapter.js
 * @description Multi-provider abstraction layer for the AI Council Server.
 * Supports hierarchical context management and token budget enforcement.
 */

const fs = require('fs');
const path = require('path');

class ContextManager {
  /**
   * Truncates messages to fit within a specific token/character budget.
   * Note: For simplicity in this lightweight implementation, we use character count as a proxy for tokens.
   * @param {Array} messages - Array of message objects {role, content}
   * @param {number} maxChars - Maximum allowed characters
   * @returns {Array} Truncated messages
   */
  static truncate(messages, maxChars) {
    let totalChars = 0;
    const truncatedMessages = [];

    // Process from newest to oldest to preserve most recent context
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgSize = msg.content.length + msg.role.length;
      if (totalChars + msgSize <= maxChars) {
        truncatedMessages.unshift(msg);
        totalChars += msgSize;
      } else {
        break;
      }
    }
    return truncatedMessages;
  }

  /**
   * Summarizes messages if they exceed the budget.
   * @param {Array} messages 
   * @param {number} maxChars 
   * @returns {Array} A single summary message if truncation was needed.
   */
  static summarize(messages, maxChars) {
    if (this.countChars(messages) <= maxChars) return messages;
    
    return [{
      role: 'system',
      content: `[Summary of previous conversation context truncated to fit budget of ${maxChars} chars]`
    }];
  }

  static countChars(messages) {
    return messages.reduce((sum, m) => sum + m.content.length + m.role.length, 0);
  }
}

class ProviderManager {
  constructor() {
    this.providers = new Map();
  }

  /**
   * @param {string} name - Unique provider name (e.g., 'lmstudio')
   * @param {Object} config - Configuration object {baseUrl, apiKey, models: []}
   */
  registerProvider(name, config) {
    this.providers.set(name, config);
  }

  async call(providerName, messages, model, maxTokens = 3072) {
    const config = this.providers.get(providerName);
    if (!config) throw new Error(`Provider ${providerName} not registered.`);

    // Find the specific budget for the requested model if defined in config
    // Otherwise use a safe default based on common LM Studio profiles
    let maxChars = 20000; // Default safety limit (approx 5k tokens)
    if (model.includes('35b')) maxChars = 100000;
    else if (model.includes('9b') || model.includes('26b')) maxChars = 24000;
    else if (model.includes('0.8b')) maxChars = 6000;

    const processedMessages = ContextManager.truncate(messages, maxChars);

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : ''
        },
        body: JSON.stringify({
          model: model,
          messages: processedMessages,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Provider ${providerName} error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return {
        status: 'success',
        content: data.choices[0].message.content,
        usage: data.usage
      };
    } catch (error) {
      console.error(`[ProviderManager] Call to ${providerName} failed:`, error.message);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  listProviders() {
    return Array.from(this.providers.keys());
  }

  getModels(providerName) {
    const config = this.providers.get(providerName);
    return config ? config.models : [];
  }
}

module.exports = { ProviderManager, ContextManager };
