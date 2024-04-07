/* eslint-disable import/prefer-default-export */
import { ParseTicketInfo } from '@/types';

// extended type for parsing with an index signature
type ParseTicketInfoExtended = Partial<ParseTicketInfo> & {
  [key: string]: string | number;
};

export const parseTicketInfo = (ticketInfo: string): ParseTicketInfo => {
  const lines = ticketInfo.split('\n');
  const ticketData: ParseTicketInfoExtended = {};

  lines.forEach((line) => {
    const [key, value] = line.split(':').map((s) => s.trim());
    if (key && value) {
      // direct assignment with dynamic keys
      ticketData[key.replace(/ /g, '')] = Number.isNaN(Number(value))
        ? value
        : Number(value);
    }
  });

  // validate or transform ticketData back to ParseTicketInfo before returning
  return ticketData as ParseTicketInfo;
};
