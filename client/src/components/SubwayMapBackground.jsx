// Light subway-map drawing behind the pages (decoration only).
export default function SubwayMapBackground() {
  return (
    <div className="map-bg">
      <svg className="map-svg" viewBox="0 0 1440 900">
        {/* metro lines */}
        <path
          d="M 60 320 H 380 L 480 420 H 780 L 900 520 H 1280"
          fill="none"
          stroke="#d62828"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 320 60 V 360 L 520 560 V 820 H 960"
          fill="none"
          stroke="#1d6ea5"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 100 640 L 340 480 L 520 480 L 720 300 L 1080 300 L 1240 180"
          fill="none"
          stroke="#2a9d6e"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 680 100 V 300 L 880 500 V 700 L 1180 700 H 1340"
          fill="none"
          stroke="#e9a319"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* stations */}
        <circle cx="320" cy="320" r="10" fill="white" stroke="#6b6b6b" strokeWidth="3" />
        <circle cx="480" cy="420" r="10" fill="white" stroke="#6b6b6b" strokeWidth="3" />
        <circle cx="780" cy="420" r="10" fill="white" stroke="#6b6b6b" strokeWidth="3" />
        <circle cx="900" cy="520" r="10" fill="white" stroke="#6b6b6b" strokeWidth="3" />
        <circle cx="520" cy="560" r="10" fill="white" stroke="#6b6b6b" strokeWidth="3" />
        <circle cx="340" cy="480" r="10" fill="white" stroke="#6b6b6b" strokeWidth="3" />
        <circle cx="720" cy="300" r="10" fill="white" stroke="#6b6b6b" strokeWidth="3" />
        <circle cx="880" cy="500" r="10" fill="white" stroke="#6b6b6b" strokeWidth="3" />
        <circle cx="1180" cy="700" r="10" fill="white" stroke="#6b6b6b" strokeWidth="3" />

        {/* bigger circles at line crossings */}
        <circle cx="320" cy="360" r="16" fill="none" stroke="#1a1a1a" strokeWidth="2" />
        <circle cx="320" cy="360" r="8" fill="white" stroke="#1a1a1a" strokeWidth="2" />
        <circle cx="680" cy="300" r="16" fill="none" stroke="#1a1a1a" strokeWidth="2" />
        <circle cx="680" cy="300" r="8" fill="white" stroke="#1a1a1a" strokeWidth="2" />
        <circle cx="520" cy="480" r="16" fill="none" stroke="#1a1a1a" strokeWidth="2" />
        <circle cx="520" cy="480" r="8" fill="white" stroke="#1a1a1a" strokeWidth="2" />
      </svg>
    </div>
  );
}
