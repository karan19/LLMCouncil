import { useState, useEffect } from 'react';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  availableModels = [],
  selectedModels = [],
  onToggleModel,
  chairmanModel,
  onChairmanChange,
}) {
  const groupedModels = availableModels.reduce((acc, model) => {
    const [provider] = model.split('/');
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {});

  const sortedProviders = Object.keys(groupedModels).sort();
  const [modelsExpanded, setModelsExpanded] = useState(true);
  const [chairExpanded, setChairExpanded] = useState(true);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LLM Council</h1>
        <button className="new-conversation-btn" onClick={onNewConversation}>
          + New Conversation
        </button>
      </div>

      <div className="models-panel">
        <div className="panel-title">
          <button
            className="collapse-btn"
            onClick={() => setModelsExpanded((v) => !v)}
            aria-label="Toggle council models"
          >
            {modelsExpanded ? '−' : '+'}
          </button>
          <span>Council Models</span>
        </div>
        {modelsExpanded && (
          <>
            {availableModels.length === 0 ? (
              <div className="no-conversations">No models loaded</div>
            ) : (
              <div className="models-list">
                {sortedProviders.map((provider) => {
                  const models = groupedModels[provider].slice().sort();
                  return (
                    <details key={provider} className="model-group">
                      <summary>{provider}</summary>
                      <div>
                        {models.map((model) => (
                          <label key={model} className="model-option">
                            <input
                              type="checkbox"
                              checked={selectedModels.includes(model)}
                              onChange={() => onToggleModel && onToggleModel(model)}
                            />
                            <span>{model}</span>
                          </label>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </>
        )}
        <div className="models-divider" />
        <div className="chairman-select">
          <div className="panel-title">
            <button
              className="collapse-btn"
              onClick={() => setChairExpanded((v) => !v)}
              aria-label="Toggle chairman model"
            >
              {chairExpanded ? '−' : '+'}
            </button>
            <span>Chairman Model</span>
          </div>
          {chairExpanded && (
            <select
              value={chairmanModel || ''}
              onChange={(e) => onChairmanChange && onChairmanChange(e.target.value)}
            >
              {(availableModels.length ? availableModels : [chairmanModel]).map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-title">
                {conv.title || 'New Conversation'}
              </div>
              <div className="conversation-meta">
                {conv.message_count} messages
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
