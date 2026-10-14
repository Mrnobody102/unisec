/** An open native select owns its keys before surrounding panels or map tools. */
export function isSelectPickerEvent(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const select = target.closest('select:not([multiple])');
  if (!select) return false;
  // Customizable selects dispatch keys from the focused option in the picker.
  if (target.closest('option')) return true;
  try {
    return select.matches(':open');
  } catch {
    // Older browsers cannot expose picker state. Leave their native select alone.
    return true;
  }
}
