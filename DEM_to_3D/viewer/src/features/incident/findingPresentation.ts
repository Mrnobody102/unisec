/** Keep extra detail, but do not repeat a finding that only restates the title
 * (same words, at most two added, e.g. "gần Khau Mang" vs "gần đường vào Khau Mang"). */
export function findingAddsDetail(title: string, finding: string): boolean {
  const words = (text: string) => text.normalize('NFC').toLocaleLowerCase().replace(/[.,;:!?()]/g, ' ').split(/\s+/).filter(Boolean);
  const titleWords = words(title), findingWords = words(finding);
  const covered = titleWords.every(word => findingWords.includes(word));
  return !(covered && findingWords.length - titleWords.length <= 2);
}
