import Image from 'next/image';
import cn from '@/utils/cn';
import { FileWithPreview } from '@/types';

type MediaPreviewProps = {
  files: FileWithPreview[];
  className?: string;
};

const MediaPreview = ({ files, className }: MediaPreviewProps) => {
  if (!files?.length) {
    return null;
  }

  return (
    <div
      className={cn({
        [className as string]: !!className,
      })}
    >
      {files?.length
        ? files.map((file) => {
            return (
              <Image
                width={200}
                height={200}
                className="object-cover w-full h-full"
                key={file.preview}
                src={file.preview}
                alt="upload preview"
              />
            );
          })
        : null}
    </div>
  );
};

export default MediaPreview;
