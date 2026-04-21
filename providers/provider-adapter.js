/**
 * @file provider-adapter.js
 * @description Multi-provider abstraction layer for the AI Council Server.
 * Supports hierarchical context management and token budget enforcement.
 * Uses Node.js http.request (not fetch) for compatibility.
 */

const http = require('http');

class ContextManager {
  /**
   * Truncates messages to fit within a specific token/character budget.
   * @param {Array} messages - Array of message objects {role, content}
   * @param {number} maxChars - Maximum allowed characters
   * @returns {Array} Truncated messages
   */
  static truncate(messages, maxChars) {
    let totalChars = 0;
    const truncatedMessages = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgSize = (msg.content?.length || 0) + (msg.role?.length || 0);
      if (totalChars + msgSize <= maxChars) {
        truncatedMessages.unshift(msg);
        totalChars += msgSize;
      } else {
        break;
      }
    }
    return truncatedMessages.length > 0 ? truncatedMessages : [messages[messages.length - 1]];
  }

  static countChars(messages) {
    return messages.reduce((sum, m) => sum + (m.content?.length || 0) + (m.role?.length || 0), 0);
  }
}

class ProviderManager {
  constructor() {
    this.providers = new Map();
  }

  registerProvider(name, config) {
    this.providers.set(name, config);
  }

  call(providerName, messages, model, maxTokens = 1024) {
    return new Promise((resolve, reject) => {
      const config = this.providers.get(providerName);
      if (!config) {
        resolve({ status: 'error', error: `Provider ${providerName} not registered.` });
        return;
      }

      // Find budget for model
      let maxChars = 20000;
      if (model.includes('35b')) maxChars = 100000;
      else if (model.includes('9b') || model.includes('26b')) maxChars = 24000;
      else if (model.includes('0.8b') || model.includes('e4b') || model.includes('e2b')) maxChars = 6000;

      const processedMessages = ContextManager.truncate(messages, maxChars);
      const body = JSON.stringify({
        model: model,
        messages: processedMessages,
        max_tokens: maxTokens,
        temperature: 0.7
      });

      const urlObj = new URL(config.baseUrl + '/chat/completions');
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const protocol = urlObj.protocol === 'https:' ? require('https') : http;
      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              resolve({ status: 'error', error: parsed.error.message || JSON.stringify(parsed.error) });
            } else {
              resolve({
                status: 'success',
                content: parsed.choices?.[0]?.message?.content || parsed.choices?.[0]?.message?.reasoning_content || '',
                usage: parsed.usage
              });
            }
          } catch (e) {
            resolve({ status: 'error', error: `Parse error: ${data.slice(0, 200)}` });
          }
        });
      });

      req.on('error', (err) => resolve({ status: 'error', error: err.message }));
      req.setTimeout(300000, () => { req.destroy(); resolve({ status: 'error', error: 'Timeout after 300s' }); });
      req.write(body);
      req.end();
    });
  }

  listProviders() {
    return Array.from(this.providers.keys());
  }

  getModels(providerName) {
    const config = this.providers.get(providerName);
    return config ? (config.models || []) : [];
  }
}

module.exports = { ProviderManager, ContextManager };