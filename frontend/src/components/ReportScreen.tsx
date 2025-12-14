import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Eraser, ArrowRight, Camera, X } from 'lucide-react';
import api from '../lib/api';

const imgAvatar = "/assets/14ce80fda9a62b69285eb6835c5c005c4790d027.png";

interface Theme {
  id: string;
  title: string;
}

export default function ReportScreen() {
  const [content, setContent] = useState('');
  const [theme, setTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const response = await api.get('/themes/current');
        setTheme(response.data);
      } catch (error: any) {
        if (error.response?.status === 404) {
          // テーマがない場合は作成画面へ
          navigate('/student/theme/create');
          return;
        }
        console.error('Failed to fetch theme:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTheme();
  }, [navigate]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    setImagePreview(URL.createObjectURL(file));
    setIsUploading(true);

    // Upload
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await api.post('/reports/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        setUploadedImageUrl(res.data.url);
    } catch (err) {
        console.error("Upload failed", err);
        alert("画像のアップロードに失敗しました。もう一度試してください。");
        setImagePreview(null);
    } finally {
        setIsUploading(false);
    }
  };

  const handleNext = () => {
    if (!content.trim() || !theme || !uploadedImageUrl) return;
    // 次の画面（AI分析・確認画面）へ遷移し、入力内容とテーマID、画像URLを渡す
    navigate('/student/report/analysis', { 
        state: { 
            content, 
            themeId: theme.id,
            imageUrl: uploadedImageUrl
        } 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fef8f5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#59168b]"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#fef8f5] content-stretch flex flex-col items-start pb-0 pt-[24px] px-[20px] relative size-full min-h-screen">
      <div className="bg-white border border-[rgba(243,232,255,0.5)] border-solid flex flex-col gap-[32px] h-full min-h-[767px] pb-px pt-[41px] px-[20px] relative rounded-[24px] shadow-lg w-full max-w-md mx-auto">

        {/* ヘッダー部分 */}
        <div className="relative w-full">
          <button
            onClick={() => navigate('/student/menu')}
            className="absolute left-0 top-0 flex items-center gap-1 text-[rgba(152,16,250,0.8)] font-['Zen_Maru_Gothic',sans-serif]"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>メニューに戻る</span>
          </button>

          <div className="mt-12 flex items-start gap-4">
            <div className="w-[77px] h-[69px] shrink-0">
              <img
                alt="生井校長"
                className="object-cover w-full h-full rounded-full"
                src={imgAvatar}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/77x69/purple/white?text=Avatar';
                }}
              />
            </div>
            <div className="bg-white border border-[rgba(198,210,255,0.5)] rounded-tl-[18px] rounded-tr-[24px] rounded-br-[24px] rounded-bl-[24px] p-6 w-full">
              <p className="font-['Zen_Maru_Gothic',sans-serif] text-[#59168b] text-[14px] leading-relaxed">
                今日の探究の足跡を残そう！まずは写真をアップロードしてね。
              </p>
            </div>
          </div>
          <p className="absolute top-8 left-0 text-[12px] text-[rgba(152,16,250,0.7)] font-['Zen_Maru_Gothic',sans-serif]">
            生井校長
          </p>
        </div>

        {/* タイトル */}
        <div>
          <h1 className="font-['Zen_Maru_Gothic',sans-serif] text-[#59168b] text-[20px] font-bold mb-2">
            進捗報告
          </h1>
          <p className="font-['Zen_Maru_Gothic',sans-serif] text-[14px] text-[rgba(152,16,250,0.6)]">
            今日の活動内容を入力してください
          </p>
        </div>

        {/* 入力エリア */}
        <div className="flex flex-col gap-4 flex-grow">
          {/* 画像アップロード (必須) */}
          <div className="w-full">
            <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
            />
            <label
                htmlFor="image-upload"
                className={`w-full h-[200px] flex flex-col items-center justify-center bg-white border-2 border-dashed rounded-[24px] cursor-pointer hover:bg-purple-50 transition-colors ${
                    !uploadedImageUrl ? 'border-[#e0c0ff] bg-purple-50/30' : 'border-transparent p-0'
                }`}
            >
                {imagePreview ? (
                <div className="relative w-full h-full group">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-[22px]" />
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            setImagePreview(null);
                            setUploadedImageUrl(null);
                        }}
                        className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 hover:text-red-500" />
                    </button>
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-[22px]">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    )}
                </div>
                ) : (
                <>
                    <div className="bg-[#f0e6ff] p-3 rounded-full mb-3">
                        <Camera className="w-8 h-8 text-[#8a5fff]" />
                    </div>
                    <span className="font-['Zen_Maru_Gothic',sans-serif] text-[15px] font-bold text-[#59168b] mb-1">
                    写真をアップロード
                    </span>
                    <span className="font-['Zen_Maru_Gothic',sans-serif] text-[12px] text-[#9ca3af]">
                    必須
                    </span>
                </>
                )}
            </label>
          </div>

          <div className="w-full flex-grow">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="今日の探求学習で取り組んだこと、発見したこと、考えたことなどを自由に入力してください..."
              className="w-full h-[200px] p-5 bg-white border border-[rgba(233,212,255,0.5)] rounded-[24px] resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 font-['Zen_Maru_Gothic',sans-serif] text-[16px] text-[#59168b] placeholder-[rgba(218,178,255,0.6)]"
            />
          </div>

          <div className="flex gap-4 h-[58px] mt-auto mb-8">
            <button
              onClick={() => {
                  setContent('');
                  setImagePreview(null);
                  setUploadedImageUrl(null);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-[rgba(250,245,255,0.5)] border border-[rgba(243,232,255,0.5)] rounded-[24px] hover:bg-purple-50 transition-colors"
            >
              <Eraser className="w-5 h-5 text-[#8200db]" />
              <span className="text-[#8200db] font-['Zen_Maru_Gothic',sans-serif]">クリア</span>
            </button>

            <button
              onClick={handleNext}
              disabled={!content.trim() || !uploadedImageUrl || isUploading}
              className={`flex-1 flex items-center justify-center gap-2 rounded-[24px] shadow-md transition-all ${
                content.trim() && uploadedImageUrl && !isUploading
                  ? 'bg-gradient-to-r from-[#a3b3ff] to-[#7c86ff] text-white hover:opacity-90'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="font-['Zen_Maru_Gothic',sans-serif]">次へ</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
