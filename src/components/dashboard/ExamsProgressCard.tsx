import React from "react";

const exams = [
  { name: "Biology", progress: 25 },
  { name: "History", progress: 75 },
  { name: "English", progress: 50 },
];

const ExamsProgressCard = () => (
  <div className="bg-white rounded-xl shadow p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <span role="img" aria-label="books">📚</span>
      Exams
    </h3>
    <div className="flex flex-col gap-3">
      {exams.map((exam) => (
        <div key={exam.name} className="flex items-center justify-between">
          <span>{exam.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{exam.progress}%</span>
            <div className="w-16 h-2 bg-gray-200 rounded">
              <div
                className="h-2 bg-blue-500 rounded"
                style={{ width: `${exam.progress}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
    <button className="mt-4 w-full bg-green-100 text-green-700 rounded-lg py-1 text-sm font-semibold hover:bg-green-200 transition">
      See all
    </button>
  </div>
);

export default ExamsProgressCard; 