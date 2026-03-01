export default (issuer: string | null | undefined) => {
  // TODO: get logo or fallback to initials
  if (!issuer) return '??';

  return issuer
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
