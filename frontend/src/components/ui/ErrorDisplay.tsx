import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, Lock, FileQuestion } from 'lucide-react';

export type ErrorType =
  | 'network'
  | 'server'
  | 'auth'
  | 'notFound'
  | 'validation'
  | 'generic';

interface ErrorDisplayProps {
  type?: ErrorType;
  title?: string;
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
  fullScreen?: boolean;
}

const errorConfig: Record<ErrorType, { icon: React.ElementType; defaultTitle: string; color: string }> = {
  network: {
    icon: WifiOff,
    defaultTitle: 'ネットワークエラー',
    color: 'text-orange-500',
  },
  server: {
    icon: ServerCrash,
    defaultTitle: 'サーバーエラー',
    color: 'text-red-500',
  },
  auth: {
    icon: Lock,
    defaultTitle: '認証エラー',
    color: 'text-yellow-600',
  },
  notFound: {
    icon: FileQuestion,
    defaultTitle: '見つかりません',
    color: 'text-gray-500',
  },
  validation: {
    icon: AlertCircle,
    defaultTitle: '入力エラー',
    color: 'text-orange-500',
  },
  generic: {
    icon: AlertCircle,
    defaultTitle: 'エラーが発生しました',
    color: 'text-red-500',
  },
};

export function ErrorDisplay({
  type = 'generic',
  title,
  message,
  onRetry,
  onBack,
  fullScreen = false,
}: ErrorDisplayProps) {
  const config = errorConfig[type];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;

  const content = (
    <div className="bg-white rounded-[24px] border border-[rgba(243,232,255,0.5)] shadow-lg p-8 max-w-md w-full mx-4">
      <div className="flex flex-col items-center text-center">
        <div className={`w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4`}>
          <Icon className={`w-8 h-8 ${config.color}`} />
        </div>

        <h3 className="text-[18px] font-bold text-[#59168b] mb-2">{displayTitle}</h3>
        <p className="text-[14px] text-gray-600 mb-6">{message}</p>

        <div className="flex gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#8200db] to-[#59168b] text-white rounded-[16px] hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              <span>再試行</span>
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 border border-[rgba(233,212,255,0.5)] text-[#59168b] rounded-[16px] hover:bg-purple-50 transition-colors"
            >
              戻る
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="bg-[#fef8f5] min-h-screen flex items-center justify-center">
        {content}
      </div>
    );
  }

  return <div className="flex justify-center py-8">{content}</div>;
}

interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
}

export function InlineError({ message, onDismiss }: InlineErrorProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-[12px] p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-[14px] text-red-700">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 text-[20px] leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}

interface FormErrorProps {
  message: string;
}

export function FormError({ message }: FormErrorProps) {
  return (
    <p className="text-[12px] text-red-500 mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />
      {message}
    </p>
  );
}
