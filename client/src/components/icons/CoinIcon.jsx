/** Gold coin — used in ranking, execution, and result. */
export default function CoinIcon({ size = 20, className = '' }) {
  return (
    <svg
      className={`coin-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden
    >
      <circle cx="10" cy="10" r="8.5" fill="#f4d35e" stroke="#c9a227" strokeWidth="1.25" />
      <circle cx="10" cy="10" r="6" fill="none" stroke="#c9a227" strokeWidth="0.75" opacity="0.5" />
      <path
        d="M10 5.5 v9 M7.25 7.5 h5.5 M7.25 12.5 h5.5"
        stroke="#9a7b0a"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}
