/**
 * API client for the LLM Council backend.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

export const api = {
  /**
   * List available models and defaults from backend config.
   */
  async listModels() {
    const response = await fetch(`${API_BASE}/api/models`);
    if (!response.ok) {
      throw new Error('Failed to list models');
    }
    return response.json();
  },

  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`);
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   */
  async sendMessage(conversationId, content, options = {}) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          models: options.models,
          chairman_model: options.chairmanModel,
        }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, onEvent, options = {}) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message?stream=true`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          models: options.models,
          chairman_model: options.chairmanModel,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const result = await response.json();

    // Emit staged events to keep UI logic consistent without SSE
    onEvent('stage1_start', { type: 'stage1_start' });
    onEvent('stage1_complete', { type: 'stage1_complete', data: result.stage1 });
    onEvent('stage2_start', { type: 'stage2_start' });
    onEvent('stage2_complete', {
      type: 'stage2_complete',
      data: result.stage2,
      metadata: result.metadata,
    });
    onEvent('stage3_start', { type: 'stage3_start' });
    onEvent('stage3_complete', { type: 'stage3_complete', data: result.stage3 });
    onEvent('complete', { type: 'complete' });
  },
};
