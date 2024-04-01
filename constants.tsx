/* eslint-disable import/prefer-default-export */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/pro-regular-svg-icons';

export const NAVIGATION_ITEMS = [
  {
    id: '1',
    label: 'Account',
    component: (
      <FontAwesomeIcon icon={faUser} size="xl" className="text-black" />
    ),
    href: '/account',
  },
];
