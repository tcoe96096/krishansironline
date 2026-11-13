/**
 * Allowlisted route registry for the Admin Visual Website Editor.
 *
 * This registry is metadata only: it does not alter routing or render behavior.
 * Operational routes remain explicitly protected from visual editing.
 */

export type VisualEditorPageId =
  | 'home'
  | 'classes'
  | 'exams'
  | 'tests'
  | 'materials'
  | 'polity'
  | 'affairs'
  | 'results'
  | 'about'
  | 'contact'
  | 'studentDashboard'
  | 'admin'
  | 'adminPreview';

export type VisualEditorPageDefinition = {
  id: VisualEditorPageId;
  path: string;
  label: string;
  labelHi: string;
  editable: boolean;
  protectionReason?: string;
};

export const VISUAL_EDITOR_PAGES: readonly VisualEditorPageDefinition[] = [
  { id: 'home', path: '/', label: 'Home', labelHi: 'होम', editable: true },
  { id: 'classes', path: '/classes/', label: 'Classes 6–12', labelHi: 'कक्षा 6–12', editable: true },
  { id: 'exams', path: '/all-exams/', label: 'All Exams', labelHi: 'सभी परीक्षाएँ', editable: true },
  { id: 'tests', path: '/online-tests/', label: 'Online Tests', labelHi: 'ऑनलाइन टेस्ट', editable: false, protectionReason: 'Test engine, timer, attempt state and submission flow are protected.' },
  { id: 'materials', path: '/study-materials/', label: 'Study Materials', labelHi: 'अध्ययन सामग्री', editable: true },
  { id: 'polity', path: '/constitution/', label: 'Constitution', labelHi: 'संविधान', editable: true },
  { id: 'affairs', path: '/current-affairs/', label: 'Current Affairs', labelHi: 'करेंट अफेयर्स', editable: true },
  { id: 'results', path: '/results/', label: 'Results', labelHi: 'परिणाम', editable: false, protectionReason: 'Verified result records and student data are protected.' },
  { id: 'about', path: '/about/', label: 'About Teacher', labelHi: 'शिक्षक परिचय', editable: true },
  { id: 'contact', path: '/contact/', label: 'Contact', labelHi: 'संपर्क', editable: true },
  { id: 'studentDashboard', path: '/student-dashboard/', label: 'Student Dashboard', labelHi: 'विद्यार्थी डैशबोर्ड', editable: false, protectionReason: 'Authentication, student identity and learning progress are protected.' },
  { id: 'admin', path: '/admin/', label: 'Admin', labelHi: 'एडमिन', editable: false, protectionReason: 'Admin control center and authorization boundaries are protected.' },
  { id: 'adminPreview', path: '/admin-preview/', label: 'Admin Preview', labelHi: 'एडमिन प्रीव्यू', editable: false, protectionReason: 'Admin preview and operational controls are protected.' },
] as const;

export const getVisualEditorPage = (id: string): VisualEditorPageDefinition | undefined =>
  VISUAL_EDITOR_PAGES.find((page) => page.id === id);

export const getEditableVisualEditorPages = (): VisualEditorPageDefinition[] =>
  VISUAL_EDITOR_PAGES.filter((page) => page.editable);
