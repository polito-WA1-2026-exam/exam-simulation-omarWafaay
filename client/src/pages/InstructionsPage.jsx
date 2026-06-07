/** Public instructions — exam: anonymous users see rules only, no map. */
export default function InstructionsPage() {
  return (
    <div className="page instructions-page">
      <h1>How to play</h1>
      <p className="lead">
        Plan your route. Beat the clock. Beat your best score.
      </p>

      <ol className="instructions-list">
        <li>
          <strong>Setup</strong> — Study the full metro map (lines and connections).
        </li>
        <li>
          <strong>Planning</strong> — Connections disappear. You have 90 seconds to
          build a route from the assigned start to the destination using the segment
          list.
        </li>
        <li>
          <strong>Execution</strong> — Travel leg by leg; random events change your
          coins.
        </li>
        <li>
          <strong>Result</strong> — Your final score is the coins you still have.
        </li>
      </ol>

      <ul className="rules-list">
        <li>Each game starts with 20 coins.</li>
        <li>Events range from -4 to +4 coins.</li>
        <li>Line changes only at interchange stations.</li>
        <li>Each segment can be used at most once; stations may repeat.</li>
        <li>Invalid or incomplete routes score 0.</li>
        <li>Negative scores are shown as 0.</li>
      </ul>

      <p className="hint">Log in to play and view the ranking.</p>
    </div>
  );
}
