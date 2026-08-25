import { TabKey } from './models';

/**
 * The five destinations in the bottom bar.
 *
 * Nine tabs do not fit across a phone, so related ones share a slot and a segmented control
 * inside the page picks between them. The grouping is by how often a screen is opened, not
 * by what it technically is: Workout and Diet sit together in Body because they are the two
 * screens opened daily, and burying either one two taps deep was the whole problem with the
 * dropdown this replaces.
 *
 * `icon` is an SVG path drawn on a 24×24 grid, stroked with currentColor so the active
 * state costs nothing extra.
 */
export interface NavSection {
  key: string;
  label: string;
  /** First entry is where the slot lands when nothing in it has been opened yet. */
  tabs: TabKey[];
  icon: string;
  /** The centre slot is the assistant, drawn as the accented action rather than a tab. */
  primary?: boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'today',
    label: 'Today',
    tabs: ['dashboard'],
    icon: 'M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5',
  },
  {
    key: 'plan',
    label: 'Plan',
    tabs: ['growth', 'tasks', 'notes'],
    icon: 'M7 3v3M17 3v3M4 8.5h16M5 5.5h14a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1ZM8 12.5h3M8 16.5h6',
  },
  {
    key: 'echo',
    label: 'ECHO',
    tabs: ['chat'],
    primary: true,
    icon: 'M4 12h2l2-5 2.5 10L13.5 5l2 7H20',
  },
  {
    key: 'body',
    label: 'Body',
    tabs: ['workout', 'diet'],
    icon: 'M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10',
  },
  {
    key: 'profile',
    label: 'Profile',
    tabs: ['settings', 'news'],
    icon: 'M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 20c0-3.4 3.1-5.5 7-5.5s7 2.1 7 5.5',
  },
];

/** Which slot a tab belongs to, or undefined for a tab reachable only from the sidebar. */
export function sectionForTab(tab: TabKey): NavSection | undefined {
  return NAV_SECTIONS.find(s => s.tabs.includes(tab));
}
