import React, { useState, useRef } from 'react';
import { CheckCircle, Settings, AlertCircle, Loader, ThumbsUp, MessageSquare } from 'lucide-react';

const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';

export default function DeepResearch({ onComplete }) {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportPlan, setReportPlan] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [finalReport, setFinalReport] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef(null);
  const sessionIdRef = useRef(`session_${Math.random().toString(36).substr(2, 9)}`);

  const [config, setConfig] = useState({
    search_api: 'tavily',
    planner_provider: 'openai',
    writer_provider: 'openai',
    max_search_depth: 2,
    number_of_queries: 2
  });

  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const processSSEResponse = async (response, onEvent) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') return;
            
            try {
              const parsedData = JSON.parse(data);
              onEvent(parsedData);
            } catch (err) {
              console.error('Error parsing SSE data:', err);
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        throw err;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setStatus('Starting research...');
    setReportPlan(null);
    setFinalReport(null);
    setProgress(0);
    
    cancelRequest();
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch(`${PYTHON_API_URL}/api/research/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionIdRef.current
        },
        body: JSON.stringify({ topic, config }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start research');
      }
      
      await processSSEResponse(response, (data) => {
        if (data.type === 'interrupt') {
          setReportPlan(data.value);
        } else if (data.type === 'status') {
          setStatus(data.content);
        } else if (data.type === 'error') {
          throw new Error(data.content);
        }
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
      setStatus('');
      abortControllerRef.current = null;
    }
  };
  
  const handleApproveOrFeedback = async (isApproval = false) => {
    if (!isApproval && !feedback.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setStatus(isApproval ? 'Generating final report...' : 'Processing feedback...');
    setProgress(0);

    try {
      const response = await fetch(`${PYTHON_API_URL}/api/research/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionIdRef.current
        },
        body: JSON.stringify({ 
          topic,
          feedback: isApproval ? "true" : feedback.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process input');
      }
      
      await processSSEResponse(response, (data) => {
        if (data.type === 'report') {
          setFinalReport(data.content);
          setReportPlan(null);
          onComplete?.(data.content);
        } else if (data.type === 'status') {
          setStatus(data.content);
        } else if (data.type === 'progress') {
          setProgress(data.completed);
        } else if (data.type === 'interrupt') {
          setReportPlan(data.value);
        } else if (data.type === 'error') {
          throw new Error(data.content);
        }
      });

      if (!isApproval) {
        setFeedback(''); // Clear feedback after successful submission
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Deep Research Assistant</h1>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="p-2 rounded hover:bg-white/10"
        >
          <Settings className="w-6 h-6 text-white/70" />
        </button>
      </div>

      {showConfig && (
        <div className="bg-white/5 p-4 rounded-lg space-y-4">
          <h2 className="font-semibold text-white">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70">Search API</label>
              <select
                className="mt-1 block w-full rounded bg-white/10 border-white/20 text-white"
                value={config.search_api}
                onChange={(e) => setConfig({...config, search_api: e.target.value})}
              >
                <option value="tavily">Tavily</option>
                <option value="perplexity">Perplexity</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70">Planner Provider</label>
              <select
                className="mt-1 block w-full rounded bg-white/10 border-white/20 text-white"
                value={config.planner_provider}
                onChange={(e) => setConfig({...config, planner_provider: e.target.value})}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70">Writer Provider</label>
              <select
                className="mt-1 block w-full rounded bg-white/10 border-white/20 text-white"
                value={config.writer_provider}
                onChange={(e) => setConfig({...config, writer_provider: e.target.value})}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70">Max Search Depth</label>
              <input
                type="number"
                className="mt-1 block w-full rounded bg-white/10 border-white/20 text-white"
                value={config.max_search_depth}
                onChange={(e) => setConfig({...config, max_search_depth: parseInt(e.target.value)})}
                min="1"
                max="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70">Number of Queries</label>
              <input
                type="number"
                className="mt-1 block w-full rounded bg-white/10 border-white/20 text-white"
                value={config.number_of_queries}
                onChange={(e) => setConfig({...config, number_of_queries: parseInt(e.target.value)})}
                min="1"
                max="5"
              />
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/70">Research Topic</label>
          <input
            type="text"
            className="mt-1 block w-full rounded bg-white/10 border-white/20 text-white"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter your research topic"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#cc2b5e] to-[#753a88] text-white py-2 px-4 rounded 
            hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              <span>{status || 'Processing...'}</span>
            </div>
          ) : (
            'Generate Report Plan'
          )}
        </button>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {status && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
          <p className="text-blue-400">{status}</p>
          {progress > 0 && (
            <div className="w-full bg-white/10 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress / 5) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {reportPlan && !finalReport && (
        <div className="space-y-6">
          <div className="prose prose-invert max-w-none">
            <h2 className="text-xl font-semibold text-white">Report Plan</h2>
            <div className="text-white/70 whitespace-pre-wrap">{reportPlan}</div>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleApproveOrFeedback(true)}
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 
                disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ThumbsUp className="w-5 h-5" />
              <span>Approve Plan</span>
            </button>

            <div className="relative bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-white/70" />
                <label className="text-sm font-medium text-white/70">
                  Or Provide Feedback
                </label>
              </div>
              <textarea
                className="mt-1 block w-full rounded bg-white/10 border-white/20 text-white"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Suggest changes or improvements..."
                rows="4"
              />
              <button
                onClick={() => handleApproveOrFeedback(false)}
                disabled={isLoading || !feedback.trim()}
                className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 
                  disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {finalReport && (
        <div className="prose prose-invert max-w-none">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Final Report
          </h2>
          <div className="text-white/70 whitespace-pre-wrap">{finalReport}</div>
        </div>
      )}
    </div>
  );
}