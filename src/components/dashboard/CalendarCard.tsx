import React, { useState } from "react";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalendarEvent {
  id: string;
  name: string;
  subject_name: string;
  review_stage: string;
  next_review: string;
}

interface CalendarCardProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  isLoading?: boolean;
}

const CalendarCard: React.FC<CalendarCardProps> = ({
  events,
  selectedDate,
  onDateChange,
  isLoading = false,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const sortedEvents = [...events].sort((a, b) => {
    const aTime = a.next_review ? new Date(a.next_review).getTime() : 0;
    const bTime = b.next_review ? new Date(b.next_review).getTime() : 0;
    return aTime - bTime;
  });

  const formatDate = (date: Date) => {
    const today = new Date();
    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return "Hoje";
    }
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateChange(new Date(e.target.value));
    setShowDatePicker(false);
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 min-h-[340px] relative">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="font-semibold text-lg">Calendário</h3>
          <span className="text-xs text-gray-400">
            {events.length} revisões {formatDate(selectedDate) === "Hoje" ? "hoje" : ""}
          </span>
        </div>
        <div className="relative">
          <button
            className="bg-gray-100 rounded px-3 py-1 text-sm font-medium flex items-center gap-1"
            onClick={() => setShowDatePicker((v) => !v)}
          >
            {formatDate(selectedDate)}
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5" stroke="#555" strokeWidth="2" fill="none" />
            </svg>
          </button>
          {showDatePicker && (
            <input
              type="date"
              className="absolute right-0 top-8 bg-white border rounded shadow px-2 py-1"
              value={selectedDate.toISOString().split("T")[0]}
              onChange={handleDateChange}
              onBlur={() => setShowDatePicker(false)}
              autoFocus
            />
          )}
        </div>
      </div>
      <div className="relative pl-10 mt-4">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 z-0" />
        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Carregando...</div>
        ) : sortedEvents.length === 0 ? (
          <div className="text-center text-gray-400 py-12">Nenhuma revisão para esta data.</div>
        ) : (
          sortedEvents.map((ev, idx) => (
            <div key={ev.id} className="relative flex items-center mb-6 last:mb-0">
              <div
                className="absolute left-[-30px] top-2 w-3 h-3 rounded-full z-10 bg-blue-500"
              />
              <div className="w-16 text-xs text-gray-400 absolute left-[-70px] top-1">
                {ev.next_review ? format(new Date(ev.next_review), "HH:mm") : ""}
              </div>
              <div className="flex-1 ml-2 rounded-lg px-4 py-3 shadow-sm flex flex-col bg-gray-50">
                <div className="font-semibold">{ev.name}</div>
                <div className="text-xs text-gray-500">
                  {ev.subject_name}
                </div>
                <div className="text-xs text-gray-400">
                  {ev.next_review ? format(new Date(ev.next_review), "dd/MM/yyyy") : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CalendarCard; 