import type { SVGProps } from 'react'

const base = (d: React.ReactNode) => (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>{d}</svg>
)

export const IconPlay = base(<path d="M7 4v16l13-8L7 4Z" fill="currentColor" stroke="none" />)
export const IconPause = base(<><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></>)
export const IconStepBack = base(<><path d="M11 19V5l-9 7 9 7Z" fill="currentColor" stroke="none" /><rect x="13" y="5" width="2.4" height="14" rx="0.8" fill="currentColor" stroke="none" /></>)
export const IconStepFwd = base(<><path d="M13 5v14l9-7-9-7Z" fill="currentColor" stroke="none" /><rect x="8.6" y="5" width="2.4" height="14" rx="0.8" fill="currentColor" stroke="none" /></>)
export const IconRestart = base(<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>)
export const IconSwap = base(<><path d="m7 4 4 4-4 4" /><path d="M11 8H4" /><path d="m17 20-4-4 4-4" /><path d="M13 16h7" /></>)
export const IconDownload = base(<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>)
export const IconFlagMark = base(<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>)
export const IconClose = base(<><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>)
export const IconFilm = base(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" /></>)
export const IconShare = base(<><path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></>)
export const IconSpark = base(<path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2Z" fill="currentColor" stroke="none" />)
