import {
  faExclamationCircle,
  faCheckCircle,
} from '@fortawesome/pro-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { VerificationStatus } from '@parking-ticket-pal/db';

type VerifiedBadgeProps = {
  status: VerificationStatus;
};

const VerifiedBadge = ({ status }: VerifiedBadgeProps) => {
  if (status === VerificationStatus.VERIFIED) {
    return (
      <FontAwesomeIcon
        icon={faCheckCircle}
        className="h-6 w-6 text-green-500"
        title="Vehicle verified"
      />
    );
  }

  return (
    <FontAwesomeIcon
      icon={faExclamationCircle}
      className="h-6 w-6 text-red-500"
      title="Vehicle verification failed"
    />
  );
};

export default VerifiedBadge;
