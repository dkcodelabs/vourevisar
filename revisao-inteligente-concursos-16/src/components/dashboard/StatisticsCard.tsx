import React from "react";

const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const marks = [10, 15, 8, 12, 18, 7, 14, 20, 17, 22];
const belowC = [2, 3, 1, 2, 4, 1, 2, 5, 3, 4];

const StatisticsCard = () => (
  <div className="bg-white rounded-xl shadow p-6 min-h-[180px]">
    <h3 className="font-semibold mb-4">Statistics</h3>
    <div className="flex items-end gap-2 h-32">
      {marks.map((val, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <div className="relative flex flex-col items-center">
            <div
              className="w-4 rounded-t bg-blue-400"
              style={{ height: `${val * 4}px` }}
            />
            {belowC[idx] > 0 && (
              <div
                className="w-4 rounded-t bg-yellow-300 mt-1"
                style={{ height: `${belowC[idx] * 4}px` }}
              />
            )}
          </div>
          <span className="text-xs text-gray-400 mt-1">{months[idx]}</span>
        </div>
      ))}
    </div>
    <div className="flex gap-4 mt-4 text-xs text-gray-500">
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 bg-blue-400 rounded"></span> All marks
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 bg-yellow-300 rounded"></span> Marks below C
      </span>
    </div>
  </div>
);

export default StatisticsCard; 