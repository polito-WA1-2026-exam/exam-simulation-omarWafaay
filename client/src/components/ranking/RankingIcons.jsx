/** Medal PNGs exported from assets/medal-*.svg */
import medalGoldImg from '../../assets/medal-gold.png';
import medalSilverImg from '../../assets/medal-silver.png';
import medalBronzeImg from '../../assets/medal-bronze.png';

const MEDAL_W = 28;
const MEDAL_H = 34;

function MedalImg({ src, title }) {
  return (
    <img
      src={src}
      className="ranking-icon ranking-medal"
      width={MEDAL_W}
      height={MEDAL_H}
      alt=""
      aria-hidden
      title={title}
    />
  );
}

export function RankPlace({ place }) {
  if (place === 1) {
    return (
      <span className="ranking-place" title="1st place">
        <MedalImg src={medalGoldImg} title="1st place" />
        <span className="sr-only">1st place</span>
      </span>
    );
  }
  if (place === 2) {
    return (
      <span className="ranking-place" title="2nd place">
        <MedalImg src={medalSilverImg} title="2nd place" />
        <span className="sr-only">2nd place</span>
      </span>
    );
  }
  if (place === 3) {
    return (
      <span className="ranking-place" title="3rd place">
        <MedalImg src={medalBronzeImg} title="3rd place" />
        <span className="sr-only">3rd place</span>
      </span>
    );
  }
  return <span className="ranking-place ranking-place-num">{place}</span>;
}
