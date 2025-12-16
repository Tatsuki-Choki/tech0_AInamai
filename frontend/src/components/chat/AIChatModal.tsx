import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import owlImage from '../../assets/figma/owl_character.webp';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIChatModal({ isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初回メッセージ
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'こんにちは！探究学習について何でも相談してね！',
        },
      ]);
    }
  }, [isOpen, messages.length]);

  // スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // フォーカス
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post<{ response: string }>('/ai/chat', {
        message: userMessage.content,
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.data.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'ごめんね、エラーが発生したよ。もう一度試してみてね。',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    // チャット履歴をクリア（ログを残さない）
    setMessages([]);
    setInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[400px] mx-4 mb-4 sm:mb-0 bg-white rounded-[24px] shadow-xl flex flex-col max-h-[80vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-brand-primary/10 to-brand-buttons/10">
          <div className="flex items-center gap-3">
            <img
              src={owlImage}
              alt="アンプくん"
              className="w-10 h-10 object-contain"
            />
            <div>
              <h3 className="font-zen-maru font-bold text-brand-primary">アンプくん</h3>
              <p className="text-xs text-brand-text-secondary">探究学習の相談をしよう</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <img
                  src={owlImage}
                  alt="アンプくん"
                  className="w-8 h-8 object-contain mr-2 flex-shrink-0"
                />
              )}
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl font-zen-maru text-sm ${
                  message.role === 'user'
                    ? 'bg-brand-primary text-white rounded-br-md'
                    : 'bg-gray-100 text-brand-primary rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <img
                src={owlImage}
                alt="アンプくん"
                className="w-8 h-8 object-contain mr-2 flex-shrink-0"
              />
              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm font-zen-maru outline-none focus:ring-2 focus:ring-brand-primary/20"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-brand-primary text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-primary/90 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2 font-zen-maru">
            ※ チャット履歴は保存されません
          </p>
        </div>
      </div>
    </div>
  );
}
