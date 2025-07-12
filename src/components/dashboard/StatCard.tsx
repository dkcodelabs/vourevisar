import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  className?: string;
  navigateTo?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor,
  iconColor,
  className,
  navigateTo
}) => {
  const navigate = useNavigate();

  const handleViewClick = () => {
    if (navigateTo) {
      navigate(navigateTo);
    }
  };

  return (
    <div className={`rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all duration-300 ${className || ''}`}
         style={{ backgroundColor: iconBgColor }}>
      <div className="flex flex-col h-full">
        {/* Icon hexagonal */}
        <div className="flex justify-start mb-4">
          <div className="relative">
            <div className="w-14 h-14 flex items-center justify-center rounded-lg"
                 style={{ backgroundColor: iconColor }}>
              <Icon size={28} className="text-white" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-900">{value}</span>
            </div>
            {subtitle && (
              <p className="text-sm text-gray-600 mb-4">{subtitle}</p>
            )}
          </div>

          {/* Button */}
          {navigateTo && (
            <Button 
              onClick={handleViewClick}
              variant="outline"
              size="sm"
              className="mt-auto bg-white/80 border-white/50 text-gray-700 hover:bg-white hover:text-gray-900"
            >
              Ver {title}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};