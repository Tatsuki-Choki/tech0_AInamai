import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Edit, RotateCcw, LogOut } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'student' | 'teacher' | 'admin';
}

const imgImage = "/assets/14ce80fda9a62b69285eb6835c5c005c4790d027.png";

export default function StudentMenu() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // ローカルストレージから取得（あるいはAPIで最新を取得）
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          const response = await api.get<User>('/auth/me');
          setUser(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch user', error);
        // 認証エラーならログインへ
        navigate('/login');
      }
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  return (
    <div className="bg-[#fef8f5] content-stretch flex flex-col items-start pb-0 px-[20px] pt-[40px] relative size-full min-h-screen">
      <div className="bg-white border border-[rgba(243,232,255,0.5)] border-solid flex flex-col gap-[40px] pb-[40px] pt-[40px] px-[20px] relative rounded-[24px] shadow-lg w-full max-w-md mx-auto">
        
        {/* ヘッダーエリア */}
        <div className="flex flex-col gap-6 items-center w-full">
          <div className="relative w-full h-[160px] flex justify-center">
            {/* アバター画像 */}
            <div className="w-[128px] h-[128px]">
              <img 
                alt="チャッピー生井" 
                className="object-contain w-full h-full" 
                src={imgImage}
                // アセットがない場合のフォールバック
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/128x128/purple/white?text=Avatar';
                }}
              />
            </div>
            <div className="absolute bottom-0 w-full text-center">
              <p className="font-['Zen_Maru_Gothic',sans-serif] text-[#8200db] text-[16px]">
                チャッピー生井と探求学習を進めよう
              </p>
            </div>
          </div>
          <div className="w-full text-center">
            <p className="font-['Zen_Maru_Gothic',sans-serif] text-[16px] text-[rgba(152,16,250,0.6)]">
              ようこそ、{user?.name || 'ゲスト'}さん
            </p>
          </div>
        </div>

        {/* メニューボタンエリア */}
        <div className="flex flex-col gap-4 w-full">
          
          {/* 報告ボタン */}
          <button 
            onClick={() => navigate('/student/report')}
            className="flex items-center p-6 gap-4 rounded-[24px] shadow-md bg-gradient-to-r from-[#a3b3ff] to-[#7c86ff] hover:opacity-90 transition-opacity text-left"
          >
            <div className="bg-white/25 p-3 rounded-[16px] shrink-0">
               <Edit className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-['Zen_Maru_Gothic',sans-serif] text-[16px] text-white font-bold">
                報告
              </span>
              <span className="font-['Zen_Maru_Gothic',sans-serif] text-[13px] text-indigo-50">
                現在の探求学習の状況を報告する
              </span>
            </div>
          </button>

          {/* 振り返りボタン */}
          <button 
            onClick={() => navigate('/student/review')}
            className="flex items-center p-6 gap-4 rounded-[24px] shadow-md bg-[#ff9eaf] hover:opacity-90 transition-opacity text-left"
          >
            <div className="bg-white/25 p-3 rounded-[16px] shrink-0">
               <RotateCcw className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-['Zen_Maru_Gothic',sans-serif] text-[16px] text-white font-bold">
                振り返り
              </span>
              <span className="font-['Zen_Maru_Gothic',sans-serif] text-[13px] text-rose-50">
                過去の活動を振り返る
              </span>
            </div>
          </button>

          {/* ログアウトボタン */}
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 h-[58px] rounded-[24px] border border-[rgba(243,232,255,0.5)] bg-[rgba(250,245,255,0.5)] hover:bg-purple-50 transition-colors w-full mt-4"
          >
            <LogOut className="text-[#8200db] w-5 h-5" />
            <span className="font-['Zen_Maru_Gothic',sans-serif] text-[#8200db] text-[16px]">
              ログアウト
            </span>
          </button>

        </div>
      </div>
    </div>
  );
}

