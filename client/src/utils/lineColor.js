/** Map seed line names to Mini Metro–style accent classes. */
export function lineColorClass(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('red')) return 'line-color-red';
  if (n.includes('blue')) return 'line-color-blue';
  if (n.includes('green')) return 'line-color-green';
  if (n.includes('yellow')) return 'line-color-yellow';
  return 'line-color-default';
}
