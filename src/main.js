const { invoke } = window.__TAURI__.core;
let timerInterval = null;
let breakInterval = null; // Timer for the break period
let remainingTime = 0;
let breakTimeRemaining = 0; // Tracks remaining break time
let isRunning = false;
let isOnBreak = false; // Flag to track if user is on break
let notificationsEnabled = true;
let soundEnabled = true;
let currentAudio = null; // Track the currently playing audio

// Break duration in seconds (default: 3 minutes)
// You can change this value: 120 = 2min, 180 = 3min, 300 = 5min
const BREAK_DURATION = 180; // 3 minutes break

// ========================================
// MESSAGES AND AUDIO CONFIGURATION
// ========================================

// Text messages shown in the modal popup
// Each message corresponds to an audio file below
const messages = [
  "Time for a break! Stand up and stretch your legs.", // Message 0
  "Break time! Give your eyes a rest from the screen.", // Message 1
  "Take a breather! Walk around for a few minutes.", // Message 2
  "Reminder: Hydrate and take a quick break!", // Message 3
  "Time to pause! Stretch and refresh your mind.", // Message 4
  "Break reminder! Step away and relax for a moment.", // Message 5
];

// Audio file URLs - each one matches a message above
// When a notification shows, a random message + its audio will play
const audioUrls = [
  "audio/break1.mp3", // Plays for message 0: "Time for a break! Stand up and stretch..."
  "audio/break2.mp3", // Plays for message 1: "Break time! Give your eyes a rest..."
  "audio/break3.mp3", // Plays for message 2: "Take a breather! Walk around..."
  "audio/break4.mp3", // Plays for message 3: "Reminder: It's time to hydrate..."
  "audio/break5.mp3", // Plays for message 4: "Time to pause! Stretch your arms..."
  "audio/break6.mp3", // Plays for message 5: "Break reminder! Step away from your desk..."
];

// ========================================
// NOTIFICATION OF WINDOW CLOSE
// ========================================
window.__TAURI__.event.listen("window-hidden", () => {
  const { sendNotification } = window.__TAURI__.notification;
  sendNotification({
    title: "Pulse Break",
    body: 'Minimized to the system tray. Left click the tray icon or choose "Open Pulse Break" to reopen.',
  });
});
// ========================================
// PRESET BUTTON HANDLERS
// ========================================

// Handle clicks on preset time buttons (20min, 30min, etc.)
document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    // Remove 'active' class from all preset buttons
    document
      .querySelectorAll(".preset-btn")
      .forEach((b) => b.classList.remove("active"));

    // Add 'active' class to the clicked button
    this.classList.add("active");

    // Get the minutes value from the button's data attribute
    const minutes = parseInt(this.dataset.minutes);

    // Update the custom time inputs to match the preset
    document.getElementById("hours").value = Math.floor(minutes / 60);
    document.getElementById("minutes").value = minutes % 60;
    document.getElementById("seconds").value = 0;
  });
});

// ========================================
// CUSTOM TIME INPUT HANDLERS
// ========================================

// When user manually changes hours, minutes, or seconds
// Remove the 'active' state from preset buttons
["hours", "minutes", "seconds"].forEach((id) => {
  document.getElementById(id).addEventListener("input", function () {
    document
      .querySelectorAll(".preset-btn")
      .forEach((b) => b.classList.remove("active"));
  });
});

// ========================================
// TOGGLE OPTIONS (Notifications & Sound)
// ========================================

function toggleOption(option) {
  const toggle = document.getElementById(`toggle-${option}`);
  toggle.classList.toggle("active");

  if (option === "notifications") {
    notificationsEnabled = toggle.classList.contains("active");
  } else if (option === "sound") {
    soundEnabled = toggle.classList.contains("active");
  }
}

// ========================================
// START/STOP TIMER CONTROL
// ========================================

function toggleTimer() {
  if (isRunning) {
    stopTimer(); // Stop if already running
  } else {
    startTimer(); // Start if not running
  }
}

function startTimer() {
  // Clear any existing timers to avoid duplicates
  clearInterval(timerInterval);
  clearInterval(breakInterval);

  // Get values from the time input fields
  const hours = parseInt(document.getElementById("hours").value) || 0;
  const minutes = parseInt(document.getElementById("minutes").value) || 0;
  const seconds = parseInt(document.getElementById("seconds").value) || 0;

  // Calculate total time in seconds
  remainingTime = hours * 3600 + minutes * 60 + seconds;

  // Validate that user set a time
  if (remainingTime === 0) {
    alert("Please set a time interval!");
    return;
  }

  // Update UI to show timer is running
  isRunning = true;
  isOnBreak = false;
  document.getElementById("startBtn").textContent = "Stop Reminder";
  document.getElementById("startBtn").classList.add("active");
  document.getElementById("status").classList.add("active");

  // Show initial countdown
  updateCountdown();

  // Start the work timer - counts down every second
  timerInterval = setInterval(() => {
    remainingTime--;

    // When work time reaches zero, start break
    if (remainingTime <= 0) {
      startBreakTime(); // Trigger break period
    }

    updateCountdown(); // Update the display
  }, 1000);
}

// ========================================
// BREAK TIME MANAGEMENT
// ========================================

function startBreakTime() {
  // Avoid starting multiple break timers / playing audio multiple times
  if (isOnBreak) return;

  // Stop the work timer so startBreakTime isn't called repeatedly
  clearInterval(timerInterval);

  // Set flag to indicate we're on break
  isOnBreak = true;

  // Set break duration
  breakTimeRemaining = BREAK_DURATION;

  // Show the notification with random message and audio
  showNotification();

  // Update status text to show it's break time
  document.querySelector(".status-text").textContent =
    "Break time! Resuming in:";

  // Start break countdown timer
  breakInterval = setInterval(() => {
    breakTimeRemaining--;

    // Update countdown display to show break time
    updateBreakCountdown();

    // When break is over, resume work timer
    if (breakTimeRemaining <= 0) {
      // Clear this interval here and perform end-of-break actions
      clearInterval(breakInterval);
      endBreakTime();
    }
  }, 1000);
}

function endBreakTime() {
  // Ensure break interval is cleared
  clearInterval(breakInterval);

  // Reset flags
  isOnBreak = false;

  // Get the original work duration from inputs
  const hours = parseInt(document.getElementById("hours").value) || 0;
  const minutes = parseInt(document.getElementById("minutes").value) || 0;
  const seconds = parseInt(document.getElementById("seconds").value) || 0;

  // Reset work timer to original duration
  remainingTime = hours * 3600 + minutes * 60 + seconds;

  // Update status text back to work mode
  document.querySelector(".status-text").textContent = "Next break in:";

  // Restart the work timer so the cycle continues
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remainingTime--;

    if (remainingTime <= 0) {
      startBreakTime();
    }

    updateCountdown();
  }, 1000);
}

function stopTimer() {
  // Stop all timers
  isRunning = false;
  isOnBreak = false;
  clearInterval(timerInterval);
  clearInterval(breakInterval);

  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  // Reset UI
  document.getElementById("startBtn").textContent = "Start Reminder";
  document.getElementById("startBtn").classList.remove("active");
  document.getElementById("status").classList.remove("active");
  document.querySelector(".status-text").textContent = "Next break in:";
}

// ========================================
// COUNTDOWN DISPLAY UPDATES
// ========================================

function updateCountdown() {
  // If on break, show break countdown instead
  if (isOnBreak) {
    updateBreakCountdown();
    return;
  }

  // Calculate hours, minutes, seconds from remaining time
  const hours = Math.floor(remainingTime / 3600);
  const minutes = Math.floor((remainingTime % 3600) / 60);
  const seconds = remainingTime % 60;

  // Format and display as HH:MM:SS
  document.getElementById("countdown").textContent = `${String(hours).padStart(
    2,
    "0",
  )}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateBreakCountdown() {
  // Calculate minutes and seconds from break time
  const minutes = Math.floor(breakTimeRemaining / 60);
  const seconds = breakTimeRemaining % 60;

  // Format and display break time as MM:SS
  document.getElementById("countdown").textContent = `${String(
    minutes,
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ========================================
// NOTIFICATION SYSTEM
// ========================================

function showNotification() {
  // Stop any currently playing audio first
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  // Pick a random message and its corresponding audio
  // This ensures the SAME index is used for both message and audio
  const randomIndex = Math.floor(Math.random() * messages.length);
  const message = messages[randomIndex];

  // Show the modal popup with the selected message
  document.getElementById("modal").classList.add("show");
  document.querySelector(".modal-message").textContent = message;

  // Play the corresponding audio if sound is enabled
  // We pass the SAME randomIndex so the audio matches the message
  if (soundEnabled) {
    playSound(randomIndex); // Pass the index to play matching audio
  }

  if (notificationsEnabled) {
    const { sendNotification } = window.__TAURI__.notification;
    sendNotification({
      title: "Time to take a break! ⏰",
      body: message,
    });
  }
}

function dismissNotification() {
  // Close the modal when user clicks "Got it!"
  document.getElementById("modal").classList.remove("show");

  // Stop the audio when dismissing notification
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

// ========================================
// AUDIO PLAYBACK SYSTEM
// ========================================

function playSound(index) {
  // Exit if sound is disabled
  if (!soundEnabled) return;

  // Stop any currently playing audio first
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  // Create a new Audio element with the URL at the specified index
  // IMPORTANT: Only ONE audio file is created and played
  currentAudio = new Audio(audioUrls[index]);

  // Set volume level (0.0 = silent, 1.0 = full volume)
  currentAudio.volume = 0.8; // 80% volume - adjust as needed

  // Play the audio file
  currentAudio.play().catch((error) => {
    // If audio fails to play, log error and use fallback beep
    console.error("Error playing audio:", error);
    playBeepSound(); // Fallback to simple beep sound
  });

  // Clean up when audio finishes playing
  currentAudio.addEventListener("ended", () => {
    currentAudio = null;
  });
}

// ========================================
// FALLBACK BEEP SOUND
// ========================================

function playBeepSound() {
  // Creates a simple beep using Web Audio API
  // This is a backup if audio files fail to load
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800; // Frequency in Hz
  oscillator.type = "sine"; // Sine wave for smooth tone

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.5,
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}
