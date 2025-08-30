export default (issuer: string) => {
  // TODO: get logo or fallback to initials

  return issuer
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
