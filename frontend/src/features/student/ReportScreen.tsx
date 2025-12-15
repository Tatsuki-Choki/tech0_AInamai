import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Image as ImageIcon, X, Send, Sparkles, Edit2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Heading, Text } from '../../components/ui/Typography';
import api from '../../lib/api';

type Step = 'input' | 'analyzing' | 'result';

interface AnalysisResult {
  phase: string;
  abilities: {
    name: string;
    level: 'strongly' | 'moderately'; // 強く発揮 / 発揮
  }[];
  ai_comment: string;
}

export default function ReportScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('input');
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!content) return;
    setStep('analyzing');

    // Simulate API analysis
    setTimeout(() => {
        setAnalysisResult({
            phase: '情報の収集',
            abilities: [
                { name: '情報収集能力と先を見る力', level: 'strongly' },
                { name: '巻き込む力', level: 'moderately' },
                { name: '対話する力', level: 'moderately' }
            ],
            ai_comment: '素晴らしい進捗ですね！報告内容を分析して、発揮された能力とフェーズを自動で選択しました。'
        });
        setStep('result');
    }, 2000);
  };

  const handleSubmit = async () => {
      // Simulate submission
      try {
          await api.post('/reports', {
              content,
              image: imagePreview, // In real app, upload image first and send URL
              analysis: analysisResult
          });
          navigate('/student/menu');
      } catch {
          // Mock success for now - in real app, handle error properly
          navigate('/student/menu');
      }
  };

  if (step === 'analyzing') {
      return (
          <div className="min-h-screen bg-background-app flex flex-col items-center justify-center p-6 font-zen-maru">
              <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-6">
                      <div className="absolute inset-0 border-4 border-brand-primary/20 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 border-4 border-t-brand-primary rounded-full animate-spin"></div>
                      <Sparkles className="absolute inset-0 m-auto text-brand-primary w-10 h-10 animate-bounce" />
                  </div>
                  <Heading level={2} className="mb-2">AIが分析中...</Heading>
                  <Text>あなたの活動から<br/>発揮された能力を見つけています</Text>
              </div>
          </div>
      );
  }

  if (step === 'result' && analysisResult) {
      return (
        <div className="min-h-screen bg-background-app p-4 md:p-6 font-zen-maru pb-24">
            <div className="max-w-md mx-auto flex flex-col gap-4">
                <Button variant="ghost" size="sm" leftIcon={<ChevronLeft />} onClick={() => setStep('input')} className="self-start pl-0">
                    戻る
                </Button>

                {/* AI Comment */}
                <Card className="bg-white border-brand-primary/20 relative overflow-visible mt-4">
                    <div className="absolute -top-6 -right-2 w-16 h-16 bg-brand-buttons rounded-full border-4 border-white shadow-sm overflow-hidden">
                         {/* AI Avatar Placeholder */}
                         <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500" />
                    </div>
                    <Text className="text-brand-primary font-medium pr-12">
                        {analysisResult.ai_comment}
                    </Text>
                </Card>

                <div className="flex items-center gap-2 text-brand-primary font-bold mt-2">
                    <Sparkles className="w-5 h-5" />
                    <span>分析結果</span>
                </div>

                {/* Phase */}
                <Card className="p-5">
                    <Heading level={3} className="text-base mb-3">🔍 探究学習のフェーズ</Heading>
                    <div className="bg-brand-primary/5 rounded-xl p-4 text-center">
                        <Text className="text-brand-primary font-bold text-lg">{analysisResult.phase}</Text>
                    </div>
                </Card>

                {/* Abilities */}
                <Card className="p-5">
                    <Heading level={3} className="text-base mb-3">💪 発揮された能力</Heading>
                    <div className="space-y-4">
                        {analysisResult.abilities.map((ability, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${ability.level === 'strongly' ? 'bg-brand-buttons text-white' : 'bg-brand-secondary/20 text-brand-secondary'}`}>
                                    {ability.level === 'strongly' ? '強く発揮' : '発揮'}
                                </span>
                                <Text className="font-bold text-brand-primary">{ability.name}</Text>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Confirm Content */}
                <Card className="p-5 bg-white/50">
                    <div className="flex justify-between items-center mb-3">
                        <Heading level={3} className="text-base">📊 進捗内容</Heading>
                        <button onClick={() => setStep('input')} className="text-xs flex items-center gap-1 text-brand-secondary hover:text-brand-primary">
                            <Edit2 className="w-3 h-3" />
                            編集
                        </button>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-brand-text-card-unselected">
                        <Text className="text-sm whitespace-pre-wrap">{content}</Text>
                        {imagePreview && (
                            <img src={imagePreview} alt="Uploaded" className="mt-3 rounded-lg w-full h-32 object-cover" />
                        )}
                    </div>
                </Card>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-brand-text-card-unselected">
                    <div className="max-w-md mx-auto">
                        <Button variant="primary" className="w-full shadow-lg" onClick={handleSubmit} rightIcon={<Send className="w-4 h-4" />}>
                            この内容で報告する
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-background-app p-4 font-zen-maru flex flex-col">
      <div className="max-w-[448px] mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 h-11">
            <Button variant="ghost" size="sm" leftIcon={<ChevronLeft />} onClick={() => navigate('/student/menu')} className="pl-0 text-brand-primary font-medium hover:bg-transparent">
                メニュー
            </Button>
            <Heading level={2} className="text-lg font-medium text-brand-primary absolute left-1/2 -translate-x-1/2">活動報告</Heading>
            <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Form */}
        <Card className="flex-1 flex flex-col gap-6 mb-4 rounded-card shadow-card p-6 border-[1.5px] border-brand-text-card-unselected/50">
            <div>
                <label className="block text-sm font-bold text-brand-primary mb-3">
                    今日の思い出（写真）
                </label>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        w-full aspect-video rounded-[16px] border-[1.5px] border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden
                        ${imagePreview ? 'border-transparent' : 'border-brand-primary/30 hover:bg-brand-primary/5'}
                    `}
                >
                    {imagePreview ? (
                        <div className="relative w-full h-full group">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ImageIcon className="text-white w-8 h-8" />
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setImagePreview(null);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm hover:bg-gray-100"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    ) : (
                        <div className="text-center p-4">
                            <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 text-brand-primary">
                                <ImageIcon className="w-6 h-6" />
                            </div>
                            <Text className="text-sm font-bold text-brand-primary mb-1">写真をアップロード</Text>
                            <Text className="text-xs text-brand-text-secondary">タップして選択</Text>
                        </div>
                    )}
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageSelect}
                    />
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                <label className="block text-sm font-bold text-brand-primary mb-3">
                    活動内容
                </label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="今日やったこと、わかったこと、次にやることなどを書いてみよう"
                    className="flex-1 w-full p-4 rounded-[16px] border-[1.5px] border-brand-text-card-unselected focus:border-brand-primary focus:ring-0 outline-none resize-none min-h-[200px] text-brand-primary placeholder:text-brand-text-secondary/50 font-zen-maru text-base leading-relaxed"
                />
            </div>
        </Card>

        <Button 
            variant="primary" 
            className="w-full shadow-lg mb-6 h-14 text-lg rounded-[24px]" 
            disabled={!content}
            onClick={handleAnalyze}
            rightIcon={<Sparkles className="w-5 h-5" />}
        >
            AIに分析してもらう
        </Button>
      </div>
    </div>
  );
}

