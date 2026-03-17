let appData = null;
let currentMonthKey = null;
let selectedDate = null;
let currentQuery = "";

const monthTabs = document.getElementById("monthTabs");
const calendarGrid = document.getElementById("calendarGrid");
const daySummary = document.getElementById("daySummary");
const eventList = document.getElementById("eventList");
const searchInput = document.getElementById("searchInput");

const fmtDate = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});

fetch("data.json")
  .then(r => {
    if (!r.ok) throw new Error("Could not load data.json");
    return r.json();
  })
  .then(data => {
    appData = data;

    const monthKeys = [...new Set(appData.days.map(d => d.date.slice(0, 7)))];
    currentMonthKey = monthKeys[0];

    const firstWithEvents = appData.days.find(d => d.venues && d.venues.length);
    selectedDate = firstWithEvents ? firstWithEvents.date : appData.days[0].date;

    renderTabs(monthKeys);
    renderCalendar();
    renderDetails();
  })
  .catch(err => {
    daySummary.innerHTML = `<h2>Could not load calendar</h2><p>${err.message}</p>`;
    eventList.innerHTML = "";
  });

searchInput.addEventListener("input", (e) => {
  currentQuery = e.target.value.trim().toLowerCase();
  renderCalendar();
  renderDetails();
});

function renderTabs(monthKeys) {
  monthTabs.innerHTML = "";

  monthKeys.forEach(key => {
    const [year, month] = key.split("-");
    const label = new Date(Number(year), Number(month) - 1, 1).toLocaleString("en-IN", {
      month: "long",
      year: "numeric"
    });

    const btn = document.createElement("button");
    btn.className = "month-tab" + (key === currentMonthKey ? " active" : "");
    btn.textContent = label;

    btn.addEventListener("click", () => {
      currentMonthKey = key;

      const monthDays = getMonthDays();
      if (!monthDays.some(d => d.date === selectedDate)) {
        selectedDate = monthDays[0]?.date || null;
      }

      renderTabs(monthKeys);
      renderCalendar();
      renderDetails();
    });

    monthTabs.appendChild(btn);
  });
}

function getMonthDays() {
  return appData.days.filter(d => d.date.startsWith(currentMonthKey));
}

function dayMatchesQuery(day) {
  if (!currentQuery) return true;

  const hay = [
    day.date,
    day.weekday,
    day.raw_text,
    ...(day.venues || []).map(v =>
      v.venue + " " + (v.events || []).map(e => `${e.time} ${e.title} ${e.access}`).join(" ")
    )
  ]
    .join(" ")
    .toLowerCase();

  return hay.includes(currentQuery);
}

function renderCalendar() {
  const monthDays = getMonthDays();
  calendarGrid.innerHTML = "";

  if (!monthDays.length) return;

  const firstDate = new Date(monthDays[0].date + "T00:00:00");
  const startOffset = firstDate.getDay();

  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement("div");
    empty.className = "day-cell empty";
    calendarGrid.appendChild(empty);
  }

  monthDays.forEach(day => {
    const matches = dayMatchesQuery(day);

    const el = document.createElement("button");
    el.className =
      "day-cell" +
      (day.venues?.length ? " has-events" : "") +
      (day.date === selectedDate ? " selected" : "") +
      (!matches ? " filtered-out" : "");

    el.innerHTML = `
      <div class="day-number">${day.day}</div>
      <div class="badge">${day.venues?.length || 0} event${(day.venues?.length || 0) === 1 ? "" : "s"}</div>
    `;

    el.addEventListener("click", () => {
      selectedDate = day.date;
      renderCalendar();
      renderDetails();
    });

    calendarGrid.appendChild(el);
  });
}

function renderDetails() {
  const day = appData.days.find(d => d.date === selectedDate);
  if (!day) return;

  const visibleVenues = (day.venues || []).filter(venue => {
    if (!currentQuery) return true;

    const hay = [
      venue.venue,
      ...(venue.events || []).map(e => `${e.time} ${e.title} ${e.access}`)
    ]
      .join(" ")
      .toLowerCase();

    return hay.includes(currentQuery);
  });

  daySummary.innerHTML = `
    <h2>${fmtDate.format(new Date(day.date + "T00:00:00"))}</h2>
    <p>${visibleVenues.length} venue${visibleVenues.length === 1 ? "" : "s"} listed</p>
  `;

  eventList.innerHTML = "";

  if (!visibleVenues.length) {
    eventList.innerHTML = `<div class="empty-state">No matching events for this day.</div>`;
    return;
  }

  visibleVenues.forEach(venue => {
    const card = document.getElementById("venueTemplate").content.firstElementChild.cloneNode(true);
    card.querySelector(".venue-name").textContent = venue.venue;

    const container = card.querySelector(".venue-events");

    (venue.events || []).forEach(evt => {
      const row = document.getElementById("eventTemplate").content.firstElementChild.cloneNode(true);
      row.querySelector(".event-time").textContent = evt.time || "Time TBA";
      row.querySelector(".event-title").textContent = evt.title || "";
      row.querySelector(".event-access").textContent = evt.access || "";
      container.appendChild(row);
    });

    eventList.appendChild(card);
  });
}
