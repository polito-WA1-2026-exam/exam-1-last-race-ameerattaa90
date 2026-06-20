function MetroMap({ network }) {
  const stationPositions = {
  "Stazione Centrale": {
    x: 110,
    y: 100,
    labelX: 110,
    labelY: 70,
    anchor: "middle",
  },
  "Porta Nuova": {
    x: 270,
    y: 100,
    labelX: 270,
    labelY: 70,
    anchor: "middle",
  },
  "Piazza Castello": {
    x: 440,
    y: 100,
    labelX: 440,
    labelY: 70,
    anchor: "middle",
  },
  "Mole Antonelliana": {
    x: 610,
    y: 100,
    labelX: 610,
    labelY: 70,
    anchor: "middle",
  },
  "Mercato Centrale": {
    x: 760,
    y: 100,
    labelX: 760,
    labelY: 70,
    anchor: "middle",
  },

  "Lingotto": {
    x: 270,
    y: 230,
    labelX: 270,
    labelY: 205,
    anchor: "middle",
  },
  "Parco Valentino": {
    x: 440,
    y: 230,
    labelX: 440,
    labelY: 205,
    anchor: "middle",
  },
  "Politecnico": {
    x: 610,
    y: 230,
    labelX: 610,
    labelY: 205,
    anchor: "middle",
  },
  "Museo Egizio": {
    x: 760,
    y: 230,
    labelX: 760,
    labelY: 205,
    anchor: "middle",
  },

  "Re Umberto": {
    x: 390,
    y: 360,
    labelX: 390,
    labelY: 400,
    anchor: "middle",
  },
  "Porta Susa": {
    x: 540,
    y: 360,
    labelX: 540,
    labelY: 400,
    anchor: "middle",
  },
  "Giardini Reali": {
    x: 760,
    y: 360,
    labelX: 760,
    labelY: 400,
    anchor: "middle",
  },
};


  function getLineColor(line) {
    const colorMap = {
      "Red Line": "#ef4444",
      "Blue Line": "#2563eb",
      "Green Line": "#16a34a",
      "Yellow Line": "#eab308",
      red: "#ef4444",
      blue: "#2563eb",
      green: "#16a34a",
      yellow: "#eab308",
    };

    return colorMap[line.color] || colorMap[line.name] || "#555";
  }

  function isInterchangeStation(stationName) {
    let count = 0;

    for (const line of network.lines) {
      if (line.stations.some((station) => station.name === stationName)) {
        count++;
      }
    }

    return count > 1;
  }

  return (
    <div className="metro-map-wrapper">
    <svg
  width="100%"
  height="340"
  viewBox="40 45 790 340"
  className="metro-map"
>
        {network.lines.map((line) =>
          line.stations.slice(0, -1).map((station, index) => {
            const nextStation = line.stations[index + 1];

            const p1 = stationPositions[station.name];
            const p2 = stationPositions[nextStation.name];

            if (!p1 || !p2) {
              return null;
            }

            return (
              <line
                key={`${line.id}-${station.id}-${nextStation.id}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={getLineColor(line)}
                strokeWidth="5"
                strokeLinecap="round"
              />
            );
          })
        )}

        {network.stations.map((station) => {
          const pos = stationPositions[station.name];

          if (!pos) {
            return null;
          }

          const interchange = isInterchangeStation(station.name);

          return (
            <g key={station.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={interchange ? 8 : 6}
                fill="white"
                stroke="#1f2933"
                strokeWidth={interchange ? 4 : 3}
              />

              <text
                x={pos.labelX}
                y={pos.labelY}
                textAnchor={pos.anchor}
                fontSize="11"
                fontWeight="650"
                fill="#1f2933"
                stroke="white"
                strokeWidth="5"
                paintOrder="stroke"
              >
                {station.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="metro-legend">
        {network.lines.map((line) => (
          <div key={line.id} className="metro-legend-item">
            <span
              className="metro-legend-color"
              style={{ backgroundColor: getLineColor(line) }}
            />
            <span>{line.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetroMap;