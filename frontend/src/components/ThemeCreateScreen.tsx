import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import api from '../lib/api';

export default function ThemeCreateScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      await api.post('/themes', { title, description });
      navigate('/student/report');
    } catch (error) {
      console.error('Failed to create theme:', error);
      alert('テーマの作成に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#fef8f5] min-h-screen pb-8">
      <div className="max-w-md mx-auto px-[20px] pt-[40px]">

        {/* ヘッダー */}
        <button
          onClick={() => navigate('/student/menu')}
          className="flex items-center gap-1 text-[rgba(152,16,250,0.8)] font-['Zen_Maru_Gothic',sans-serif] mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>メニューに戻る</span>
        </button>

        <div className="bg-white border border-[rgba(243,232,255,0.5)] rounded-[24px] p-6 shadow-md">
          <h1 className="text-[#59168b] text-[20px] font-bold mb-2 font-['Zen_Maru_Gothic',sans-serif]">
            探究テーマを設定
          </h1>
          <p className="text-[rgba(152,16,250,0.6)] text-[14px] mb-6 font-['Zen_Maru_Gothic',sans-serif]">
            あなたの探究学習のテーマを入力してください
          </p>

          <div className="mb-6">
            <label className="block text-[#59168b] text-[14px] font-bold mb-2 font-['Zen_Maru_Gothic',sans-serif]">
              テーマ名 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：AIと医療の未来について"
              className="w-full p-4 border border-[rgba(233,212,255,0.5)] rounded-[16px] focus:outline-none focus:ring-2 focus:ring-purple-200 font-['Zen_Maru_Gothic',sans-serif] text-[16px] text-[#59168b]"
            />
          </div>

          <div className="mb-8">
            <label className="block text-[#59168b] text-[14px] font-bold mb-2 font-['Zen_Maru_Gothic',sans-serif]">
              説明（任意）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="テーマの詳細や背景を入力してください..."
              className="w-full h-[120px] p-4 border border-[rgba(233,212,255,0.5)] rounded-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 font-['Zen_Maru_Gothic',sans-serif] text-[16px] text-[#59168b]"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className={`w-full h-[58px] rounded-[24px] flex items-center justify-center gap-2 shadow-md transition-all ${
              title.trim() && !isSubmitting
                ? 'bg-gradient-to-r from-[#a3b3ff] to-[#7c86ff] text-white hover:opacity-90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span className="font-bold font-['Zen_Maru_Gothic',sans-serif]">テーマを登録</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
