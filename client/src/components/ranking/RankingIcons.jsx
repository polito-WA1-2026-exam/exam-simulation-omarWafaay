/** Medal icons for the ranking page (Mini Metro–style, flat). */
import CoinIcon from '../icons/CoinIcon.jsx';

export { CoinIcon };

const medalProps = {
  width: 28,
  height: 34,
  viewBox: '0 0 28 34',
  'aria-hidden': true,
};

function Medal({ ribbon, disc, stroke }) {
  return (
    <svg className="ranking-icon ranking-medal" {...medalProps}>
      <path d="M9 13 L7 32 L14 26 L14 13 Z" fill={ribbon} />
      <path d="M19 13 L21 32 L14 26 L14 13 Z" fill={ribbon} opacity="0.85" />
      <circle cx="14" cy="11" r="9" fill={disc} stroke={stroke} strokeWidth="1.5" />
      <circle cx="14" cy="11" r="6.5" fill="none" stroke={stroke} strokeWidth="0.75" opacity="0.45" />
    </svg>
  );
}

export function MedalGold() {
  return <Medal ribbon="#c9a227" disc="#f4d35e" stroke="#9a7b0a" />;
}

export function MedalSilver() {
  return <Medal ribbon="#8a939c" disc="#e8ecef" stroke="#6b7280" />;
}

export function MedalBronze() {
  return <Medal ribbon="#9a5c2e" disc="#d4a574" stroke="#7a4520" />;
}

export function RankPlace({ place }) {
  if (place === 1) {
    return (
      <span className="ranking-place" title="1st place">
        <MedalGold />
        <span className="sr-only">1st place</span>
      </span>
    );
  }
  if (place === 2) {
    return (
      <span className="ranking-place" title="2nd place">
        <MedalSilver />
        <span className="sr-only">2nd place</span>
      </span>
    );
  }
  if (place === 3) {
    return (
      <span className="ranking-place" title="3rd place">
        <MedalBronze />
        <span className="sr-only">3rd place</span>
      </span>
    );
  }
  return <span className="ranking-place ranking-place-num">{place}</span>;
}
