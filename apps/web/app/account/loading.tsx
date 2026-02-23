import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-solid-svg-icons';

const AccountLoading = () => (
  <div className="min-h-screen bg-light flex items-center justify-center">
    <FontAwesomeIcon
      icon={faSpinnerThird}
      className="h-8 w-8 animate-spin text-teal"
    />
  </div>
);

export default AccountLoading;
