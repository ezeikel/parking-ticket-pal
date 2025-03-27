import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Upload } from 'lucide-react';

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
}: EmptyListProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/10 min-h-[300px]">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      <Link href={buttonLink}>
        <Button className="flex items-center gap-2">
          <Upload size={16} />
          <span>{buttonText}</span>
        </Button>
      </Link>
    </div>
  );
};

export default EmptyList;
