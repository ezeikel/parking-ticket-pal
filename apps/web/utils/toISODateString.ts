export default (inputDate: string | Date): string => {
  if (inputDate instanceof Date) {
    return inputDate.toISOString();
  }

  // create a new variable to hold the date string
  let datestring = inputDate;

  // check if the string already has a time component using a regex
  const hasTime = /\d{2}:\d{2}:\d{2}/.test(datestring);

  // if no time is included, append midnight UTC ('T00:00:00Z')
  if (!hasTime) {
    console.warn('No time provided. Defaulting to midnight UTC.');
    datestring += 'T00:00:00Z';
  }

  const parsedDate = new Date(datestring);

  // check for an invalid date
  if (Number.isNaN(parsedDate.getTime())) {
    console.error(`Invalid date: ${datestring}`);
    throw new Error(`Invalid date: ${datestring}`);
  }

  return parsedDate.toISOString();
};
