const form = document.querySelector("#plannerForm");
const subjectInput = document.querySelector("#subjectInput");
const topicsInput = document.querySelector("#topicsInput");
const daysInput = document.querySelector("#daysInput");
const hoursInput = document.querySelector("#hoursInput");
const confidenceInput = document.querySelector("#confidenceInput");
const confidenceLabel = document.querySelector("#confidenceLabel");
const timeline = document.querySelector("#timeline");
const priorityList = document.querySelector("#priorityList");
const quizList = document.querySelector("#quizList");

const labels = {
  1: "Starting from scratch",
  2: "Needs structure",
  3: "Steady",
  4: "Mostly confident",
  5: "Revision mode"
};

function getTopics() {
  return topicsInput.value
    .split(/,|\n/)
    .map((topic) => topic.trim())
    .filter(Boolean);
}

function rotate(items, index) {
  return items[index % items.length];
}

function makePlan() {
  const subject = subjectInput.value.trim() || "Your exam";
  const topics = getTopics();
  const planTopics = topics.length ? topics : ["Core concepts"];
  const days = Number(daysInput.value) || 1;
  const hours = Number(hoursInput.value) || 1;
  const confidence = Number(confidenceInput.value);
  const lowConfidence = confidence <= 2;
  const questionCount = Math.max(6, planTopics.length * (lowConfidence ? 4 : 3));

  document.querySelector("#totalHours").textContent = days * hours;
  document.querySelector("#topicCount").textContent = planTopics.length;
  document.querySelector("#dailyLoad").textContent = `${hours}h`;
  document.querySelector("#quizCount").textContent = questionCount;
  document.querySelector("#planHeading").textContent = `${days}-day sprint for ${subject}`;
  document.querySelector("#coachNote").textContent = lowConfidence
    ? "Use the first pass to build clarity. Keep notes tiny, then test yourself immediately."
    : "Spend less time rereading and more time proving what you know under light pressure.";

  timeline.innerHTML = "";
  for (let day = 1; day <= days; day += 1) {
    const primary = rotate(planTopics, day - 1);
    const secondary = rotate(planTopics, day);
    const mode = day === days ? "Final recall run" : day % 3 === 0 ? "Mixed practice" : "Deep focus";
    const card = document.createElement("article");
    card.className = "day-card";
    card.innerHTML = `
      <div class="day-number">${day}</div>
      <div>
        <h3>${mode}: ${primary}</h3>
        <p>Review ${primary}, connect it with ${secondary}, then write a 5-line explanation without notes.</p>
      </div>
      <span class="time-chip">${hours}h</span>
    `;
    timeline.append(card);
  }

  priorityList.innerHTML = "";
  planTopics.slice(0, 5).forEach((topic, index) => {
    const item = document.createElement("div");
    item.className = "priority-item";
    item.innerHTML = `
      <span class="priority-dot"></span>
      <strong>${index + 1}. ${topic}</strong>
    `;
    priorityList.append(item);
  });

  quizList.innerHTML = "";
  planTopics.slice(0, 3).forEach((topic) => {
    const question = document.createElement("li");
    question.textContent = `Explain ${topic} with one example and one common mistake.`;
    quizList.append(question);
  });
}

confidenceInput.addEventListener("input", () => {
  confidenceLabel.textContent = labels[confidenceInput.value];
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  makePlan();
  document.querySelector(".dashboard").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#copyPlanBtn").addEventListener("click", async () => {
  const subject = subjectInput.value.trim();
  const rows = [...document.querySelectorAll(".day-card")]
    .map((card) => card.innerText.replace(/\n/g, " - "))
    .join("\n");

  await navigator.clipboard.writeText(`${subject} study plan\n${rows}`);
  document.querySelector("#copyPlanBtn").textContent = "Copied";
  setTimeout(() => {
    document.querySelector("#copyPlanBtn").textContent = "Copy";
  }, 1200);
});

confidenceLabel.textContent = labels[confidenceInput.value];
makePlan();
