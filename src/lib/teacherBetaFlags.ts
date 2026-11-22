// Availability only. Every sensitive operation is independently enforced by SQL.
import {deriveTeacherBetaFlags} from './teacherBetaPolicy';
const flags=deriveTeacherBetaFlags(import.meta.env);
export const teacherBetaEnabled=flags.core;
export const teacherAdvancedEnabled=flags.advanced;
export const teacherAnalyticsEnabled=flags.analytics;
export const teacherResumeUiEnabled=flags.resumes;
export const teacherPhotoUiEnabled=flags.photos;
