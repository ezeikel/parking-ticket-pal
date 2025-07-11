import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileText, faUpload } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';

type EmptyListProps = {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
};

const EmptyList = ({
  title,
  description,
  buttonText,
  buttonLink,
}: EmptyListProps) => (
  <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/10 min-h-[300px]">
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
      <FontAwesomeIcon
        icon={faFileText}
        size="lg"
        className="text-muted-foreground"
      />
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
    <Link href={buttonLink}>
      <Button className="flex items-center gap-2">
        <FontAwesomeIcon icon={faUpload} size="lg" />
        <span>{buttonText}</span>
      </Button>
    </Link>
  </div>
);

export default EmptyList;
