// src/components/MapPin.tsx
// WKF — Pin del mapa. Sin cambios en v1.010.

type MapPinProps = {
  size?: number;
  color?: string;
};

export default function MapPin({
  size = 40,
  color = '#00E56A',
}: MapPinProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="20" cy="16" r="11" stroke={color} strokeWidth="2" fill="#0A0A0A" />
      <circle cx="20" cy="16" r="3.5" fill={color} />
      <line x1="20" y1="3" x2="20" y2="6" stroke={color} strokeWidth="1.5" />
      <line x1="20" y1="26" x2="20" y2="29" stroke={color} strokeWidth="1.5" />
      <line x1="7" y1="16" x2="10" y2="16" stroke={color} strokeWidth="1.5" />
      <line x1="30" y1="16" x2="33" y2="16" stroke={color} strokeWidth="1.5" />
      <path d="M20 29 L17 34 L20 33 L23 34 Z" fill={color} />
    </svg>
  );
}