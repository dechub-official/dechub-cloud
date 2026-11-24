// Hand-drawn 20px line icons, so the app doesn't depend on an icon library.
const paths: Record<string, React.ReactNode> = {
  dashboard: <><path d="M3 11h6V3H3zM11 17h6V9h-6zM3 17h6v-4H3zM11 7h6V3h-6z" /></>,
  leads: <><circle cx="8" cy="7" r="3" /><path d="M2.5 17a5.5 5.5 0 0 1 11 0" /><path d="M13.5 4.5a3 3 0 0 1 0 5M15 12.5a5 5 0 0 1 2.5 4.5" /></>,
  pipeline: <><rect x="2.5" y="3" width="4" height="14" rx="1" /><rect x="8" y="3" width="4" height="9" rx="1" /><rect x="13.5" y="3" width="4" height="6" rx="1" /></>,
  tasks: <><path d="M4 5.5l1.5 1.5L8 4.5M4 12l1.5 1.5L8 11" /><path d="M10.5 6h6M10.5 12.5h6" /></>,
  companies: <><path d="M3 17V5l6-2v14M9 17V8l8 2v7M2 17h16" /><path d="M5.5 7v.01M5.5 10v.01M5.5 13v.01M12 12v.01M14.5 12.5v.01" /></>,
  imports: <><path d="M10 3v10M6 9l4 4 4-4" /><path d="M3 14v2.5h14V14" /></>,
  settings: <><circle cx="10" cy="10" r="2.5" /><path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7" /></>,
  search: <><circle cx="9" cy="9" r="5.5" /><path d="M13 13l4 4" /></>,
  plus: <><path d="M10 4v12M4 10h12" /></>,
  close: <><path d="M5 5l10 10M15 5L5 15" /></>,
  chevronDown: <><path d="M5.5 8l4.5 4.5L14.5 8" /></>,
  chevronLeft: <><path d="M12 5l-5 5 5 5" /></>,
  chevronRight: <><path d="M8 5l5 5-5 5" /></>,
  clock: <><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2" /></>,
  bell: <><path d="M5 14V9a5 5 0 0 1 10 0v5l1.5 1.5h-13z" /><path d="M8.5 17.5a1.6 1.6 0 0 0 3 0" /></>,
  menu: <><path d="M3.5 6h13M3.5 10h13M3.5 14h13" /></>,
  grid: <><rect x="3" y="3" width="5" height="5" rx="1" /><rect x="12" y="3" width="5" height="5" rx="1" /><rect x="3" y="12" width="5" height="5" rx="1" /><rect x="12" y="12" width="5" height="5" rx="1" /></>,
  logout: <><path d="M8 4H4v12h4M12 6.5L15.5 10 12 13.5M15.5 10H8" /></>,
  phone: <><path d="M5 3h3l1.5 4-2 1.2a8 8 0 0 0 4.3 4.3L13 10.5l4 1.5v3a2 2 0 0 1-2 2A13 13 0 0 1 3 5a2 2 0 0 1 2-2z" /></>,
  mail: <><rect x="2.5" y="4.5" width="15" height="11" rx="1.5" /><path d="M3 5.5l7 5 7-5" /></>,
  note: <><path d="M4 3h9l3 3v11H4z" /><path d="M7 9h6M7 12h6M7 6h3" /></>,
  chat: <><path d="M3 15.5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6.5z" /></>,
  linkedin: <><rect x="3" y="3" width="14" height="14" rx="2" /><path d="M7 9v5M7 6.5v.01M10 14v-5M10 11a2 2 0 0 1 4 0v3" /></>,
  calendar: <><rect x="3" y="4.5" width="14" height="12.5" rx="1.5" /><path d="M3 8.5h14M7 2.5v4M13 2.5v4" /></>,
  check: <><path d="M4.5 10.5l3.5 3.5 7.5-8" /></>,
  arrowRight: <><path d="M4 10h12M11 5l5 5-5 5" /></>,
  trash: <><path d="M4 6h12M8 6V4h4v2M5.5 6l1 11h7l1-11" /></>,
  user: <><circle cx="10" cy="7" r="3.5" /><path d="M3.5 17.5a6.5 6.5 0 0 1 13 0" /></>,
  upload: <><path d="M10 13V3M6 7l4-4 4 4" /><path d="M3 14v2.5h14V14" /></>,
  key: <><circle cx="6.5" cy="13.5" r="3.5" /><path d="M9 11l7-7M14 6l2 2M12 8l1.5 1.5" /></>,
  copy: <><rect x="6.5" y="6.5" width="10" height="10" rx="1.5" /><path d="M13.5 6.5V3.5h-10v10h3" /></>,
  sparkle: <><path d="M10 2.5l1.6 4.4 4.4 1.6-4.4 1.6L10 14.5l-1.6-4.4L4 8.5l4.4-1.6z" /><path d="M15.5 13.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></>,
  filter: <><path d="M3 4.5h14l-5.5 6.5v5l-3 1.5v-6.5z" /></>,
  external: <><path d="M11 3.5h5.5V9M16.5 3.5L9 11M14 12v4.5H3.5V6H8" /></>,
};

export function Icon({ name, size = 18, className = '' }: { name: keyof typeof paths | string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] ?? null}
    </svg>
  );
}
