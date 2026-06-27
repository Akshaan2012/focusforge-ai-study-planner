const form = document.querySelector("#plannerForm");
const subjectInput = document.querySelector("#subjectInput");
const topicsInput = document.querySelector("#topicsInput");
const weakInput = document.querySelector("#weakInput");
const styleInput = document.querySelector("#styleInput");
const daysInput = document.querySelector("#daysInput");
const hoursInput = document.querySelector("#hoursInput");
const confidenceInput = document.querySelector("#confidenceInput");
const confidenceLabel = document.querySelector("#confidenceLabel");
const timeline = document.querySelector("#timeline");
const priorityList = document.querySelector("#priorityList");
const quizList = document.querySelector("#quizList");
const flashcards = document.querySelector("#flashcards");
const sessionRecipe = document.querySelector("#sessionRecipe");
const checklist = document.querySelector("#checklist");
const shuffleCardsBtn = document.querySelector("#shuffleCardsBtn");
const quizTopicSelect = document.querySelector("#quizTopicSelect");
const quizDifficultySelect = document.querySelector("#quizDifficultySelect");
const topicQuiz = document.querySelector("#topicQuiz");
const newQuizBtn = document.querySelector("#newQuizBtn");
const progressScore = document.querySelector("#progressScore");
const toast = document.querySelector("#toast");
const timerDisplay = document.querySelector("#timerDisplay");
const timerToggleBtn = document.querySelector("#timerToggleBtn");
const timerResetBtn = document.querySelector("#timerResetBtn");

const labels = {
  1: "Starting from scratch",
  2: "Needs structure",
  3: "Steady",
  4: "Mostly confident",
  5: "Revision mode"
};

let currentRankedTopics = [];
let quizSeed = 0;
let timerSeconds = 25 * 60;
let timerDuration = timerSeconds;
let timerInterval = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 2200);
}

function splitList(value) {
  const seen = new Set();
  return value
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getTopics() {
  return splitList(topicsInput.value);
}

function getWeakTopics() {
  return splitList(weakInput.value);
}

function rotate(items, index) {
  return items[index % items.length];
}

function topicScore(topic, weakTopics, confidence, index) {
  const normalized = topic.toLowerCase();
  const weakMatch = weakTopics.some((weak) => {
    const weakText = weak.toLowerCase();
    return normalized.includes(weakText) || weakText.includes(normalized);
  });
  const uncertainty = 6 - confidence;
  return 58 + uncertainty * 7 + (weakMatch ? 30 : 0) + Math.max(0, 9 - index);
}

function methodFor(style, confidence, day) {
  if (day % 4 === 0) return "Timed mixed quiz";
  if (style === "visual") return "Diagram map";
  if (style === "practice") return "Problem set";
  if (style === "memory") return "Flashcard drill";
  return confidence <= 2 ? "Guided notes + recall" : "Active recall";
}

function progressKey() {
  return `focusForgeProgress:${subjectInput.value.trim() || "default"}`;
}

function loadProgress() {
  return JSON.parse(localStorage.getItem(progressKey()) || "{}");
}

function saveProgress(day, checked) {
  const progress = loadProgress();
  progress[day] = checked;
  localStorage.setItem(progressKey(), JSON.stringify(progress));
}

function updateProgress() {
  const checks = [...document.querySelectorAll(".day-card .done-check")];
  const completed = checks.filter((check) => check.checked).length;
  const percent = checks.length ? Math.round((completed / checks.length) * 100) : 0;
  progressScore.textContent = `${percent}%`;
}

function renderTimeline(days, hours, rankedTopics, style, confidence) {
  const progress = loadProgress();
  timeline.innerHTML = "";
  const singleTopicTasks = [
    ["Build the foundation", "Define the idea from memory, then check your notes and correct every gap."],
    ["Map the concept", "Draw the process, key terms, and relationships on one page without copying."],
    ["Work an example", "Solve one representative example step by step and explain why each step works."],
    ["Find the traps", "List three common mistakes, then rewrite each one as a correct exam answer."],
    ["Teach it aloud", "Explain the topic in two minutes, record the weak spots, and repeat without notes."],
    ["Practice under pressure", "Answer three timed questions, review misses, and retry only the missed parts."],
    ["Final recall run", "Write everything you know from memory, then finish with one exam-style response."]
  ];

  for (let day = 1; day <= days; day += 1) {
    const primary = rotate(rankedTopics, day - 1);
    const secondary = rankedTopics.length > 1 ? rotate(rankedTopics, day) : null;
    const singleTask = rotate(singleTopicTasks, day - 1);
    const mode = rankedTopics.length === 1
      ? singleTask[0]
      : day === days ? "Final recall run" : day % 3 === 0 ? "Mixed practice" : "Deep focus";
    const method = methodFor(style, confidence, day);
    const taskText = rankedTopics.length === 1
      ? `${method}: ${singleTask[1]}`
      : `${method}: connect ${primary} with ${secondary}, then explain it without notes and answer two exam-style questions.`;
    const card = document.createElement("article");
    card.className = `day-card${progress[day] ? " completed" : ""}`;
    card.innerHTML = `
      <input class="done-check" type="checkbox" aria-label="Mark day ${day} complete" ${progress[day] ? "checked" : ""}>
      <div class="day-number">${day}</div>
      <div>
        <h3>${mode}: ${primary}</h3>
        <p>${taskText}</p>
      </div>
      <span class="time-chip">${hours}h</span>
    `;
    card.querySelector(".done-check").addEventListener("change", (event) => {
      card.classList.toggle("completed", event.target.checked);
      saveProgress(day, event.target.checked);
      updateProgress();
    });
    timeline.append(card);
  }
  updateProgress();
}

function renderPriorities(rankedTopics, weakTopics, confidence) {
  priorityList.innerHTML = "";
  rankedTopics.slice(0, 5).forEach((topic, index) => {
    const item = document.createElement("div");
    item.className = "priority-item";
    item.innerHTML = `
      <span class="priority-dot"></span>
      <div>
        <strong>${index + 1}. ${topic}</strong>
        <small>${topicScore(topic, weakTopics, confidence, index)} priority score</small>
      </div>
    `;
    priorityList.append(item);
  });
}

function renderQuiz(topics) {
  quizList.innerHTML = "";
  const prompts = topics.length === 1
    ? [
        `Define ${topics[0]} in your own words and give one concrete example.`,
        `Draw or describe the main process behind ${topics[0]}.`,
        `Name two common mistakes students make with ${topics[0]}.`,
        `Write a five-mark exam answer about ${topics[0]} without notes.`
      ]
    : topics.slice(0, 4).map((topic) => `Explain ${topic} with one example, one formula or rule, and one common mistake.`);
  prompts.forEach((prompt) => {
    const question = document.createElement("li");
    question.textContent = prompt;
    quizList.append(question);
  });
}

function renderFlashcards(topics) {
  flashcards.innerHTML = "";
  topics.slice(0, 6).forEach((topic, index) => {
    const card = document.createElement("article");
    card.className = "flashcard";
    card.innerHTML = `
      <strong>${topic}</strong>
      <p>Define it, compare it with ${rotate(topics, index + 1)}, then name one exam trap.</p>
    `;
    flashcards.append(card);
  });
}

function renderRecipe(style, hours, lowConfidence) {
  const coreAction = style === "practice"
    ? "solve questions first, then review gaps"
    : style === "visual"
      ? "draw a concept map before reading"
      : style === "memory"
        ? "drill cards in short spaced rounds"
        : "study one topic and immediately recall it";
  const recipes = [
    ["Warm-up", "10 min: brain dump everything you remember before opening notes."],
    ["Core block", `${Math.max(30, hours * 25)} min: ${coreAction}.`],
    ["Pressure test", `${lowConfidence ? "15" : "25"} min: closed-book quiz, mark misses, repeat tomorrow.`]
  ];

  sessionRecipe.innerHTML = "";
  recipes.forEach(([title, text]) => {
    const item = document.createElement("div");
    item.className = "recipe-item";
    item.innerHTML = `<strong>${title}</strong><p>${text}</p>`;
    sessionRecipe.append(item);
  });
}

function renderChecklist(topics) {
  const checks = [
    `Explain ${topics[0]} in under 60 seconds`,
    "Redo every missed quiz question once",
    "Write formulas and definitions from memory",
    "Pack materials and set a sleep cutoff"
  ];

  checklist.innerHTML = "";
  checks.forEach((text) => {
    const label = document.createElement("label");
    label.className = "check-item";
    label.innerHTML = `<input type="checkbox"> <span>${text}</span>`;
    checklist.append(label);
  });
}

function quizTemplates(topic, difficulty, neighbor) {
  const sets = {
    easy: [
      {
        q: `What is ${topic} in simple words?`,
        a: `A strong answer should define ${topic}, name its purpose, and include one tiny example.`
      },
      {
        q: `When would you use ${topic}?`,
        a: `Use it when the problem matches its main job. Mention the input, the output, and why ${topic} fits.`
      },
      {
        q: `What is one common mistake students make with ${topic}?`,
        a: `A good answer names the mistake, explains why it is wrong, and gives the corrected approach.`
      }
    ],
    medium: [
      {
        q: `Compare ${topic} with ${neighbor}.`,
        a: `Explain how both work, where they overlap, and one situation where ${topic} is the better choice.`
      },
      {
        q: `Create a small example that uses ${topic}, then solve it step by step.`,
        a: `Your answer should show the setup, each step, and the final result without skipping the reasoning.`
      },
      {
        q: `What assumptions does ${topic} depend on?`,
        a: `List the assumptions, then explain what breaks when one assumption is not true.`
      },
      {
        q: `Write a 5-line exam answer for ${topic}.`,
        a: `Definition, purpose, method, example, and limitation. Keep it concise and exam-ready.`
      }
    ],
    hard: [
      {
        q: `Design a tricky exam question where ${topic} seems useful but may fail.`,
        a: `The answer should identify the trap, explain the failure mode, and propose the better method.`
      },
      {
        q: `Prove or justify why ${topic} works in a typical case.`,
        a: `Use clear reasoning: assumptions, mechanism, result, and limitation. Formal proof is optional.`
      },
      {
        q: `Combine ${topic} with ${neighbor} in one solution.`,
        a: `Explain which part each topic handles, the order of use, and how you would verify the result.`
      },
      {
        q: `Give a counterexample that exposes a weakness of ${topic}.`,
        a: `State the counterexample, show why ${topic} struggles, and name the lesson for exams.`
      },
      {
        q: `Make a one-minute oral explanation of ${topic} for a viva.`,
        a: `Start with intuition, add the exact term, give an example, and finish with a limitation.`
      }
    ]
  };
  return sets[difficulty];
}

function renderTopicOptions(topics) {
  const selected = quizTopicSelect.value;
  quizTopicSelect.innerHTML = "";
  topics.forEach((topic) => {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = topic;
    quizTopicSelect.append(option);
  });
  if (topics.includes(selected)) {
    quizTopicSelect.value = selected;
  }
}

function renderTopicQuiz() {
  const topics = currentRankedTopics.length ? currentRankedTopics : ["Core concepts"];
  const topic = quizTopicSelect.value || topics[0];
  const difficulty = quizDifficultySelect.value;
  const neighbor = rotate(topics.filter((item) => item !== topic).length ? topics.filter((item) => item !== topic) : topics, quizSeed);
  const questions = quizTemplates(topic, difficulty, neighbor);

  topicQuiz.innerHTML = "";
  questions.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "question-card";
    card.innerHTML = `
      <h3>Question ${index + 1}</h3>
      <p>${item.q}</p>
      <button class="answer-button" type="button">Show answer guide</button>
      <p class="answer">${item.a}</p>
    `;
    card.querySelector(".answer-button").addEventListener("click", () => {
      card.classList.toggle("revealed");
      card.querySelector(".answer-button").textContent = card.classList.contains("revealed") ? "Hide answer guide" : "Show answer guide";
    });
    topicQuiz.append(card);
  });
}

function makePlan() {
  const subject = subjectInput.value.trim() || "Your exam";
  const planTopics = getTopics().length ? getTopics() : ["Core concepts"];
  const enteredWeakTopics = getWeakTopics();
  const weakTopics = enteredWeakTopics.filter((weak) => {
    const weakText = weak.toLowerCase();
    return planTopics.some((topic) => {
      const topicText = topic.toLowerCase();
      return topicText.includes(weakText) || weakText.includes(topicText);
    });
  });
  const days = Number(daysInput.value) || 1;
  const hours = Number(hoursInput.value) || 1;
  const confidence = Number(confidenceInput.value);
  const style = styleInput.value;
  const lowConfidence = confidence <= 2;
  const rankedTopics = [...planTopics].sort((a, b) => {
    return topicScore(b, weakTopics, confidence, planTopics.indexOf(b)) - topicScore(a, weakTopics, confidence, planTopics.indexOf(a));
  });
  currentRankedTopics = rankedTopics;
  const questionCount = Math.max(8, rankedTopics.length * (lowConfidence ? 5 : 4));
  const readiness = Math.min(96, Math.max(24, Math.round(confidence * 16 + Math.min(days * hours, 24) + Math.max(0, rankedTopics.length - weakTopics.length) * 2)));

  document.querySelector("#totalHours").textContent = days * hours;
  document.querySelector("#topicCount").textContent = rankedTopics.length;
  document.querySelector("#dailyLoad").textContent = `${hours}h`;
  document.querySelector("#quizCount").textContent = questionCount;
  document.querySelector("#readinessScore").textContent = `${readiness}%`;
  document.querySelector("#planHeading").textContent = `${days}-day sprint for ${subject}`;
  document.querySelector("#coachNote").textContent = lowConfidence
    ? "Use the first pass to build clarity. Keep notes tiny, then test yourself immediately."
    : "Spend less time rereading and more time proving what you know under light pressure.";
  document.querySelector("#diagnosisNote").textContent = weakTopics.length
    ? `I weighted ${weakTopics.join(", ")} higher and placed them earlier with extra recall loops.`
    : enteredWeakTopics.length
      ? "The weak-topic entries did not match this syllabus, so I left them out of the ranking."
      : "I ranked topics by order, time pressure, and confidence. Add weak topics for a sharper plan.";

  renderTimeline(days, hours, rankedTopics, style, confidence);
  renderPriorities(rankedTopics, weakTopics, confidence);
  renderQuiz(rankedTopics);
  renderFlashcards(rankedTopics);
  renderRecipe(style, hours, lowConfidence);
  renderChecklist(rankedTopics);
  renderTopicOptions(rankedTopics);
  renderTopicQuiz();
}

function planData() {
  return {
    subject: subjectInput.value,
    topics: topicsInput.value,
    weak: weakInput.value,
    style: styleInput.value,
    days: daysInput.value,
    hours: hoursInput.value,
    confidence: confidenceInput.value
  };
}

function restorePlan() {
  const saved = JSON.parse(localStorage.getItem("focusForgeSavedPlan") || "null");
  if (!saved) return false;
  subjectInput.value = saved.subject || subjectInput.value;
  topicsInput.value = saved.topics || topicsInput.value;
  weakInput.value = saved.weak || "";
  styleInput.value = saved.style || "balanced";
  daysInput.value = saved.days || 7;
  hoursInput.value = saved.hours || 2;
  confidenceInput.value = saved.confidence || 3;
  confidenceLabel.textContent = labels[confidenceInput.value];
  return true;
}

function renderTimer() {
  const minutes = Math.floor(timerSeconds / 60).toString().padStart(2, "0");
  const seconds = (timerSeconds % 60).toString().padStart(2, "0");
  timerDisplay.textContent = `${minutes}:${seconds}`;
  document.title = timerInterval ? `${minutes}:${seconds} · FocusForge` : "FocusForge AI Study Planner";
}

function stopTimer() {
  window.clearInterval(timerInterval);
  timerInterval = null;
  timerToggleBtn.textContent = "Start focus";
  renderTimer();
}

confidenceInput.addEventListener("input", () => {
  confidenceLabel.textContent = labels[confidenceInput.value];
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  makePlan();
  document.querySelector(".dashboard").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#savePlanBtn").addEventListener("click", () => {
  localStorage.setItem("focusForgeSavedPlan", JSON.stringify(planData()));
  showToast("Plan saved on this device");
});

document.querySelector("#printPlanBtn").addEventListener("click", () => window.print());

document.querySelector("#resetProgressBtn").addEventListener("click", () => {
  localStorage.removeItem(progressKey());
  document.querySelectorAll(".day-card .done-check").forEach((check) => {
    check.checked = false;
    check.closest(".day-card").classList.remove("completed");
  });
  updateProgress();
  showToast("Progress reset");
});

document.querySelector("#copyPlanBtn").addEventListener("click", async () => {
  const subject = subjectInput.value.trim() || "Study";
  const rows = [...document.querySelectorAll(".day-card")]
    .map((card) => card.innerText.replace(/\n/g, " - "))
    .join("\n");

  await navigator.clipboard.writeText(`${subject} study plan\n${rows}`);
  document.querySelector("#copyPlanBtn").textContent = "Copied";
  setTimeout(() => {
    document.querySelector("#copyPlanBtn").textContent = "Copy";
  }, 1200);
});

shuffleCardsBtn.addEventListener("click", () => {
  currentRankedTopics = [...currentRankedTopics].sort(() => Math.random() - 0.5);
  renderFlashcards(currentRankedTopics);
});

quizTopicSelect.addEventListener("change", renderTopicQuiz);
quizDifficultySelect.addEventListener("change", renderTopicQuiz);
newQuizBtn.addEventListener("click", () => {
  quizSeed += 1;
  renderTopicQuiz();
});

document.querySelectorAll(".timer-preset").forEach((button) => {
  button.addEventListener("click", () => {
    stopTimer();
    document.querySelectorAll(".timer-preset").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    timerDuration = Number(button.dataset.minutes) * 60;
    timerSeconds = timerDuration;
    renderTimer();
  });
});

timerToggleBtn.addEventListener("click", () => {
  if (timerInterval) {
    stopTimer();
    return;
  }
  timerToggleBtn.textContent = "Pause";
  timerInterval = window.setInterval(() => {
    timerSeconds -= 1;
    renderTimer();
    if (timerSeconds <= 0) {
      stopTimer();
      timerSeconds = timerDuration;
      renderTimer();
      showToast("Focus session complete");
    }
  }, 1000);
});

timerResetBtn.addEventListener("click", () => {
  stopTimer();
  timerSeconds = timerDuration;
  renderTimer();
});

confidenceLabel.textContent = labels[confidenceInput.value];
restorePlan();
makePlan();
renderTimer();
