let video = null;
let history = [];
let redoStack = [];
let isUserAction = true;
let controlsContainer;

// Create buttons with YouTube-like styling
function createControls() {
  const container = document.createElement('div');
  container.className = 'ytp-chrome-controls';
  container.style.display = 'flex';
  container.style.gap = '8px';
  container.style.alignItems = 'center';

  const undoBtn = document.createElement('button');
  undoBtn.id = 'undoBtn';
  undoBtn.className = 'ytp-button';
  undoBtn.innerHTML = '↩ Undo';
  undoBtn.style.cssText = `
    font-size: 14px;
    padding: 5px 10px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: none;
    cursor: pointer;
    margin-right: 5px;
  `;

  const redoBtn = document.createElement('button');
  redoBtn.id = 'redoBtn';
  redoBtn.className = 'ytp-button';
  redoBtn.innerHTML = '↪ Redo';
  redoBtn.style.cssText = undoBtn.style.cssText;

  container.appendChild(undoBtn);
  container.appendChild(redoBtn);
  return container;
}

// Find YouTube's control bar and insert our buttons
function insertControls() {
  const targetLocations = [
    '#top-level-buttons-computed', // Near like/dislike buttons
    '.ytp-right-controls', // Near volume/fullscreen controls
    '.ytp-chrome-bottom .ytp-chrome-controls' // Main control bar
  ];

  for (const selector of targetLocations) {
    const target = document.querySelector(selector);
    if (target) {
      controlsContainer = createControls();
      target.parentNode.insertBefore(controlsContainer, target.nextSibling);
      return true;
    }
  }
  return false;
}

// MutationObserver to handle dynamic loading
const domObserver = new MutationObserver(() => {
  if (!controlsContainer || !document.contains(controlsContainer)) {
    insertControls();
  }
  if (!video || !document.contains(video)) {
    initVideo();
  }
});

// Initialize video and observers
function initVideo() {
  video = document.querySelector('video');
  if (video) {
    setupVideoListeners();
    video.addEventListener('loadedmetadata', () => {
      history = [video.currentTime];
      updateButtons();
    });
  }
}

// Setup video event listeners
function setupVideoListeners() {
  video.addEventListener('seeking', handleSeek);
  video.addEventListener('timeupdate', throttle(handleTimeUpdate, 1000));
}

// Handle seek events
function handleSeek() {
  if (isUserAction) {
    addToHistory(video.currentTime);
  }
}

// Handle time updates
function handleTimeUpdate() {
  if (isUserAction && history.length > 0) {
    const lastPosition = history[history.length - 1];
    if (Math.abs(lastPosition - video.currentTime) > 1) {
      addToHistory(video.currentTime);
    }
  }
}

// Add to history with threshold
function addToHistory(time) {
  if (history.length === 0 || Math.abs(history[history.length - 1] - time) > 0.5) {
    history.push(time);
    redoStack = [];
    updateButtons();
  }
}

// Update button states
function updateButtons() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn && redoBtn) {
    undoBtn.disabled = history.length <= 1;
    redoBtn.disabled = redoStack.length === 0;
  }
}

// Undo handler
document.addEventListener('click', (event) => {
  if (event.target.id === 'undoBtn') {
    if (history.length > 1) {
      redoStack.push(history.pop());
      isUserAction = false;
      video.currentTime = history[history.length - 1];
      setTimeout(() => isUserAction = true, 500);
      updateButtons();
    }
  }
});

// Redo handler
document.addEventListener('click', (event) => {
  if (event.target.id === 'redoBtn') {
    if (redoStack.length > 0) {
      const lastState = redoStack.pop();
      history.push(lastState);
      isUserAction = false;
      video.currentTime = lastState;
      setTimeout(() => isUserAction = true, 500);
      updateButtons();
    }
  }
});

// Throttle function
function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function() {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

// Initial setup
domObserver.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false
});
insertControls();
initVideo();