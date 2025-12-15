import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// Mock data for attendance/reports (timestamps or date strings)
const MOCK_REPORTS = [
    '2025-12-05',
    '2025-12-07',
    '2025-12-10',
    '2025-12-11',
    '2025-12-14', // Footprint style 1
    '2025-12-18', // Footprint style 2
];

export default function StudentCalendar() {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 1)); // Default to Dec 2025 as per image

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

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

    const days = [];
    // Empty slots for days before the 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    // Ashiato/Mark Logic (Mock)
    const getMarkType = (day: number) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (MOCK_REPORTS.includes(dateStr)) {
            // Randomize footprint type for visual variety as per design
            return day % 2 === 0 ? 'type1' : 'type2';
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-[#fff9f5] p-6 font-zen-maru flex flex-col items-center">
            <div className="max-w-md w-full flex-1 flex flex-col">
                {/* Header Navigation */}
                <div className="flex items-center mb-6">
                    <button onClick={handleBack} className="text-brand-primary flex items-center font-bold text-lg hover:opacity-70">
                        <ChevronLeft className="w-6 h-6 mr-1" /> 戻る
                    </button>
                </div>

                <div className="bg-white rounded-[32px] p-8 shadow-sm min-h-[600px] relative">

                    <h1 className="text-center text-brand-text-primary text-lg font-bold mb-8 text-[#5C6BC0]">
                        日付ごとの振り返り
                    </h1>

                    {/* Date Navigation */}
                    <div className="flex items-center justify-center gap-4 mb-10 text-brand-primary">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full">
                            <ChevronLeft className="w-6 h-6 text-[#5C6BC0]" />
                        </button>

                        <div className="flex items-center gap-2">
                            <div className="border border-[#E0E0E0] rounded-full px-6 py-2 text-lg font-medium min-w-[100px] text-center text-[#5C6BC0]">
                                {year}
                            </div>
                            <div className="border border-[#E0E0E0] rounded-full px-6 py-2 text-lg font-medium min-w-[80px] text-center text-[#5C6BC0]">
                                {month}
                            </div>
                        </div>

                        <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full">
                            <ChevronRight className="w-6 h-6 text-[#5C6BC0]" />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-y-8 gap-x-2 text-center">
                        {/* Weekday Headers */}
                        {WEEKDAYS.map((day, index) => (
                            <div key={day} className={`font-bold text-sm ${index === 0 ? 'text-red-400' :
                                    index === 6 ? 'text-blue-400' :
                                        'text-[#8FA1B3]'
                                }`}>
                                {day}
                            </div>
                        ))}

                        {/* Days */}
                        {days.map((day, index) => {
                            if (day === null) return <div key={`empty-${index}`} />;

                            const mark = getMarkType(day);

                            return (
                                <div key={day} className="flex flex-col items-center justify-start h-12 relative group cursor-pointer">
                                    <span className="text-[#5C6BC0] text-sm font-medium mb-1 z-10">{day}</span>

                                    {/* Circle placeholder or Footprint */}
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center relative">
                                        {mark ? (
                                            <div className="text-[#0288D1]">
                                                {mark === 'type1' ? (
                                                    // Simple footprint icon representation
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 transform rotate-12">
                                                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
                                                        {/* Note: Replacing with custom footprint SVG paths if available would be better, using generic shapes for now similar to design */}
                                                        <path d="M14.5 13.6c.5.2 1 .1 1.3-.3.3-.4.2-1-.3-1.3-.5-.2-1-.1-1.3.3-.3.4-.2 1 .3 1.3zm-3.5-.7c.3.5.9.6 1.4.2.5-.3.6-.9.2-1.4-.3-.5-.9-.6-1.4-.2-.5.3-.6.9-.2 1.4zm-2.1 4.7c1.1 1.8 3.5 2.4 5.4 1.3 1.8-1.1 2.4-3.5 1.3-5.3-1.1-1.8-3.5-2.4-5.4-1.3-1.8 1.1-2.4 3.5-1.3 5.3z" opacity="0" />
                                                        {/* Using a simpler abstract shape to mimic the 'ashiato' mark from the image */}
                                                        <path d="M17.5,10c0.5-0.8,0.2-1.9-0.6-2.4c-0.8-0.5-1.9-0.2-2.4,0.6c-0.5,0.8-0.2,1.9,0.6,2.4C15.9,11.1,17,10.8,17.5,10z M13,11.5c0.5-0.8,0.2-1.9-0.6-2.4c-0.8-0.5-1.9-0.2-2.4,0.6c-0.5,0.8-0.2,1.9,0.6,2.4C11.4,12.6,12.5,12.3,13,11.5z M10.5,16c1.9,0,3.5-1.6,3.5-3.5s-1.6-3.5-3.5-3.5s-3.5,1.6-3.5,3.5S8.6,16,10.5,16z" />
                                                    </svg>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 transform -rotate-12">
                                                        <path d="M6.5,10c0.5-0.8,0.2-1.9-0.6-2.4C5.1,7.1,4,7.4,3.5,8.2c-0.5,0.8-0.2,1.9,0.6,2.4C4.9,11.1,6,10.8,6.5,10z M11,11.5c0.5-0.8,0.2-1.9-0.6-2.4c-0.8-0.5-1.9-0.2-2.4,0.6c-0.5,0.8-0.2,1.9,0.6,2.4C9.4,12.6,10.5,12.3,11,11.5z M13.5,16c1.9,0,3.5-1.6,3.5-3.5s-1.6-3.5-3.5-3.5s-3.5,1.6-3.5,3.5S11.6,16,13.5,16z" />
                                                    </svg>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-[#CFD8DC] opacity-60"></div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>
        </div>
    );
}
