const formatPenniesToPounds = (pennies: number): string => {
  const pounds = pennies / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pounds);
};

export default formatPenniesToPounds;
