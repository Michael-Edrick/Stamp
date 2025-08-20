"use client";

import { UserCircleIcon } from '@heroicons/react/24/solid';
import { User } from '@prisma/client';

// This flexible Profile type can handle data from both our database and external APIs.
type Profile = Partial<User> & {
  avatar?: string;
  pfp_url?: string;
};

interface CustomAvatarProps {
  profile?: Profile | null;
  className: string;
  width?: number;
  height?: number;
}

const CustomAvatar = ({ profile, className, width = 40, height = 40 }: CustomAvatarProps) => {
  const imageUrl = profile?.image || profile?.avatar || profile?.pfp_url;

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={profile?.name || 'User avatar'}
        className={className}
        width={width}
        height={height}
        style={{ objectFit: 'cover' }} // Ensures the image covers the area without distortion
      />
    );
  }
  
  return <UserCircleIcon className={`${className} text-gray-500`} />;
};

export default CustomAvatar; 