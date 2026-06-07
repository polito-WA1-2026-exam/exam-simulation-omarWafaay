/** Static rule list — exam facts only, no API data. */
export default function GameRules() {
  return (
    <aside className="rules-sidebar" aria-label="Game rules">
      <h2>Quick rules</h2>
      <ul className="rules-list">
        <li>You start each game with <strong>20 coins</strong>.</li>
        <li>Random events change coins by <strong>-4 to +4</strong>.</li>
        <li>Change lines only at <strong>interchange</strong> stations.</li>
        <li>Each segment at most <strong>once</strong>; stations may repeat.</li>
        <li>Incomplete or invalid routes score <strong>0</strong>.</li>
        <li>Negative totals are shown and stored as <strong>0</strong>.</li>
        <li>Registered users can play many games; best score appears in ranking.</li>
      </ul>
    </aside>
  );
}
