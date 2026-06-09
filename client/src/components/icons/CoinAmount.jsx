import CoinIcon from './CoinIcon.jsx';

/** Icon + numeric coin value (consistent across game UI). */
export default function CoinAmount({ value, size = 20, className = '' }) {
  return (
    <span className={`coin-amount ${className}`.trim()}>
      <CoinIcon size={size} />
      <span className="coin-amount-value">{value}</span>
    </span>
  );
}
