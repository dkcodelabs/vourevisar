import React from 'react';
import { BrandMark } from '@/components/brand/BrandLogo';
import { cn } from "@/lib/utils";

interface TracerLogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

export const TracerLogo = ({ className, ...props }: TracerLogoProps) => {
    return (
        <div className={cn("relative flex items-center justify-center text-foreground", className)}>
            <BrandMark motion="entrance" className="h-full w-full" {...props} />
        </div>
    );
};
