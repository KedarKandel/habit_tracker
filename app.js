
// === VARIABLE DEFINITIONS ===
// State management
let state = {
  habits: []
};

// Load saved state from localStorage
const savedState = localStorage.getItem('habitTrackerState');
if (savedState) {
  state = JSON.parse(savedState);
}

// DOM element references
const rows = document.getElementById('rows');

// Date utilities
function todayKey() {
  return new Date().toISOString().split('T')[0];
}

// Generate array of last 7 days including today
const weekKeys = (() => {
  const keys = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    keys.push(date.toISOString().split('T')[0]);
  }
  return keys;
})();

// Helper functions
function saveState(stateToSave) {
  localStorage.setItem('habitTrackerState', JSON.stringify(stateToSave));
}

function newHabit(name) {
  return {
    id: Date.now().toString(),
    name: name,
    log: {}
  };
}

function computeStreak(habit) {
  // Simple streak calculation - counts consecutive days from today backwards
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) { // Check up to a year back
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    
    if (habit.log[dateKey]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// render(): The master function that draws the entire UI from scratch
function render() {

  // innerHTML = "" clears all existing content to start fresh
  rows.innerHTML = ""; 
 
  // EMPTY STATE
  
  if (state.habits.length === 0) {
    const row = document.createElement("div");
    row.setAttribute("style", "display:grid;grid-template-columns:1.6fr repeat(7,.9fr) .8fr 1fr;align-items:center;border-bottom:1px solid #eef2f6;");
    
    // === COLUMN 1: Name - Friendly message ===
    const nameCol = document.createElement("div");
    nameCol.setAttribute("style", "padding:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;");
    nameCol.textContent = "No habits yet";
    row.appendChild(nameCol);
    
    //Empty day cells for alignment
  // col 2-8 here
    weekKeys.forEach(() => {
      const col = document.createElement("div");
      col.setAttribute("style", "padding:10px;text-align:center;");
      row.appendChild(col);
    });
    
    // COLUMN
    const streakCol = document.createElement("div");
    streakCol.setAttribute("style", "padding:10px;font-variant-numeric:tabular-nums;");
    streakCol.textContent = "0";
    row.appendChild(streakCol);
    
    // === COLUMN 10
    const actionsCol = document.createElement("div");
    actionsCol.setAttribute("style", "padding:10px;color:#66788a;");
    actionsCol.textContent = "Add a habit";
    row.appendChild(actionsCol);
    rows.appendChild(row);
    // directly return after append
    return;
  }

  // POPULATED STATE: a row per habit 
  state.habits.forEach(h => {
    // Create a new grid row for this habit
    const row = document.createElement("div");
    row.setAttribute("style", "display:grid;grid-template-columns:1.6fr repeat(7,.9fr) .8fr 1fr;align-items:center;border-bottom:1px solid #eef2f6;");

    //col 1: Habit Name 
    const nameCol = document.createElement("div");
    nameCol.setAttribute("style", "padding:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;");
    nameCol.textContent = h.name;
    row.appendChild(nameCol);

    //COLUMNS 2-8: Last 7 Days (D-6 to Today)
    weekKeys.forEach(k => {
      const col = document.createElement("div");
      col.setAttribute("style", "padding:10px;text-align:center;");
      const btn = document.createElement("button");
      btn.type = "button";
      // aria-label/ assessibility
      btn.setAttribute("aria-label", `${h.name} on ${k}`); 
      // role="checkbox" to toggle
      btn.setAttribute("role", "checkbox"); 

      // Check if this date is marked as completed in the habit's log
      // !! converts truthy/falsy to boolean
      const checked = !!h.log[k];
      // aria-checked: "true" or "false" for accessibility
      btn.setAttribute("aria-checked", String(checked)); 
      // "Yes" if checked, empty if not
      btn.textContent = checked ? "Yes" : ""; 
      btn.dataset.habitId = h.id;
      btn.dataset.dateKey = k;

      //Conditional styling/ternary operators: green background if checked
      btn.setAttribute(
        "style",
        "display:flex;align-items:center;justify-content:center;width:36px;height:36px;margin:auto;border-radius:8px;border:1px solid #dbe7f0;cursor:pointer;user-select:none;background:"+(checked?"#e9f8ef":"#fff")+";color:"+(checked?"#1e9e4a":"inherit")+";font-weight:"+(checked?"700":"400")+";"
      );

      // Click handler: to toggle
      btn.addEventListener("click", onToggleDay);
      btn.addEventListener("keydown", e => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault(); // stops page scroll when pressing Space
          btn.click();
        }
      });

      // Add button to column, column to row
      col.appendChild(btn);
      row.appendChild(col);
    });
    // computeStreak() counts consecutive completed days up to today
    
    const streakCol = document.createElement("div");
    streakCol.setAttribute("style", "padding:10px;font-variant-numeric:tabular-nums;");
    streakCol.textContent = String(computeStreak(h)); // convert to string
    row.appendChild(streakCol);

    // Action Buttons (mark completed or Delete)
    const actions = document.createElement("div");
    actions.setAttribute("style", "padding:10px;display:flex;gap:8px;flex-wrap:wrap;");

    //Tick Today: quickly mark today's date
    const tick = document.createElement("button");
    tick.type = "button";
    tick.textContent = "Tick today";
    tick.setAttribute("style", "background:#fff;border:1px solid #dbe7f0;color:#0b3b58;padding:6px 10px;border-radius:8px;cursor:pointer;");
    // todayKey() returns current date as string ( "2025-10-28")
    tick.addEventListener("click", () => toggleLog(h.id, todayKey()));

    // Delete: remove habit permanently after confirmation
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.setAttribute("style", "background:#fff;border:1px solid #f2c9cd;color:#c71f23;padding:6px 10px;border-radius:8px;cursor:pointer;");
    del.addEventListener("click", () => {
      // confirm() shows browser dialog with OK/Cancel
      if (confirm(`Delete habit "${h.name}"?`)) {
        // .filter()_>create new array except the matching id
        state.habits = state.habits.filter(x => x.id !== h.id);
        saveState(state); // updated state
        render(); // Re-render after deletion
      }
    });

    // Add buttons to actions container
    actions.appendChild(tick);
    actions.appendChild(del);
    // Add actions to row
    row.appendChild(actions);

    // Finally, add the completed row to the table body
    rows.appendChild(row);
  });
}


// EVENT HANDLING & STATE MUTATION ===
// handle user interactions and update the app state

function onToggleDay(e) {
  // e.currentTarget keeps track of current button
  const btn = e.currentTarget;
  // Read custom data 
  const habitId = btn.dataset.habitId;
  const dateKey = btn.dataset.dateKey;
  // ToggleLog to update state and re-render
  toggleLog(habitId, dateKey);
}

// toggleLog(): core function to log or un-log a day for a habit
// If date exists in log: remove it (uncheck)
// If not: add it with value true (check)
function toggleLog(habitId, dateKey) {
  // Find the habit object by ID
  const h = state.habits.find(x => x.id === habitId);
  if (!h) return; //if No match return

  if (h.log[dateKey]) {
    // delete removes the property: uncheck
    delete h.log[dateKey]; 
  } else {
    // Add property with value true: check
    h.log[dateKey] = true; 
  }

  // Persist the updated state to localStorage
  saveState(state); 
  // Redraw the entire UI with updated data
  render(); 
}

// 3. FORM HANDLING: Add new habits

document.getElementById("habit-form").addEventListener("submit", (e) => {
  // Prevent default form submission (page reload)
  e.preventDefault(); 
  //input field
  const input = document.getElementById("habit-name");
  // trim to remove whitespace
  const name = input.value.trim(); 
  if (!name) return; // return if empty value

  // newHabit(name): factory function that creates a habit object
  // Returns { id, name, log: {} }
  state.habits.push(newHabit(name));
  // Save updated state
  saveState(state);
  // Clear input field
  input.value = ""; 
  // Re-render to display newly added habit
  render(); 
});


// === 4. DATA MANAGEMENT: Export, Import, Reset ===

// === EXPORT/ save as a downloadable file
document.getElementById("export-json").addEventListener("click", () => {
  // JSON.stringify with formatting (null, 2)/ clearner format
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  // Create temporary download link
  const url = URL.createObjectURL(blob); 
  const a = document.createElement("a");
  a.href = url;
  a.download = "habits-export.json"; // Suggested filename
  a.click(); // Trigger download
  URL.revokeObjectURL(url); // Clean up memory
});

// === IMPORT: Load habits from uploaded JSON file ===
document.getElementById("import-json").addEventListener("change", async (e) => {
  const file = e.target.files?.[0]; 
  if (!file) return; // No file selected

  try {
    // Read file content as text
    const text = await file.text(); 
    // Parse JSON string to object
    const data = JSON.parse(text); 

    // Check if the file is an array of json objects
    if (!Array.isArray(data.habits)) throw new Error("Invalid format");

    // Replace current state with imported data
    state = data; 
    saveState(state);
    render();
    alert("Import complete. Data loaded.");
  } catch (err) {
    alert("Import failed. Please check the JSON file format.");
  }
  // Reset file input so same file can be selected again
  e.target.value = ""; 
});

// === RESET: Wipe all data after user confirmation ===
document.getElementById("reset-all").addEventListener("click", () => {
  // Double-check with user before deleting everything
  if (!confirm("Are you sure? This will permanently remove all habits and logs from this browser.")) return;

  // Reset to initial empty state
  state = { habits: [] }; 
  saveState(state);
  render();
  alert("All data reset.");
});


//Run the app(starts application)

render();