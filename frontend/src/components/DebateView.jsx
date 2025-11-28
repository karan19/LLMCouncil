import { useMemo, useState } from 'react';
import './DebateView.css';

const speakerPositions = ['top', 'left', 'right'];

const summarize = (text = '') => {
  const normalized = text.trim();
  if (!normalized) return 'Awaiting the council’s initial answers.';
  if (normalized.length <= 140) return normalized;
  return `${normalized.slice(0, 140)}…`;
};

const getModelShortName = (model) => {
  if (!model) return 'Model';
  const parts = model.split('/');
  return parts[1] || parts[0];
};

export default function DebateView({
  conversation,
  panelModels = [],
  availableModels = [],
  onPanelModelChange,
  onSubmitTopic,
  onBackToSelection,
  debateTurns = [],
  debateLoading = false,
  debateError = '',
  debateTopic = '',
}) {

  const latestUserMessage = useMemo(() => {
    if (!conversation?.messages) return null;
    return [...conversation.messages]
      .reverse()
      .find((msg) => msg.role === 'user');
  }, [conversation]);

  const defaultTopic = latestUserMessage?.content?.trim() || conversation?.title || 'New debate topic';
  const topic = debateTopic || defaultTopic;

  const [topicInput, setTopicInput] = useState('');
  const panelReady = panelModels.filter(Boolean).length >= 1;

  const speakers = panelModels.map((model, idx) => {
    const turn = debateTurns[idx];
    const responseText = turn?.response || '';
    const hasResponse = Boolean(responseText);
    const resolvedModel = turn?.model || model;
    return {
      id: resolvedModel || `panel-${idx}`,
      model: resolvedModel || `Panelist ${idx + 1}`,
      modelShortName: resolvedModel
        ? getModelShortName(resolvedModel)
        : `Panelist ${idx + 1}`,
      response: responseText,
      summary: hasResponse
        ? summarize(responseText)
        : model
        ? 'Waiting for this panelist to answer the topic.'
        : 'Panelist not assigned yet.',
      status: hasResponse ? 'Delivered' : model ? 'Waiting' : 'Pending',
    };
  });

  const handleTopicSubmit = () => {
    const trimmed = topicInput.trim();
    if (!trimmed || !panelReady) return;
    onSubmitTopic?.(trimmed);
    setTopicInput('');
  };

  return (
    <div className="debate-view">
      <div className="debate-view-header">
        <div>
          <p className="debate-label">Debate mode</p>
          <h2>Round-table discussion</h2>
          <p className="debate-subtitle">
            Three council members take turns reacting to the current topic.
          </p>
        </div>
        <div className="debate-view-actions">
          {onBackToSelection ? (
            <button
              type="button"
              className="debate-return-btn"
              onClick={onBackToSelection}
            >
              Back to views
            </button>
          ) : null}
          <span className="debate-topic-pill">Topic driven</span>
        </div>
      </div>

      <div className="debate-controls">
        <div className="debate-panelists">
          {panelModels.map((model, idx) => (
            <label key={`panelist-${idx}`} className="panelist-select">
              <span>Panelist {idx + 1}</span>
            <select
              value={model || ''}
              onChange={(event) => onPanelModelChange?.(idx, event.target.value)}
            >
                <option value="">Select a model</option>
                {model && !availableModels.includes(model) ? (
                  <option value={model}>{model}</option>
                ) : null}
                {availableModels.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="debate-topic-entry">
          <label htmlFor="debate-topic-textarea" className="topic-entry-label">
            Enter debate topic
          </label>
          <textarea
            id="debate-topic-textarea"
            className="debate-topic-textarea"
            value={topicInput}
            onChange={(event) => setTopicInput(event.target.value)}
            placeholder="Describe the topic you'd like the council to debate."
          />
          <div className="debate-topic-actions">
            <button
              type="button"
              onClick={handleTopicSubmit}
              disabled={!panelReady || !topicInput.trim()}
            >
              Start debate
            </button>
            <span className="debate-topic-note">
              {panelReady
                ? 'Each panelist will take turns after submission.'
                : 'Configure your debate panel models first.'}
            </span>
          </div>
        </div>
      </div>
      {debateLoading && (
        <p className="debate-loading">Running debate turns... please wait.</p>
      )}
      {debateError && (
        <p className="debate-error">{debateError}</p>
      )}

      <div className="debate-grid">
        {speakers.map((speaker, idx) => (
          <div
            key={speaker.id}
            className={`debate-speaker-card position-${speakerPositions[idx]}`}
          >
            <div className="speaker-card-header">
              <span className="speaker-name">{speaker.modelShortName}</span>
              <span className="speaker-status">{speaker.status}</span>
            </div>
            <p className="speaker-card-turn">Turn {idx + 1}</p>
            <p className="speaker-card-text">{speaker.summary}</p>
          </div>
        ))}
        <div className="debate-topic-card">
          <p className="topic-label">Central topic</p>
          <p className="topic-text">{topic}</p>
        </div>
      </div>

      <div className="debate-turns">
        {debateTurns.length > 0
          ? debateTurns.map((turn, idx) => (
              <div key={`debate-turn-${idx}`} className="debate-turn">
                <div className="debate-turn-header">
                  <span className="debate-turn-number">Turn {idx + 1}</span>
                  <span className="debate-turn-model">
                    {getModelShortName(turn.model)} ({turn.role})
                  </span>
                </div>
                <p className="debate-turn-text">
                  {turn.response || 'No response produced.'}
                </p>
              </div>
            ))
          : speakers.map((speaker, idx) => (
              <div key={`${speaker.id}-turn`} className="debate-turn">
                <div className="debate-turn-header">
                  <span className="debate-turn-number">Turn {idx + 1}</span>
                  <span className="debate-turn-model">{speaker.modelShortName}</span>
                </div>
                <p className="debate-turn-text">{speaker.summary}</p>
              </div>
            ))}
      </div>
    </div>
  );
}
