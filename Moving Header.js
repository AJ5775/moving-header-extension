// --- CONFIG: change this to the worksheet name you want to read from ---
const WORKSHEET_NAME = "Sales Summary"; // <-- change to your worksheet name
const POLL_INTERVAL_MS = 30000; // fallback refresh

let worksheet = null;

function setMarqueeText(message) {
  const el = document.querySelector('#header .track');
  el.textContent = message;

  // Make animation speed proportional to length (so long text scrolls slower)
  const chars = Math.max(20, message.length);
  const durationSec = Math.max(6, chars * 0.09); // tune multiplier as needed
  el.style.animationDuration = `${durationSec}s`;
}

function buildMessageFromData(table) {
  // Minimal example: take first cell formatted value if available
  try {
    if (table && table.data && table.data.length > 0) {
      const firstCell = table.data[0][0];
      const val = firstCell && (firstCell.formattedValue || firstCell.value) || '';
      const now = new Date().toLocaleString();
      return `🚀 Current: ${val} · Updated: ${now} · Filter: ${WORKSHEET_NAME}`;
    }
    return "No data available";
  } catch (e) {
    return "Error reading data";
  }
}

function refreshHeader() {
  if (!worksheet) return;
  worksheet.getSummaryDataAsync().then(table => {
    const message = buildMessageFromData(table);
    setMarqueeText(message);
  }).catch(err => {
    console.error('getSummaryDataAsync error:', err);
    setMarqueeText('Error fetching data');
  });
}

function safeAddEventListeners(dashboard) {
  try {
    // Listen for filter changes on the worksheet (if the API supports it)
    if (worksheet && worksheet.addEventListener) {
      worksheet.addEventListener(tableau.TableauEventType.FilterChanged, () => {
        refreshHeader();
      });
    }

    // Listen for parameter changes at dashboard level (if available)
    if (dashboard && dashboard.addEventListener) {
      dashboard.addEventListener(tableau.TableauEventType.ParameterChanged, () => {
        refreshHeader();
      });
    }
  } catch (e) {
    // Some older Tableau versions may not support events in the same way — that's OK; we have polling fallback.
    console.warn('Could not register event listeners:', e);
  }
}

// Initialize the extension
tableau.extensions.initializeAsync().then(() => {
  const dashboard = tableau.extensions.dashboardContent.dashboard;
  worksheet = dashboard.worksheets.find(ws => ws.name === WORKSHEET_NAME);

  if (!worksheet) {
    setMarqueeText(`⚠︎ Worksheet not found: "${WORKSHEET_NAME}"`);
    return;
  }

  // initial fetch
  refreshHeader();

  // try to attach event listeners for filter/parameter changes
  safeAddEventListeners(dashboard);

  // fallback polling
  setInterval(refreshHeader, POLL_INTERVAL_MS);
}).catch(err => {
  console.error('Extension init failed', err);
  setMarqueeText('Extension initialization failed');
});
