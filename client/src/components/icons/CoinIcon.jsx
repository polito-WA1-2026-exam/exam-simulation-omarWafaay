import coinImg from '../../assets/coin.png';

/** Gold coin — PNG exported from assets/coin.svg */
export default function CoinIcon({ size = 20, className = '' }) {
  return (
    <img
      src={coinImg}
      className={`coin-icon ${className}`.trim()}
      width={size}
      height={size}
      alt=""
      aria-hidden
    />
  );
}
