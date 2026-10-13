import type { UiIconName } from '../../../shared/ui/UiIcon';
import { vi } from './vi';
import { en } from './en';

export type GuideStep = { icon: UiIconName; title: string; text: string };
export type GuideTopic = {
  id: string;
  audience: 'manager' | 'resident';
  title: string;
  /** Screenshot under public/guide/, captured from the running app. */
  image: string;
  steps: GuideStep[];
};
export type GuideContent = {
  title: string;
  topicsLabel: string;
  close: string;
  fullImage: string;
  previous: string;
  next: string;
  stepOf: string;
  topics: GuideTopic[];
};

export const guideContent: Record<'vi' | 'en', GuideContent> = { vi, en };
