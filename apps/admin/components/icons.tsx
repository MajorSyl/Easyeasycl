// Small inline-SVG line icons, sized to inherit color via currentColor. Kept
// hand-rolled rather than pulling in an icon library — this is the only
// place icons are used across the admin dashboard, so a whole dependency for
// a dozen glyphs isn't worth it.
type IconProps = { size?: number; strokeWidth?: number };

function base(children: React.ReactNode, { size = 18, strokeWidth = 1.8 }: IconProps = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export const IconGrid = (p: IconProps) => base(<><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></>, p);
export const IconHome = (p: IconProps) => base(<><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1H9v-5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V20h2.5a1 1 0 0 0 1-1v-9" /></>, p);
export const IconUsers = (p: IconProps) => base(<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 20c.1-2.6 1.6-4.5 3.5-4.9" /></>, p);
export const IconCard = (p: IconProps) => base(<><rect x="2.5" y="5.5" width="19" height="13" rx="2" /><path d="M2.5 10h19" /><path d="M6 14.5h4" /></>, p);
export const IconFlag = (p: IconProps) => base(<><path d="M5 21V4" /><path d="M5 4.5s1.5-1.2 3.5-1.2 3 1.4 5 1.4 3.5-1.2 3.5-1.2v9s-1.5 1.2-3.5 1.2-3-1.4-5-1.4-3.5 1.2-3.5 1.2" /></>, p);
export const IconUserCheck = (p: IconProps) => base(<><circle cx="9.5" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 3-6.2 7-6.2s7 2.6 7 6.2" /><path d="M16.5 10.5l2 2 3.5-4" /></>, p);
export const IconGear = (p: IconProps) => base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.4.7a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.3a7.6 7.6 0 0 0-2.6 1.5l-2.4-.7-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.4-.7c.75.66 1.63 1.17 2.6 1.5L10 22h4l.4-2.3a7.6 7.6 0 0 0 2.6-1.5l2.4.7 2-3.4-2-1.5Z" /></>, p);
export const IconSearch = (p: IconProps) => base(<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></>, p);
export const IconBell = (p: IconProps) => base(<><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>, p);
export const IconCheck = (p: IconProps) => base(<path d="M4 12.5 9.5 18 20 6" />, p);
export const IconX = (p: IconProps) => base(<><path d="M5 5l14 14" /><path d="M19 5 5 19" /></>, p);
export const IconExternalLink = (p: IconProps) => base(<><path d="M9 6H5.5A1.5 1.5 0 0 0 4 7.5v11A1.5 1.5 0 0 0 5.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" /><path d="M14 4h6v6" /><path d="M20 4 11 13" /></>, p);
export const IconPin = (p: IconProps) => base(<><path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" /></>, p);
export const IconChevronRight = (p: IconProps) => base(<path d="M9 5l7 7-7 7" />, p);
