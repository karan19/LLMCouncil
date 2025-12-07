/**
 * API client for the LLM Council backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8001';

let authToken = null;

export const setAuthToken = (token) => {
    authToken = token;
};

const authHeaders = () => (authToken ? { Authorization: `Bearer ${authToken}` } : {});

export const api = {
    /**
     * List available models and defaults from backend config.
     */
    async listModels() {
        const response = await fetch(`${API_BASE}/api/models`, {
            headers: {
                ...authHeaders(),
            },
        });
        if (!response.ok) {
            throw new Error('Failed to list models');
        }
        return response.json();
    },

    /**
     * List all conversations.
     */
    async listConversations() {
        const response = await fetch(`${API_BASE}/api/conversations`, {
            headers: {
                ...authHeaders(),
            },
        });
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
                ...authHeaders(),
            },
            body: JSON.stringify({}),
        });
        if (!response.ok) {
            throw new Error('Failed to create conversation');
        }
        return response.json();
    },

    /**
     * Delete a conversation.
     */
    async deleteConversation(conversationId) {
        const response = await fetch(`${API_BASE}/api/conversations/${conversationId}`, {
            method: 'DELETE',
            headers: {
                ...authHeaders(),
            },
        });
        if (!response.ok) {
            throw new Error('Failed to delete conversation');
        }
        return true;
    },

    /**
     * Get a specific conversation.
     */
    async getConversation(conversationId) {
        const response = await fetch(
            `${API_BASE}/api/conversations/${conversationId}`,
            {
                headers: {
                    ...authHeaders(),
                },
            }
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
                    ...authHeaders(),
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
                    ...authHeaders(),
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

        // In a real browser environment, we'd use body.getReader()
        // but we'll assume standard fetch behavior here.
        // NOTE: In Next.js SSR, this might behave differently, but for Client Components it's fine.

        // However, the original implementation assumed a simple response.json() wait if it wasn't streaming,
        // but specifically for streaming it likely needs standard SSE or reader handling.
        // The original code seemingly just awaited response.json() then emitted events?
        // Wait, looking at the original code:
        // const result = await response.json();
        // onEvent(...)
        // It seems the "streaming" endpoint in the original code might just return a JSON with all stages?
        // OR the original code I read was a simplified version.
        // "Emit staged events to keep UI logic consistent without SSE" -> It seems it FAKES streaming by just emitting all events after the request finishes.
        // I will preserve that logic for now.

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
    /**
     * Get saved council models.
     */
    async getSavedCouncilModels() {
        const response = await fetch(`${API_BASE}/api/settings/models`, {
            headers: {
                ...authHeaders(),
            },
        });
        if (!response.ok) {
            throw new Error('Failed to get saved council models');
        }
        return response.json();
    },

    /**
     * Save council models.
     */
    async saveCouncilModels(models) {
        const response = await fetch(`${API_BASE}/api/settings/models`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders(),
            },
            body: JSON.stringify({
                models,
            }),
        });
        if (!response.ok) {
            throw new Error('Failed to save council models');
        }
        return response.json();
    },

    /**
     * Run a single debate turn.
     */
    async runDebateTurn({ topic, targetModel, history, systemPrompt }) {
        const response = await fetch(`${API_BASE}/api/debate/turn`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders(),
            },
            body: JSON.stringify({
                topic,
                target_model: targetModel,
                history,
                system_prompt: systemPrompt,
            }),
        });
        if (!response.ok) {
            throw new Error('Failed to generate debate turn');
        }
        return response.json();
    },
};
