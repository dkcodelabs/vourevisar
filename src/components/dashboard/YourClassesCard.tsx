import React from "react";

const classes = [
  { name: "Japan Culture", color: "bg-teal-200", emoji: "🇯🇵" },
  { name: "Vege Lovers", color: "bg-pink-200", emoji: "🥑" },
  { name: "Master Volleyball", color: "bg-blue-900 text-white", emoji: "🏐" },
  { name: "Class 2C", color: "bg-green-200", emoji: "🦄" },
];

const YourClassesCard = () => (
  <div className="bg-white rounded-xl shadow p-6 min-h-[260px]">
    <h3 className="font-semibold mb-4">Your Classes</h3>
    <div className="flex gap-3">
      {classes.map((cls) => (
        <div
          key={cls.name}
          className={`rounded-lg px-4 py-6 flex flex-col items-center justify-center font-semibold text-center ${cls.color} flex-1`}
        >
          <span className="text-2xl mb-2">{cls.emoji}</span>
          <span>{cls.name}</span>
        </div>
      ))}
    </div>
  </div>
);

export default YourClassesCard; 