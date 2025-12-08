import axios, { AxiosError } from 'axios';
import type { ErrorType } from '../components/ui/ErrorDisplay';

// 環境変数からAPIのベースURLを取得、なければデフォルト値を使用
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30秒タイムアウト
});

// リクエストインターセプター: トークンがあればヘッダーに付与
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// レスポンスインターセプター: 401エラー時にログアウト処理などを行う
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // トークン期限切れなどの場合、ローカルストレージをクリアしてログイン画面へ
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// APIエラーの型
export interface ApiError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  originalError?: AxiosError;
}

// エラーメッセージのマッピング
const errorMessages: Record<number, string> = {
  400: '入力内容に問題があります。確認してください。',
  401: 'セッションが切れました。再度ログインしてください。',
  403: 'この操作を行う権限がありません。',
  404: '要求されたデータが見つかりません。',
  422: '入力内容に問題があります。確認してください。',
  500: 'サーバーで問題が発生しました。しばらくしてから再度お試しください。',
  502: 'サーバーに接続できません。しばらくしてから再度お試しください。',
  503: 'サービスが一時的に利用できません。しばらくしてから再度お試しください。',
};

// エラーの種類を判定
function getErrorType(error: AxiosError): ErrorType {
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'network';
    }
    if (error.message === 'Network Error') {
      return 'network';
    }
    return 'generic';
  }

  const status = error.response.status;
  if (status === 401) return 'auth';
  if (status === 403) return 'auth';
  if (status === 404) return 'notFound';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'generic';
}

// エラーメッセージを取得
function getErrorMessage(error: AxiosError): string {
  // ネットワークエラー
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return '通信がタイムアウトしました。インターネット接続を確認してください。';
    }
    if (error.message === 'Network Error') {
      return 'ネットワークに接続できません。インターネット接続を確認してください。';
    }
    return 'エラーが発生しました。';
  }

  // APIからのエラーメッセージ
  const data = error.response.data as { detail?: string; message?: string };
  if (data?.detail) {
    return data.detail;
  }
  if (data?.message) {
    return data.message;
  }

  // デフォルトのエラーメッセージ
  return errorMessages[error.response.status] || 'エラーが発生しました。';
}

// APIエラーをパース
export function parseApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    return {
      type: getErrorType(error),
      message: getErrorMessage(error),
      statusCode: error.response?.status,
      originalError: error,
    };
  }

  if (error instanceof Error) {
    return {
      type: 'generic',
      message: error.message,
    };
  }

  return {
    type: 'generic',
    message: 'エラーが発生しました。',
  };
}
