import type { VisualEditorV2PageId } from './schema';
export type VisualEditorV2Page = { id: VisualEditorV2PageId; path: string; label: string; labelHi: string };
export const VISUAL_EDITOR_V2_PAGES: readonly VisualEditorV2Page[] = [
  { id: 'home', path: '/', label: 'Home', labelHi: 'होम' },
  { id: 'classes', path: '/classes/', label: 'Classes 6–12', labelHi: 'कक्षाएँ 6–12' },
  { id: 'exams', path: '/all-exams/', label: 'All Exams', labelHi: 'सभी परीक्षाएँ' },
  { id: 'materials', path: '/study-materials/', label: 'Study Materials', labelHi: 'अध्ययन सामग्री' },
  { id: 'constitution', path: '/constitution/', label: 'Constitution', labelHi: 'संविधान' },
  { id: 'current-affairs', path: '/current-affairs/', label: 'Current Affairs', labelHi: 'करेंट अफेयर्स' },
  { id: 'about', path: '/about/', label: 'About Teacher', labelHi: 'शिक्षक परिचय' },
  { id: 'contact', path: '/contact/', label: 'Contact', labelHi: 'संपर्क' },
] as const;
