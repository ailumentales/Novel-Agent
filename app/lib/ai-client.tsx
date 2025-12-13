'use client';

import { useState, useCallback } from 'react';
import { OpenAIMessage } from './ai-service';

// AI客户端钩子，用于在前端组件中使用AI服务
export function useAIClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseContent, setResponseContent] = useState('');

  /**
   * 发送一次性非流式请求
   */
  const sendMessage = useCallback(async (
    messages: OpenAIMessage[],
    onComplete?: (content: string) => void
  ) => {
    setLoading(true);
    setError(null);
    setResponseContent('');

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, stream: false }),
      });

      if (!response.ok) {
        throw new Error('AI请求失败');
      }

      const data = await response.json();
      setResponseContent(data.content);
      onComplete?.(data.content);
      return data.content;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 发送SSE流式请求
   */
  const sendMessageStream = useCallback(async (
    messages: OpenAIMessage[],
    onData: (chunk: string, isComplete: boolean) => void
  ) => {
    setLoading(true);
    setError(null);
    setResponseContent('');

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, stream: true }),
      });

      if (!response.ok) {
        throw new Error('AI请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法获取响应流');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onData(accumulatedContent, true);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              onData(accumulatedContent, true);
              break;
            }

            try {
              const jsonData = JSON.parse(data);
              if (jsonData.content) {
                accumulatedContent += jsonData.content;
                setResponseContent(accumulatedContent);
                onData(accumulatedContent, false);
              }
            } catch (e) {
              console.error('解析SSE数据失败:', e);
            }
          }
        }
      }

      return accumulatedContent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    responseContent,
    sendMessage,
    sendMessageStream,
    clearResponse: () => setResponseContent(''),
    clearError: () => setError(null),
  };
}

// AI聊天组件示例
export function AIChatComponent() {
  const [messages, setMessages] = useState<OpenAIMessage[]>([]);
  const [input, setInput] = useState('');
  const aiClient = useAIClient();

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessages: OpenAIMessage[] = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    try {
      await aiClient.sendMessageStream(newMessages, (content, isComplete) => {
        if (isComplete) {
          setMessages(prev => [...prev, { role: 'assistant', content }]);
        }
      });
    } catch (err) {
      console.error('发送消息失败:', err);
    }
  };

  return (
    <div className="ai-chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className="role">{msg.role === 'user' ? '你' : 'AI'}</div>
            <div className="content">{msg.content}</div>
          </div>
        ))}
        {aiClient.responseContent && (
          <div className="message assistant">
            <div className="role">AI</div>
            <div className="content">{aiClient.responseContent}</div>
          </div>
        )}
      </div>
      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入您的消息..."
          disabled={aiClient.loading}
        />
        <button onClick={handleSend} disabled={aiClient.loading}>
          {aiClient.loading ? '发送中...' : '发送'}
        </button>
      </div>
      {aiClient.error && <div className="error">{aiClient.error}</div>}
    </div>
  );
}
