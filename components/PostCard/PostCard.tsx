import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_AVATAR_IMAGE } from '@/constants';

type PostCardProps = {
  post: Post;
  className?: string;
};

const PostCard = ({ post, className }: PostCardProps) => {
  const { meta } = post;

  return (
    <Link
      href={`/blog/${meta.slug}`}
      className={cn(
        'group block bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 ease-in-out overflow-hidden',
        className,
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <Image
          src={
            meta.image ||
            'https://media.istockphoto.com/id/1049728354/photo/close-up-of-female-motorist-looking-at-parking-ticket.jpg?s=2048x2048&w=is&k=20&c=kSGNaHfcAvibAtPtIEoFqhYXo7r75gUiYmECEgUXCzI='
          }
          alt={meta.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-6 flex flex-col h-full">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {new Date(meta.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">
          {meta.title}
        </h2>
        <p className="mt-3 text-gray-600 dark:text-gray-300 text-base leading-relaxed">
          {meta.summary}
        </p>
        <footer className="mt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={meta.author.avatar || PLACEHOLDER_AVATAR_IMAGE}
                alt={meta.author.name}
              />
              <AvatarFallback>{meta.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100">
                {meta.author.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {meta.author.title}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {meta.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </footer>
      </div>
    </Link>
  );
};

export default PostCard;
