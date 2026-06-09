import { useState } from 'react';
import CoinAmount from '../icons/CoinAmount.jsx';
import CoinIcon from '../icons/CoinIcon.jsx';

/** Show server steps one at a time — events already applied on the server. */
export default function ExecutionPhase({ steps, startCoins = 20, onFinish }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index >= steps.length - 1;

  if (!steps?.length || !step) {
    return <p className="page-message">No steps to display.</p>;
  }

  function handleNext() {
    if (isLast) {
      onFinish();
    } else {
      setIndex((i) => i + 1);
    }
  }

  const coinsBefore = index === 0 ? startCoins : steps[index - 1].coinsAfter;
  const effect = step.event.effect;
  const sign = effect >= 0 ? '+' : '−';

  return (
    <div className="game-phase execution-phase">
      <h2>
        Step {step.order} / {steps.length}
      </h2>
      <p className="leg-label">
        {step.from} → {step.to}
      </p>

      <div className="event-card">
        <p className="event-desc">{step.event.description}</p>
        <p className="event-effect">
          <span className="coin-amount coin-amount-inline">
            {sign}
            <CoinIcon size={18} />
            <span className="coin-amount-value">{Math.abs(effect)}</span>
          </span>
        </p>
      </div>

      <p className="coins-math">
        <CoinAmount value={coinsBefore} size={18} />
        <span className="coins-math-op">
          {' '}
          {sign} {Math.abs(effect)} =
        </span>
        <CoinAmount value={step.coinsAfter} size={18} className="coins-math-result" />
      </p>
      <p className="coins-total">
        Current total: <CoinAmount value={step.coinsAfter} size={22} className="coins-total-amount" />
      </p>

      <ul className="route-progress">
        {steps.map((s, i) => (
          <li
            key={s.order}
            className={
              i < index ? 'done' : i === index ? 'current' : 'pending'
            }
          >
            {s.from} → {s.to}
            {i <= index ? (
              <span className="route-progress-coins">
                <CoinAmount value={s.coinsAfter} size={16} />
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <button type="button" className="btn-primary" onClick={handleNext}>
        {isLast ? 'See result' : 'Next step'}
      </button>
    </div>
  );
}
