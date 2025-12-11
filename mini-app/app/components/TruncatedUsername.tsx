"use client";

import { useState, useRef, useLayoutEffect } from 'react';

interface TruncatedUsernameProps {
  username: string | null | undefined;
}

const TruncatedUsername: React.FC<TruncatedUsernameProps> = ({ username }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayText, setDisplayText] = useState(`@${username || ''}`);

  useLayoutEffect(() => {
    const checkOverflow = () => {
      const current = ref.current;
      if (current && username) {
        // Check if the content is wider than the container
        if (current.scrollWidth > current.clientWidth) {
          const start = username.slice(0, 10);
          const end = username.slice(-3);
          setDisplayText(`@${start}...${end}`);
        } else {
          // If it fits, make sure we're showing the full username
          setDisplayText(`@${username}`);
        }
      }
    };

    // Initial check
    checkOverflow();

    // Optional: Add a resize observer for responsive layouts if needed
    // For this use case, a single check on load should be sufficient
    // as the container size is determined by the sibling element's width.
    
  }, [username]);

  return (
    <span ref={ref} className="text-sm text-gray-500 ml-2 whitespace-nowrap overflow-hidden">
      {displayText}
    </span>
  );
};

export default TruncatedUsername;
