import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Camera } from 'lucide-react';
import api from '../../lib/api';
import { toJSTDateString } from '../../lib/timezone';
import ashiatoBlue from '../../assets/figma/ashiato_blue.webp';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface Report {
    id: string;
    content: string;
    image_url: string | null;
    reported_at: string;
    ai_comment?: string;
    phase?: {
        name: string;
    };
}

interface ReportsByDate {
    [date: string]: Report[];
}

export default function StudentCalendar() {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [reports, setReports] = useState<Report[]>([]);
    const [reportsByDate, setReportsByDate] = useState<ReportsByDate>({});
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedReports, setSelectedReports] = useState<Report[]>([]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    // Fetch reports on mount
    useEffect(() => {
        fetchReports();
    }, []);

    // Group reports by date (in JST) when reports change
    useEffect(() => {
        const grouped: ReportsByDate = {};
        reports.forEach(report => {
            const date = toJSTDateString(report.reported_at);
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(report);
        });
        setReportsByDate(grouped);
    }, [reports]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await api.get('/reports?limit=100');
            setReports(response.data);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 2, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month, 1));
    };

    const handleBack = () => {
        navigate('/student/menu');
    };

    // Calendar Logic
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const getDateString = (day: number) => {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const getReportsForDay = (day: number): Report[] => {
        const dateStr = getDateString(day);
        return reportsByDate[dateStr] || [];
    };

    const handleDayClick = (day: number) => {
        const dateStr = getDateString(day);
        const dayReports = getReportsForDay(day);
        if (dayReports.length > 0) {
            setSelectedDate(dateStr);
            setSelectedReports(dayReports);
        }
    };

    const closeModal = () => {
        setSelectedDate(null);
        setSelectedReports([]);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    };

    return (
        <div className="min-h-screen bg-[#fff9f5] p-4 font-zen-maru flex flex-col items-center">
            <div className="max-w-md w-full flex-1 flex flex-col">
                {/* Header Navigation */}
                <div className="flex items-center mb-4">
                    <button onClick={handleBack} className="text-brand-primary flex items-center font-bold text-lg hover:opacity-70">
                        <ChevronLeft className="w-6 h-6 mr-1" /> 戻る
                    </button>
                </div>

                <div className="bg-white rounded-[32px] p-6 shadow-sm relative">
                    {/* Title with decorative footprints */}
                    <div className="relative mb-6">
                        <h1 className="text-center text-[#5C6BC0] text-xl font-bold">
                            あしあとカレンダー
                        </h1>
                        <p className="text-center text-gray-500 text-sm mt-1">
                            写真で振り返る探究の記録
                        </p>
                        <img
                            src={ashiatoBlue}
                            alt=""
                            className="absolute -top-2 right-4 w-6 h-6 object-contain rotate-[30deg] opacity-60"
                        />
                        <img
                            src={ashiatoBlue}
                            alt=""
                            className="absolute top-4 right-0 w-5 h-5 object-contain rotate-[10deg] opacity-40"
                        />
                    </div>

                    {/* Date Navigation */}
                    <div className="flex items-center justify-center gap-3 mb-6 text-brand-primary">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronLeft className="w-5 h-5 text-[#5C6BC0]" />
                        </button>

                        <div className="flex items-center gap-2">
                            <div className="bg-[#f0f4ff] rounded-full px-5 py-2 text-lg font-bold text-[#5C6BC0]">
                                {year}年 {month}月
                            </div>
                        </div>

                        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronRight className="w-5 h-5 text-[#5C6BC0]" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5C6BC0]"></div>
                        </div>
                    ) : (
                        <>
                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1 text-center">
                                {/* Weekday Headers */}
                                {WEEKDAYS.map((day, index) => (
                                    <div key={day} className={`font-bold text-xs py-2 ${index === 0 ? 'text-red-400' :
                                        index === 6 ? 'text-blue-400' :
                                            'text-gray-400'
                                        }`}>
                                        {day}
                                    </div>
                                ))}

                                {/* Days */}
                                {days.map((day, index) => {
                                    if (day === null) return <div key={`empty-${index}`} className="aspect-square" />;

                                    const dayReports = getReportsForDay(day);
                                    const hasReports = dayReports.length > 0;
                                    const hasImage = dayReports.some(r => r.image_url);
                                    const firstImage = dayReports.find(r => r.image_url)?.image_url;
                                    const isToday = new Date().toDateString() === new Date(year, month - 1, day).toDateString();

                                    return (
                                        <div
                                            key={day}
                                            onClick={() => handleDayClick(day)}
                                            className={`aspect-square relative rounded-lg overflow-hidden transition-all duration-200 ${hasReports ? 'cursor-pointer hover:scale-105 hover:shadow-md' : ''
                                                } ${isToday ? 'ring-2 ring-[#5C6BC0] ring-offset-1' : ''}`}
                                        >
                                            {/* Day number */}
                                            <span className={`absolute top-0.5 left-1 text-xs font-medium z-10 ${hasImage ? 'text-white drop-shadow-md' : 'text-[#5C6BC0]'
                                                }`}>
                                                {day}
                                            </span>

                                            {/* Content */}
                                            {hasImage && firstImage ? (
                                                // Photo thumbnail
                                                <div className="w-full h-full">
                                                    <img
                                                        src={firstImage.startsWith('http') ? firstImage : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${firstImage}`}
                                                        alt={`${month}/${day}の記録`}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                    {dayReports.length > 1 && (
                                                        <div className="absolute bottom-0.5 right-0.5 bg-black/50 text-white text-[10px] px-1 rounded">
                                                            +{dayReports.length - 1}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : hasReports ? (
                                                // Footprint mark (report without image)
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                                                    <img
                                                        src={ashiatoBlue}
                                                        alt=""
                                                        className="w-6 h-6 object-contain"
                                                        style={{ transform: `rotate(${(day * 15) % 360}deg)` }}
                                                    />
                                                </div>
                                            ) : (
                                                // Empty day
                                                <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Stats */}
                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <div className="flex justify-around text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-[#5C6BC0]">{reports.length}</div>
                                        <div className="text-xs text-gray-500">総記録数</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-[#5C6BC0]">
                                            {reports.filter(r => r.image_url).length}
                                        </div>
                                        <div className="text-xs text-gray-500">写真付き</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-[#5C6BC0]">
                                            {Object.keys(reportsByDate).length}
                                        </div>
                                        <div className="text-xs text-gray-500">活動日数</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Encouragement message */}
                <div className="mt-4 text-center text-sm text-gray-500">
                    <p>1年後、このカレンダーが</p>
                    <p>あなたの探究の思い出でいっぱいになりますように ✨</p>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedDate && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeModal}>
                    <div
                        className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#5C6BC0] to-[#7986CB] p-4 text-white relative">
                            <button
                                onClick={closeModal}
                                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <h2 className="text-xl font-bold">{formatDate(selectedDate)}</h2>
                            <p className="text-white/80 text-sm mt-1">
                                {selectedReports.length}件の記録
                            </p>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
                            {selectedReports.map((report, index) => (
                                <div key={report.id} className="bg-gray-50 rounded-2xl overflow-hidden">
                                    {/* Report Image */}
                                    {report.image_url && (
                                        <div className="aspect-video w-full">
                                            <img
                                                src={report.image_url.startsWith('http') ? report.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${report.image_url}`}
                                                alt={`記録 ${index + 1}`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement!.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Report Content */}
                                    <div className="p-4">
                                        {report.phase && (
                                            <span className="inline-block bg-[#5C6BC0]/10 text-[#5C6BC0] text-xs px-2 py-1 rounded-full mb-2">
                                                {report.phase.name}
                                            </span>
                                        )}
                                        <p className="text-gray-700 text-sm leading-relaxed">
                                            {report.content}
                                        </p>

                                        {/* AI Comment */}
                                        {report.ai_comment && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                                    <span>🤖</span>
                                                    <span>AIナマイからのコメント</span>
                                                </div>
                                                <p className="text-gray-600 text-xs italic leading-relaxed">
                                                    {report.ai_comment}
                                                </p>
                                            </div>
                                        )}

                                        {/* No image indicator */}
                                        {!report.image_url && (
                                            <div className="mt-3 flex items-center gap-2 text-gray-400 text-xs">
                                                <Camera className="w-4 h-4" />
                                                <span>写真なし</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-100">
                            <button
                                onClick={closeModal}
                                className="w-full py-3 bg-[#5C6BC0] text-white rounded-full font-bold hover:bg-[#4A5AB8] transition-colors"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
