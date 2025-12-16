import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Image as ImageIcon, Eraser, ArrowRight, Home, Sparkles, Check, Edit2, Play, Users, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Typography';
import owlImage from '../../assets/figma/owl_character.webp';
import api from '../../lib/api';

// Fallback if specific step assets don't exist: reuse single footprint or CSS
// Based on file list, we might not have 'ashiato_1.png' etc. 
// I will simulate the progress steps with available assets or SVG if specific ones aren't found.

type Step = 'theme_selection' | 'step1_photo' | 'step2_did' | 'step3_understood' | 'step4_next' | 'review' | 'confirmation';

interface Theme {
    id: string;
    title: string;
}

interface AnalysisResult {
    suggested_phase: string;
    suggested_phase_id: string | null;
    suggested_abilities: Array<{ id: string; name: string; score: number; description?: string }>;
    ai_comment: string;
}

export default function ReportScreen() {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('theme_selection');
    const [theme, setTheme] = useState<Theme | null>(null);
    const [themes, setThemes] = useState<Theme[]>([]);
    const [loadingTheme, setLoadingTheme] = useState(true);

    // Form Data
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [textDid, setTextDid] = useState('');
    const [textUnderstood, setTextUnderstood] = useState('');
    const [textNext, setTextNext] = useState('');

    // Analysis Data
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load themes list on mount
    useEffect(() => {
        console.log('ReportScreen mounted');
        const loadThemes = async () => {
            try {
                setLoadingTheme(true);
                // Always get all themes from database
                const themesResponse = await api.get<Theme[]>('/themes/');
                setThemes(themesResponse.data);
                
                // Try to get current fiscal year theme, otherwise use first theme
                if (themesResponse.data.length > 0) {
                    try {
                        const currentResponse = await api.get<Theme>('/themes/current');
                        setTheme(currentResponse.data);
                    } catch (error) {
                        // If current theme doesn't exist, use first theme
                        const axiosError = error as { response?: { status?: number } };
                        if (axiosError.response?.status === 404) {
                            setTheme(themesResponse.data[0]);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load themes:', error);
            } finally {
                setLoadingTheme(false);
            }
        };
        loadThemes();
    }, []);

    // Load themes list when showing theme selection
    useEffect(() => {
        if (step === 'theme_selection') {
            const loadThemesList = async () => {
                try {
                    const response = await api.get<Theme[]>('/themes/');
                    setThemes(response.data);
                } catch (error) {
                    console.error('Failed to load themes list:', error);
                }
            };
            loadThemesList();
        }
    }, [step]);

    const handleAnalyze = useCallback(async () => {
        console.log('handleAnalyze called. Current State:', {
            theme,
            textDid,
            textUnderstood,
            textNext
        });
        if (!theme || (!textDid && !textUnderstood && !textNext)) {
            console.warn('Missing theme or content for analysis. textDid:', textDid, 'textUnderstood:', textUnderstood, 'textNext:', textNext);
            return;
        }

        try {
            setIsAnalyzing(true);
            const content = `${textDid ? `やったこと: ${textDid}\n` : ''}${textUnderstood ? `分かったこと: ${textUnderstood}\n` : ''}${textNext ? `次にすること: ${textNext}` : ''}`;
            
            console.log('Sending analysis request...');
            const response = await api.post<AnalysisResult>('/reports/analyze', {
                content,
                theme_id: theme.id,
            });
            console.log('Analysis response:', response.data);
            setAnalysisResult(response.data);
        } catch (error) {
            console.error('Failed to analyze:', error);
            // Continue even if analysis fails
        } finally {
            setIsAnalyzing(false);
        }
    }, [theme, textDid, textUnderstood, textNext]);

    // Analyze when entering review step
    useEffect(() => {
        console.log('Step changed to:', step);
        if (step === 'review') {
            console.log('Entering review step. Theme:', theme, 'AnalysisResult:', analysisResult, 'IsAnalyzing:', isAnalyzing);
            if (!analysisResult && !isAnalyzing && theme) {
                console.log('Triggering handleAnalyze');
                handleAnalyze();
            } else if (!theme) {
                console.warn('Theme is missing in review step');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, handleAnalyze]);

    // Mock Date
    const today = new Date();
    const dateStr = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Upload image
            try {
                const formData = new FormData();
                formData.append('file', file);
                const response = await api.post<{ url: string }>('/reports/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                setImageUrl(response.data.url);
            } catch (error) {
                console.error('Failed to upload image:', error);
            }
        }
    };

    const clearCurrentInput = () => {
        if (step === 'step1_photo') {
            setImagePreview(null);
            setImageUrl(null);
        }
        if (step === 'step2_did') setTextDid('');
        if (step === 'step3_understood') setTextUnderstood('');
        if (step === 'step4_next') setTextNext('');
    };

    const handleNext = () => {
        // --- TEST DEBUG: Auto-fill for testing if empty ---
        if (import.meta.env.DEV) {
            if (step === 'step2_did' && !textDid) setTextDid('文献調査を行いました（自動入力）');
            if (step === 'step3_understood' && !textUnderstood) setTextUnderstood('データ不足が課題であることが分かりました（自動入力）');
            if (step === 'step4_next' && !textNext) setTextNext('追加のデータ収集を行います（自動入力）');
        }
        // --------------------------------------------------

        if (step === 'step1_photo') setStep('step2_did');
        else if (step === 'step2_did') setStep('step3_understood');
        else if (step === 'step3_understood') setStep('step4_next');
        else if (step === 'step4_next') setStep('review');
    };

    const handleBack = () => {
        if (step === 'step1_photo') setStep('theme_selection');
        else if (step === 'step2_did') setStep('step1_photo');
        else if (step === 'step3_understood') setStep('step2_did');
        else if (step === 'step4_next') setStep('step3_understood');
        else if (step === 'review') setStep('step4_next');
        else if (step === 'theme_selection') navigate('/student/menu');
    };

    const handlePost = async () => {
        if (!theme) {
            alert('探究テーマが選択されていません。テーマを選択してください。');
            return;
        }

        if (!analysisResult) {
            alert('分析結果が取得できていません。もう一度お試しください。');
            return;
        }

        try {
            setIsSubmitting(true);
            const content = `${textDid ? `やったこと: ${textDid}\n` : ''}${textUnderstood ? `分かったこと: ${textUnderstood}\n` : ''}${textNext ? `次にすること: ${textNext}` : ''}`;
            
            if (!content.trim()) {
                alert('報告内容を入力してください。');
                setIsSubmitting(false);
                return;
            }
            
            // Send pre-analyzed data to avoid re-analysis on backend
            // This ensures consistency between what student sees and what's saved
            await api.post('/reports', {
                content,
                theme_id: theme.id,
                phase_id: analysisResult.suggested_phase_id,
                ability_ids: analysisResult.suggested_abilities.map(a => a.id),
                image_url: imageUrl,
                // Pre-analyzed data from /reports/analyze
                ai_comment: analysisResult.ai_comment,
                detected_abilities: analysisResult.suggested_abilities.map(a => ({
                    name: a.name,
                    reason: a.description || '',
                    role: a.score >= 70 ? 'strong' : 'sub',
                    score: a.score,
                })),
            });

            setStep('confirmation');
        } catch (error) {
            console.error('Failed to submit report:', error);
            const axiosError = error as { response?: { data?: { detail?: string } } };
            const errorMessage = axiosError.response?.data?.detail || '報告の送信に失敗しました。もう一度お試しください。';
            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Components ---

    const Header = ({ title, backAction }: { title?: string, backAction: () => void }) => (
        <div className="flex items-center justify-between mb-4 relative">
            <button
                onClick={backAction}
                className="flex items-center text-brand-primary text-sm font-medium hover:opacity-70 transition-opacity z-10"
            >
                <ChevronLeft className="w-5 h-5 mr-1" />
                {step === 'theme_selection' ? 'メニューに戻る' : step === 'step1_photo' ? 'メニューに戻る' : '前の質問に戻る'}
            </button>
            {title && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-white/90 px-4 py-1 rounded-full text-brand-primary font-bold text-sm shadow-sm border border-brand-primary/10">
                        {dateStr}
                    </span>
                </div>
            )}
            <div className="w-10"></div>{/* Spacer */}
        </div>
    );

    const Progress = ({ current, total }: { current: number, total: number }) => (
        <div className="flex items-center mb-6">
            <span className="text-brand-primary font-medium mr-4">進捗報告 ({current}/{total})</span>
            <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`transform transition-all duration-500 ${i <= current ? 'opacity-100 scale-110' : 'opacity-30 scale-100'}`}>
                        {/* Placeholder for footprint icon */}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill={i <= current ? "#0066CC" : "#ADD8E6"} xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" /> {/* Mock footprint shape (star/paw) */}
                        </svg>
                    </div>
                ))}
            </div>
        </div>
    );

    const ThemeDisplay = () => (
        <div className="text-center mb-6">
            <p className="text-brand-primary text-sm font-medium">探究テーマ：{theme?.title || '読み込み中...'}</p>
        </div>
    );

    const NavigationButtons = ({ onNext }: { onNext: () => void }) => (
        <div className="flex gap-4 mt-auto pt-6">
            <button
                onClick={clearCurrentInput}
                className="flex-1 h-14 bg-white border border-brand-primary/10 rounded-full text-brand-primary font-bold flex items-center justify-center gap-2 hover:bg-brand-primary/5 transition-colors shadow-sm"
            >
                <Eraser className="w-4 h-4" />
                クリア
            </button>
            <button
                onClick={onNext}
                className="flex-[1.5] h-14 bg-brand-primary rounded-full text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
            >
                {step === 'step4_next' ? '完了' : '次の質問へ'}
                <ArrowRight className="w-5 h-5" />
            </button>
        </div>
    );


    // --- Screens ---

    if (loadingTheme && step !== 'theme_selection') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4 font-zen-maru">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    if (step === 'theme_selection') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4 font-zen-maru relative overflow-hidden">
                <div className="w-full max-w-[400px] bg-[#fff9f5] rounded-[40px] p-8 pb-12 shadow-sm relative z-10 flex flex-col min-h-[750px] border border-[#fff4ed]">
                    <div className="w-full mt-4 mb-8">
                        <button onClick={() => navigate('/student/menu')} className="flex items-center text-brand-text-secondary text-sm font-medium">
                            <ChevronLeft className="w-4 h-4 mr-2" /> メニューに戻る
                        </button>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center w-full px-2">
                        <div className="w-full mb-8">
                            <p className="text-center text-brand-primary text-xl font-medium mb-6">探究テーマを選択</p>

                            {themes.length > 0 ? (
                                <div className="w-full mb-4">
                                    <label className="block text-sm font-medium text-brand-primary mb-2">
                                        探究テーマを選択してください
                                    </label>
                                    <select
                                        value={theme?.id || ''}
                                        onChange={(e) => {
                                            const selectedTheme = themes.find(t => t.id === e.target.value);
                                            setTheme(selectedTheme || null);
                                        }}
                                        className="w-full bg-white rounded-[24px] border-2 border-brand-primary p-4 text-lg text-brand-text-primary font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    >
                                        <option value="">選択してください</option>
                                        {themes.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="w-full bg-white rounded-[24px] border-2 border-brand-primary/30 p-6 mb-4">
                                    <p className="text-center text-brand-text-secondary">
                                        探究テーマが設定されていません。<br />
                                        先生にテーマの設定を依頼してください。
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <button
                            onClick={() => {
                                if (!theme) {
                                    alert('探究テーマを選択してください。');
                                    return;
                                }
                                setStep('step1_photo');
                            }}
                            disabled={!theme}
                            className="w-full h-24 bg-brand-primary rounded-full flex items-center justify-between px-8 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="text-2xl text-white font-bold z-10">報告を始める</span>
                            <div className="relative z-10 w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-white text-2xl font-bold">→</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'step1_photo') {
        return (
            <div className="min-h-screen bg-[#fff9f5] p-6 font-zen-maru flex flex-col items-center">
                <div className="max-w-md w-full flex-1 flex flex-col">
                    <Header backAction={handleBack} title={dateStr} />
                    <ThemeDisplay />

                    <div className="flex-1 flex flex-col items-center justify-center">
                        <Heading level={2} className="text-2xl font-bold text-brand-primary mb-2 text-center">
                            📸 今日の思い出の一枚を<br />貼ってみよう
                        </Heading>

                        <div className="w-full my-8">
                            <Progress current={1} total={4} />
                        </div>

                        <div
                            className="w-full aspect-[4/3] bg-white rounded-[32px] border-2 border-dashed border-brand-primary/20 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-primary/5 transition-colors relative overflow-hidden"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4 text-brand-primary">
                                        <ImageIcon className="w-10 h-10" />
                                    </div>
                                    <span className="text-brand-primary font-bold">写真を選択（複数選択可）</span>
                                </>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>
                    </div>

                    <NavigationButtons onNext={handleNext} />
                </div>
            </div>
        );
    }

    if (step === 'step2_did' || step === 'step3_understood' || step === 'step4_next') {
        const stepIndex = step === 'step2_did' ? 2 : step === 'step3_understood' ? 3 : 4;
        const title = step === 'step2_did' ? (
            <>📝 貼った写真を振り返ろう<br />今日はどんなことをした？</>
        ) : step === 'step3_understood' ? (
            <>💡 どんなことが分かった？</>
        ) : (
            <>📅 次は何をする予定？</>
        );
        const placeholder = step === 'step2_did' ? "今日取り組んだ内容を自由に入力してください..."
            : step === 'step3_understood' ? "新しく分かったことや気づいたことを入力してください..."
                : "次回の計画や取り組みたいことを入力してください...";

        const value = step === 'step2_did' ? textDid : step === 'step3_understood' ? textUnderstood : textNext;
        const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const val = e.target.value;
            console.log(`Input change for ${step}:`, val);
            if (step === 'step2_did') setTextDid(val);
            else if (step === 'step3_understood') setTextUnderstood(val);
            else setTextNext(val);
        };

        return (
            <div className="min-h-screen bg-[#fff9f5] p-6 font-zen-maru flex flex-col items-center">
                <div className="max-w-md w-full flex-1 flex flex-col">
                    <Header backAction={handleBack} title={dateStr} />
                    <ThemeDisplay />

                    <div className="flex-1 flex flex-col">
                        <Heading level={3} className="text-xl font-bold text-brand-primary mb-4 text-center leading-relaxed">
                            {title}
                        </Heading>

                        <Progress current={stepIndex} total={4} />

                        {imagePreview && (
                            <div className="w-full h-48 rounded-[24px] overflow-hidden mb-6 shadow-sm">
                                <img src={imagePreview} alt="Selected" className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div className="flex-1 min-h-[200px] bg-white rounded-[24px] p-4 shadow-sm border border-brand-text-card-unselected/30">
                            <textarea
                                key={step}
                                value={value}
                                onChange={onChange}
                                placeholder={placeholder}
                                className="w-full h-full outline-none resize-none text-brand-text-primary placeholder:text-brand-text-secondary/50 text-lg leading-relaxed"
                            />
                        </div>
                    </div>

                    <NavigationButtons onNext={handleNext} />
                </div>
            </div>
        );
    }

    if (step === 'review') {
        return (
            <div className="min-h-screen bg-[#fff9f5] p-6 font-zen-maru flex flex-col items-center">
                <div className="max-w-md w-full flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={handleBack} className="text-brand-primary flex items-center font-bold text-lg">
                            <ChevronLeft className="w-6 h-6 mr-1" /> 戻る
                        </button>
                    </div>

                    <div className="mb-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-brand-primary">5</span>
                            <span className="text-sm text-brand-primary font-bold">(金)</span>
                            <span className="text-sm text-brand-text-secondary">2025/12</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles className="w-5 h-5 text-brand-primary" />
                        <span className="text-brand-primary font-bold">分析結果</span>
                    </div>

                    {isAnalyzing ? (
                        <Card className="w-full p-6 rounded-[32px] shadow-sm mb-4 bg-white">
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                                <span className="ml-4 text-brand-primary">分析中...</span>
                            </div>
                        </Card>
                    ) : analysisResult ? (
                        <>
                            <Card className="w-full p-6 rounded-[32px] shadow-sm mb-4 bg-white relative overflow-visible mt-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="bg-white p-1 rounded-full shadow-sm">
                                        <Sparkles className="w-5 h-5 text-brand-text-primary fill-brand-text-primary" />
                                    </div>
                                    <span className="font-bold text-brand-primary text-sm">探究学習のフェーズ</span>
                                </div>
                                <div className="text-center py-4">
                                    <span className="text-2xl font-bold text-brand-primary tracking-widest text-[#5C6BC0] break-words">{analysisResult.suggested_phase}</span>
                                </div>
                            </Card>

                            <Card className="w-full p-6 rounded-[32px] shadow-sm mb-4 bg-white">
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="text-2xl">💪</span>
                                    <span className="font-bold text-brand-primary text-sm">発揮された能力</span>
                                </div>

                                {analysisResult.suggested_abilities.length > 0 ? (
                                    <>
                                        {analysisResult.suggested_abilities.filter(a => a.score >= 70).length > 0 && (
                                            <div className="mb-6">
                                                <span className="text-xs font-bold text-brand-primary block mb-2 text-[#3F51B5]">強く発揮</span>
                                                <div className="space-y-2">
                                                    {analysisResult.suggested_abilities
                                                        .filter(a => a.score >= 70)
                                                        .map((ability) => (
                                                            <div key={ability.id} className="w-full py-4 border border-[#E8EAF6] rounded-full flex items-center justify-center gap-2 bg-white shadow-sm">
                                                                <div className="w-5 h-5 rounded-full bg-[#5C6BC0] text-white flex items-center justify-center text-xs font-serif">i</div>
                                                                <span className="text-brand-primary font-bold text-sm tracking-wide break-words">{ability.name}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {analysisResult.suggested_abilities.filter(a => a.score < 70 && a.score >= 50).length > 0 && (
                                            <div>
                                                <span className="text-xs font-bold text-brand-primary block mb-2 text-[#3F51B5]">発揮</span>
                                                <div className="flex flex-wrap gap-3">
                                                    {analysisResult.suggested_abilities
                                                        .filter(a => a.score < 70 && a.score >= 50)
                                                        .map((ability) => (
                                                            <div key={ability.id} className="flex-1 min-w-[120px] py-4 border border-[#E8EAF6] rounded-full flex items-center justify-center gap-2 bg-white shadow-sm">
                                                                <Users className="w-5 h-5 text-[#4CAF50]" />
                                                                <span className="text-brand-primary font-bold text-sm break-words">{ability.name}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-gray-400 text-center py-4">能力が検出されませんでした</p>
                                )}
                            </Card>
                        </>
                    ) : (
                        <div className="w-full mb-4 flex justify-center">
                             <Button onClick={handleAnalyze} variant="outline" className="gap-2">
                                <Sparkles className="w-4 h-4" />
                                分析を再試行
                             </Button>
                        </div>
                    )}

                    <Card className="w-full p-4 rounded-[32px] shadow-sm mb-4 bg-white">
                        <div className="flex items-center gap-2 mb-4 pl-2">
                            <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="font-bold text-brand-primary text-sm">今日の思い出</span>
                        </div>
                        {imagePreview && (
                            <div className="w-full rounded-[20px] overflow-hidden aspect-[16/10] shadow-sm">
                                <img src={imagePreview} alt="Memory" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </Card>

                    <Card className="w-full p-6 rounded-[32px] shadow-sm mb-24 bg-white relative">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-gradient-to-b from-[#4CAF50] to-[#2196F3] rounded-full"></div>
                                <span className="font-bold text-brand-primary text-sm">進捗内容</span>
                            </div>
                            <button onClick={() => setStep('step2_did')} className="text-brand-primary text-sm flex items-center gap-1 hover:opacity-70 font-bold">
                                <Edit2 className="w-4 h-4" /> 編集
                            </button>
                        </div>

                        <div className="space-y-8 pl-1">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="bg-[#00C853] text-white rounded-[4px] p-0.5"><Check className="w-4 h-4 stroke-[3]" /></div>
                                    <span className="text-brand-primary font-bold text-sm">やったこと</span>
                                </div>
                                <p className="text-brand-text-primary pl-8 text-sm font-medium">{textDid || '（入力なし）'}</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-yellow-500 text-lg">💡</span>
                                    <span className="text-brand-primary font-bold text-sm">分かったこと</span>
                                </div>
                                <p className="text-brand-text-primary pl-8 text-sm font-medium">{textUnderstood || '（入力なし）'}</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Play className="w-5 h-5 text-[#90A4AE] fill-[#90A4AE]" />
                                    <span className="text-brand-primary font-bold text-sm">次にすること</span>
                                </div>
                                <p className="text-brand-text-primary pl-8 text-sm font-medium">{textNext || '（入力なし）'}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Fixed Bottom Button */}
                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#fff9f5] via-[#fff9f5] to-transparent z-50 flex justify-center pointer-events-none">
                        <div className="max-w-md w-full pointer-events-auto">
                            <Button
                                variant="primary"
                                className="w-full h-14 text-lg rounded-full shadow-lg bg-[#253B8E] hover:bg-[#1e3073] text-white font-bold disabled:opacity-50"
                                onClick={handlePost}
                                disabled={isSubmitting || !analysisResult}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        送信中...
                                    </>
                                ) : (
                                    '報告する'
                                )}
                            </Button>
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    if (step === 'confirmation') {
        return (
            <div className="min-h-screen bg-black/20 flex flex-col items-center justify-center p-4 font-zen-maru backdrop-blur-sm">
                <Card className="w-full max-w-[400px] bg-[#fff9f5] rounded-[32px] p-8 flex flex-col items-center text-center shadow-2xl relative overflow-visible">

                    {/* Checkmark Icon */}
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-[#E8A08E] rounded-full flex items-center justify-center border-4 border-[#fff9f5]">
                        <Check className="w-10 h-10 text-white stroke-[3]" />
                    </div>

                    <div className="mt-8 mb-4">
                        <Heading level={2} className="text-2xl font-bold text-brand-primary">
                            報告完了！
                        </Heading>
                    </div>

                    {/* Content Section */}
                    <div className="w-full flex flex-col items-center">
                        <div className="w-full flex items-center justify-between gap-4 mb-2">
                            <img src={owlImage} alt="Owl" className="w-32 h-32 object-contain -ml-4" />
                            <div className="text-left flex-1">
                                <div className="mb-2">
                                    <span className="text-4xl font-bold text-brand-primary mr-2">5</span>
                                    <span className="text-sm text-brand-primary font-bold">土</span>
                                    <span className="text-xs text-brand-text-secondary ml-2">{dateStr}</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full text-left pl-4 mb-8">
                            <p className="text-brand-primary font-medium leading-relaxed break-words">
                                {analysisResult?.ai_comment || '報告が完了しました！'}
                            </p>
                        </div>
                    </div>

                    <button
                        className="w-full h-14 bg-[#253B8E] hover:bg-[#1e3073] text-white rounded-full font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                        onClick={() => navigate('/student/menu')}
                    >
                        <Home className="w-5 h-5" />
                        メニューに戻る
                    </button>
                </Card>
            </div>
        );
    }

    return null;
}
