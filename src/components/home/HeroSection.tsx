import React from 'react';
import { ChevronRight } from 'lucide-react';
import { resolveAssetUrl } from '../../utils/media';

interface HeroSectionProps {
  titleOne?: string;
  titleTwo?: string;
  subTitle?: string;
  imageUrl?: string | null;
  imageAltText?: string | null;
  buttonOne?: { label: string; href: string } | null;
  buttonTwo?: { label: string; href: string } | null;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  titleOne,
  titleTwo,
  subTitle,
  imageUrl,
  imageAltText,
  buttonOne,
  buttonTwo,
}) => {
  const resolvedImageUrl = resolveAssetUrl(imageUrl);
  return (
    <section className="relative w-full h-[540px] sm:h-[620px] lg:h-[700px] overflow-hidden select-none bg-[#1A1A1A]">
      {resolvedImageUrl && (
        <div className="absolute inset-0">
          <img
            src={resolvedImageUrl}
            alt={imageAltText ?? ''}
            className="w-full h-full object-cover object-center"
          />
        {/* Dark Vignette / Contrast Scrim for Pristine Legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
        </div>
      )}

      <div className="relative max-w-[1440px] mx-auto h-full px-4 sm:px-6 lg:px-12 flex flex-col justify-center">
        <div className="max-w-xl z-20 space-y-5">
          {(titleOne || titleTwo) && (
            <div className="space-y-1">
              {titleOne && (
                <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-wider leading-[0.95] drop-shadow-md">
                  {titleOne}
                </h1>
              )}
              {titleTwo && (
                <div className="font-script text-4xl sm:text-6xl lg:text-7xl text-[#FFDE6B] tracking-wide leading-[1.05] drop-shadow-lg">
                  {titleTwo}
                </div>
              )}
            </div>
          )}

          {subTitle && (
            <p className="text-sm sm:text-base text-gray-200 font-medium leading-relaxed max-w-lg drop-shadow">
              {subTitle}
            </p>
          )}

          {(buttonOne || buttonTwo) && (
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              {buttonOne && (
                <a
                  href={buttonOne.href}
                  className="inline-flex items-center gap-2 bg-[#FFD200] hover:bg-[#F2C400] text-[#1A1A1A] font-bold text-xs sm:text-sm px-6 py-3.5 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>{buttonOne.label}</span>
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </a>
              )}
              {buttonTwo && (
                <a
                  href={buttonTwo.href}
                  className="inline-flex items-center gap-2 bg-black/40 hover:bg-black/60 border border-white/60 hover:border-white text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-full backdrop-blur-sm transition-all duration-200 shadow-md hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>{buttonTwo.label}</span>
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
