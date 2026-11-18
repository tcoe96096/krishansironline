export type TeacherPage = 'welcome' | 'register' | 'login' | 'dashboard' | 'admin';
const destinations: Record<TeacherPage, string> = {
  welcome: '', register: 'registration/', login: 'login/',
  dashboard: 'dashboard/', admin: 'admin/',
};

/** These are only UI routes; this function never authorizes database access. */
export function teacherPageFromPath(pathname: string, base: string): TeacherPage {
  const root = base.endsWith('/') ? base : base + '/';
  if (!pathname.startsWith(root)) return 'welcome';
  const route = pathname.slice(root.length).replace(/\/+$/, '');
  if (route === 'registration' || route === 'staff-workspace') return 'register';
  if (route === 'login') return 'login';
  if (route === 'dashboard') return 'dashboard';
  if (route === 'admin') return 'admin';
  return 'welcome';
}

export function teacherPagePath(page: TeacherPage, base: string): string {
  if (!base.startsWith('/') || base.startsWith('//') || /[?#\\]/.test(base)) {
    throw new Error('Invalid teacher preview base');
  }
  const root = base.endsWith('/') ? base : base + '/';
  return root + destinations[page];
}
