import React from "react";

export const Logo = ({
  size = 32,
  className,
  ...properties
}: React.SVGProps<SVGSVGElement> & { size?: number }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...properties}
    >
      {/* Background Circle */}
      <circle cx="16" cy="16" r="16" className="fill-primary" />

      {/* Left Petal */}
      <path
        d="M15.5 16C15.5 16 13 10 10 9C7 8 5 12 6.5 16C8 20 13 25 13 25L15.5 16Z"
        className="fill-background"
        style={{
          transformOrigin: "center",
          transform: "rotate(-10deg) translate(-1px, 1px)",
        }}
      />
      {/* Right Petal */}
      <path
        d="M16.5 16C16.5 16 19 10 22 9C25 8 27 12 25.5 16C24 20 19 25 19 25L16.5 16Z"
        className="fill-background"
        style={{
          transformOrigin: "center",
          transform: "rotate(10deg) translate(1px, 1px)",
        }}
      />

      {/* Refined Geometric V (Two semi-circles) */}
      <path
        d="M16 26.5L11.5 15.5C10.5 13 11 10.5 13 9.5C14.5 9 16 10 16.5 12L16 26.5Z"
        className="fill-background hidden"
      />
      {/* Let's try a simpler geometric V path based on the reference */}
      <path
        d="M15.2 24.5 L7.5 12 C6.5 10 7.5 8 9.5 7.5 C11.5 7 13.5 8 14.5 10 L16 22 L17.5 10 C18.5 8 20.5 7 22.5 7.5 C24.5 8 25.5 10 24.5 12 L16.8 24.5 Z"
        className="fill-background"
        style={{ display: "none" }} // Hiding this for now, using the paths below
      />

      {/* Final Shape: Two tilted semi-circles */}
      <path
        d="M15 23 L9 10 A 3.5 3.5 0 0 1 15 8 L15 23 Z"
        transform="rotate(-20 12 15)"
        className="fill-background"
      />
      <path
        d="M17 23 L23 10 A 3.5 3.5 0 0 0 17 8 L17 23 Z"
        transform="rotate(20 20 15)"
        className="fill-background"
      />
    </svg>
  );
};
