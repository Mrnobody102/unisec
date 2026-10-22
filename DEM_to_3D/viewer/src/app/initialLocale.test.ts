import {expect, it} from 'vitest';
import {initialLocale} from './initialLocale';

it('opens the competition link in English despite a previous Vietnamese session', () => {
  expect(initialLocale('?lang=en', () => 'vi')).toBe('en');
});
it('accepts either explicit language even when browser storage is blocked', () => {
  const blocked = () => {throw new Error('Storage blocked');};
  expect(initialLocale('?lang=en', blocked)).toBe('en');
  expect(initialLocale('?lang=vi', blocked)).toBe('vi');
});
it('retains the existing preference and fallback for ordinary links', () => {
  expect(initialLocale('', () => 'en')).toBe('en');
  expect(initialLocale('?lang=unknown', () => 'en')).toBe('en');
  expect(initialLocale('', () => null)).toBe('en');
  expect(initialLocale('', () => 'vi')).toBe('vi');
  expect(initialLocale('', () => {throw new Error('Storage blocked');})).toBe('en');
});
