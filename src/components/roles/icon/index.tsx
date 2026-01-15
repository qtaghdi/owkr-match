import React from 'react';

interface IconProps {
    className?: string;
    size?: number;
}

export const TankIcon = ({ className = "", size = 20 }: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M16 2.5C16 2.5 3.5 6.5 3.5 6.5C3.5 6.5 2 20 16 29.5C30 20 28.5 6.5 28.5 6.5C28.5 6.5 16 2.5 16 2.5Z" strokeWidth="0" />
    </svg>
);

export const DamageIcon = ({ className = "", size = 20 }: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M6 26L11 6H15.5L10.5 26H6Z" />
        <path d="M13.5 26L18.5 6H23L18 26H13.5Z" />
        <path d="M21 26L26 6H30.5L25.5 26H21Z" />
    </svg>
);

export const SupportIcon = ({ className = "", size = 20 }: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M13 5H19V13H27V19H19V27H13V19H5V13H13V5Z" />
    </svg>
);