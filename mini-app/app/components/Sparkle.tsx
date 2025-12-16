"use client";

import React from 'react';

interface SparkleProps {
  style?: React.CSSProperties;
}

const Sparkle: React.FC<SparkleProps> = ({ style }) => {
  return (
    <div className="sparkle" style={style}>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 0L7.05333 4.94667L12 6L7.05333 7.05333L6 12L4.94667 7.05333L0 6L4.94667 4.94667L6 0Z"
          fill="#FF9D00"
          stroke="#FF9D00"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};

export default Sparkle;

