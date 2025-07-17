"use client";

import Image from 'next/image';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { User } from '@prisma/client';

// This flexible Profile type can handle data from both our database and dummy objects.
type Profile = Partial<User> & {
  avatar?: string;
};

interface CustomAvatarProps {
  profile?: Profile | null;
  className: string;
  width?: number;
  height?: number;
}

const CustomAvatar = ({ profile, className, width = 40, height = 40 }: CustomAvatarProps) => {
  const imageUrl = profile?.image || profile?.avatar;

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={profile?.name || 'User avatar'}
        className={className}
        width={width}
        height={height}
      />
    );
  }
  
  return <UserCircleIcon className={`${className} text-gray-500`} />;
};

export default CustomAvatar; 