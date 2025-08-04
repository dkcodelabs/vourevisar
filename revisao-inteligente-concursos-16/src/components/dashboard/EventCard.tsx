import React from "react";

interface EventCardProps {
  time: string;
  title: string;
  description: string;
  participants?: string[];
  extraInfo?: string;
  icon?: React.ReactNode;
}

const EventCard: React.FC<EventCardProps> = ({
  time,
  title,
  description,
  participants = [],
  extraInfo,
  icon,
}) => (
  <div className="bg-white rounded-xl shadow p-4 flex flex-col min-h-[120px]">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-gray-500">{time}</span>
      {icon && <span>{icon}</span>}
    </div>
    <h3 className="font-semibold text-lg mb-1">{title}</h3>
    <p className="text-sm text-gray-600 flex-1">{description}</p>
    <div className="flex items-center mt-3">
      {participants.slice(0, 4).map((p, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white -ml-2 first:ml-0 flex items-center justify-center text-xs font-bold text-gray-700"
        >
          {p}
        </div>
      ))}
      {extraInfo && (
        <span className="ml-2 text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
          {extraInfo}
        </span>
      )}
    </div>
  </div>
);

export default EventCard; 