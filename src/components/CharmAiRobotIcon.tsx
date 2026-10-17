import React from "react";

interface CharmAiRobotIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  showBorder?: boolean;
}

export function CharmAiRobotIcon({
  className = "",
  size = 40,
  showBorder = true,
  ...props
}: CharmAiRobotIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Outer Blue Circle Ring if showBorder is true */}
      {showBorder && (
        <>
          <circle cx="100" cy="100" r="92" fill="#F8FAFC" />
          <circle
            cx="100"
            cy="100"
            r="88"
            stroke="#2563EB"
            strokeWidth="11"
            fill="#FFFFFF"
          />
        </>
      )}

      {/* Top Antenna */}
      <rect x="96" y="47" width="8" height="18" rx="4" fill="#334155" />
      <circle cx="100" cy="46" r="5" fill="#334155" />

      {/* Robot Arms (Curved) */}
      <path
        d="M66 93 C50 95 44 112 47 126"
        stroke="#475569"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M134 93 C150 95 156 112 153 126"
        stroke="#475569"
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* Floating Ball Hands */}
      <circle cx="46" cy="130" r="11" fill="#38BDF8" />
      <circle cx="154" cy="130" r="11" fill="#38BDF8" />

      {/* Neck Link */}
      <rect x="94" y="85" width="12" height="12" rx="3" fill="#334155" />

      {/* Head Outer Container */}
      <rect
        x="54"
        y="60"
        width="92"
        height="30"
        rx="10"
        fill="#F1F5F9"
        stroke="#64748B"
        strokeWidth="7"
      />
      {/* Head Screen (Ice Blue) */}
      <rect
        x="60"
        y="64"
        width="80"
        height="22"
        rx="7"
        fill="#93C5FD"
      />

      {/* Eyes */}
      {/* Left Eye */}
      <circle cx="83" cy="75" r="6" fill="#0F172A" />
      <circle cx="81.5" cy="73.5" r="2" fill="#FFFFFF" />

      {/* Right Eye */}
      <circle cx="117" cy="75" r="6" fill="#0F172A" />
      <circle cx="115.5" cy="73.5" r="2" fill="#FFFFFF" />

      {/* Body Frame */}
      <rect
        x="69"
        y="93"
        width="62"
        height="40"
        rx="9"
        fill="#F8FAFC"
        stroke="#64748B"
        strokeWidth="6"
      />

      {/* Chest Lines */}
      <rect x="79" y="102" width="42" height="4" rx="2" fill="#BFDBFE" />
      <rect x="79" y="110" width="42" height="4" rx="2" fill="#BFDBFE" />
      <rect x="79" y="118" width="42" height="4" rx="2" fill="#BFDBFE" />

      {/* Waist Connection */}
      <rect x="94" y="133" width="12" height="6" fill="#334155" />

      {/* Base Thruster / Pod (Blue) */}
      <path
        d="M74 139 C74 139 77 151 100 151 C123 151 126 139 126 139 Z"
        fill="#3B82F6"
      />

      {/* Bottom Thruster Nub */}
      <rect x="93" y="152" width="14" height="11" rx="5.5" fill="#334155" />
    </svg>
  );
}
