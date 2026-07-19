const STORAGE_KEY = "tenseline-project-v1";
const PALETTE = ["#e85d45", "#1967d2", "#0b8f71", "#9b51e0", "#d28a00", "#d43b78", "#44546a"];

const starterState = () => ({
  textSize: 24,
  nowX: 78,
  showCcqAnswers: true,
  showTenseExplain: true,
  sentence: "",
  events: [
    { id: makeId(), label: "Sự kiện 1", timestamp: "", color: PALETTE[0], x: 30, endX: 48, lane: "above", shape: "point", tense: null },
    { id: makeId(), label: "Sự kiện 2", timestamp: "", color: PALETTE[1], x: 58, endX: 76, lane: "below", shape: "point", tense: null },
  ],
  links: [],
});

let state = loadState();
let drag = null;
let saveTimer = null;
let layoutFrame = null;
let lastPreviewX = 50;
let nowDrag = false;
let stageCreate = null;
const projectHistory = TimelineMath.createHistory(60);

const els = {
  editor: document.querySelector("#paragraphEditor"),
  stage: document.querySelector("#timelineStage"),
  layer: document.querySelector("#eventLayer"),
  clickPreview: document.querySelector("#clickPreview"),
  rangePreview: document.querySelector("#rangePreview"),
  nowMarker: document.querySelector("#nowMarker"),
  linkToolbar: document.querySelector("#linkToolbar"),
  ccqList: document.querySelector("#ccqList"),
  ccqToggle: document.querySelector("#toggleCcqAnswers"),
  tenseExplainToggle: document.querySelector("#toggleTenseExplain"),
  textSizeRange: document.querySelector("#textSizeRange"),
  textSizeValue: document.querySelector("#textSizeValue"),
  savedState: document.querySelector("#savedState"),
  toast: document.querySelector("#toast"),
  dialog: document.querySelector("#newDialog"),
  undoButton: document.querySelector("#undoButton"),
  redoButton: document.querySelector("#redoButton"),
};

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.events && Array.isArray(stored.links)) {
      stored.events.forEach((item) => {
        item.endX = clamp(item.endX ?? item.x + 18, item.x + 5, 96);
        item.timestamp = item.timestamp || "";
        item.tense = item.tense || null;
      });
      ensureUniqueEventColours(stored.events);
      stored.textSize = clamp(Number(stored.textSize) || 24, 16, 48);
      stored.nowX = clamp(Number(stored.nowX) || 78, 4, 96);
      stored.showCcqAnswers = Boolean(stored.showCcqAnswers);
      stored.showTenseExplain = Boolean(stored.showTenseExplain);
      return stored;
    }
  } catch (_) {}
  const initial = starterState();
  const first = initial.sentence.indexOf("had cooked dinner");
  const second = initial.sentence.indexOf("got home");
  initial.links = [
    { eventId: initial.events[0].id, start: first, end: first + 17 },
    { eventId: initial.events[1].id, start: second, end: second + 8 },
  ];
  return initial;
}

function init() {
  bindGlobalEvents();
  setTextSize(state.textSize, false);
  setNowPosition(state.nowX, false);
  render();
  updateHistoryButtons();
}

function bindGlobalEvents() {
  els.textSizeRange.addEventListener("input", () => setTextSize(els.textSizeRange.value));
  document.querySelector("#textSmaller").addEventListener("click", () => setTextSize(state.textSize - 2));
  document.querySelector("#textLarger").addEventListener("click", () => setTextSize(state.textSize + 2));
  els.nowMarker.addEventListener("pointerdown", startNowDrag);
  els.nowMarker.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.shiftKey ? 5 : 1;
    recordHistory("now-keyboard", true);
    setNowPosition(state.nowX + (event.key === "ArrowLeft" ? -step : step));
    autoResetTenses();
  });

  els.editor.addEventListener("input", () => {
    recordHistory("paragraph", true);
    state.sentence = els.editor.innerText.replace(/\n$/, "");
    state.links = [];
    if (state.sentence) delete els.editor.dataset.empty;
    else els.editor.dataset.empty = "true";
    scheduleSave();
  });
  els.editor.addEventListener("blur", () => renderParagraph());

  document.querySelector("#addEventButton").addEventListener("click", () => addEvent(lastPreviewX));
  els.undoButton.addEventListener("click", undoHistory);
  els.redoButton.addEventListener("click", redoHistory);
  document.querySelector("#clearEventsButton").addEventListener("click", () => {
    if (!state.events.length) return showToast("Dòng thời gian đã trống sẵn");
    if (!window.confirm("Xóa tất cả sự kiện trên dòng thời gian? Đoạn văn ví dụ sẽ được giữ nguyên.")) return;
    recordHistory("clear-events");
    state.events = [];
    state.links = [];
    render();
    saveNow();
    showToast("Đã xóa tất cả sự kiện — đoạn văn vẫn được giữ lại");
  });
  els.stage.addEventListener("pointerdown", startStageCreate);
  els.stage.addEventListener("pointermove", updateClickPreview);
  els.stage.addEventListener("pointerleave", hideClickPreview);
  els.ccqToggle.addEventListener("click", () => {
    state.showCcqAnswers = !state.showCcqAnswers;
    renderConceptQuestions();
    scheduleSave();
  });
  els.tenseExplainToggle.addEventListener("click", () => {
    state.showTenseExplain = !state.showTenseExplain;
    renderConceptQuestions();
    scheduleSave();
  });

  document.querySelector("#newButton").addEventListener("click", () => els.dialog.showModal());
  document.querySelector("#confirmNew").addEventListener("click", () => {
    recordHistory("new-timeline");
    state = starterState();
    setTextSize(state.textSize, false);
    setNowPosition(state.nowX, false);
    render();
    saveNow();
    showToast("Đã sẵn sàng dòng thời gian mới");
  });

  document.querySelector("#presentButton").addEventListener("click", () => {
    document.body.classList.toggle("is-presenting");
    const presenting = document.body.classList.contains("is-presenting");
    document.querySelector("#presentButton").textContent = presenting ? "Thoát trình chiếu" : "Trình chiếu";
    if (presenting) document.querySelector(".canvas-card").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", cancelStageCreate);
  window.addEventListener("resize", scheduleCollisionLayout);
  window.addEventListener("keydown", (event) => {
    const shortcutKey = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (shortcutKey && !event.altKey && (key === "z" || (event.ctrlKey && key === "y"))) {
      event.preventDefault();
      if ((key === "z" && event.shiftKey) || key === "y") redoHistory();
      else undoHistory();
      return;
    }
    if (event.key === "Escape" && document.body.classList.contains("is-presenting")) {
      document.body.classList.remove("is-presenting");
      document.querySelector("#presentButton").textContent = "Trình chiếu";
    }
  });
}

function render() {
  renderTimeline();
  renderParagraphTools();
}

const TENSE_GROUP_LABELS = { past: "Quá khứ", present: "Hiện tại", future: "Tương lai" };

function buildTenseSelectHtml(item) {
  const suggestion = TimelineMath.suggestTense(item, state.events, state.nowX);
  // "selected" phải bám theo lựa chọn THẬT của người dùng (item.tense), không
  // phải theo effective/suggestion — nếu không, một sự kiện mới (tense = null)
  // sẽ hiển thị như thể đã được chọn sẵn là thì được gợi ý (vd. Quá khứ đơn)
  // ngay khi vừa thêm vào, dù người dùng chưa hề bấm chọn gì.
  const placeholder = suggestion
    ? `<option value="" ${item.tense ? "" : "selected"}>— Dùng gợi ý tự động —</option>`
    : `<option value="" disabled ${item.tense ? "" : "selected"}>— Chọn thì —</option>`;

  // Tính tập thì bị cấm vì mâu thuẫn logic vị trí:
  // Sự kiện điểm trong quá khứ đứng SAU điểm quá khứ khác không thể là
  // past_perfect_simple (quá khứ hoàn thành chỉ dùng cho sự kiện hoàn tất
  // TRƯỚC một mốc quá khứ khác — gán cho sự kiện đứng sau là sai logic).
  const forbiddenTenseIds = new Set();
  if (item.shape === "point" && TimelineMath.classifyEventTime(item, state.nowX) === "past") {
    const hasPastPointBefore = state.events.some((e) =>
      e.id !== item.id
      && e.shape === "point"
      && TimelineMath.classifyEventTime(e, state.nowX) === "past"
      && Number(e.x) < Number(item.x)
    );
    if (hasPastPointBefore) forbiddenTenseIds.add("past_perfect_simple");
  }

  // Ở chế độ tự suy luận: chỉ hiện thì được gợi ý + các thì thay thế
  if (state.showTenseExplain) {
    const explanation = TimelineMath.explainTense(item, state.events, state.nowX);
    const allowedIds = new Set();
    if (suggestion) allowedIds.add(suggestion);
    if (item.tense) allowedIds.add(item.tense);
    explanation.alternatives.forEach((alt) => allowedIds.add(alt.id));
    if (allowedIds.size === 0) {
      // Ngữ cảnh mơ hồ chưa có alternatives → hiện toàn bộ như thường
    } else {
      const options = [...allowedIds]
        .filter((id) => TimelineMath.TENSES[id] && !forbiddenTenseIds.has(id))
        .map((id) => `<option value="${id}" ${item.tense === id ? "selected" : ""}>${escapeHtml(TimelineMath.TENSES[id].label)}</option>`)
        .join("");
      return `<select class="tense-select" aria-label="Chọn thì cho sự kiện">${placeholder}${options}</select>`;
    }
  }

  const groups = ["past", "present", "future"].map((group) => {
    const options = Object.entries(TimelineMath.TENSES)
      .filter(([id, meta]) => meta.group === group && !forbiddenTenseIds.has(id))
      .map(([id, meta]) => `<option value="${id}" ${item.tense === id ? "selected" : ""}>${escapeHtml(meta.label)}</option>`)
      .join("");
    return `<optgroup label="${TENSE_GROUP_LABELS[group]}">${options}</optgroup>`;
  }).join("");
  return `<select class="tense-select" aria-label="Chọn thì cho sự kiện">${placeholder}${groups}</select>`;
}

function buildEventExampleHtml(item) {
  const explanation = TimelineMath.explainTense(item, state.events, state.nowX);
  // Nếu ngữ cảnh mơ hồ và chưa chọn thì → chờ người dùng chọn trước
  if (!explanation.suggested && !item.tense) return "Chọn thì để xem ví dụ";

  // Khi người dùng đã chọn tay một thì cụ thể:
  // 1. Nếu thì đó khớp với suggested → dùng explanation.example (context-aware)
  // 2. Nếu thì đó là alternative → dùng example từ alternatives
  // 3. Fallback về TENSE_EXAMPLES[item.tense]
  let raw = null;
  if (item.tense && item.tense !== explanation.suggested) {
    const alt = explanation.alternatives?.find((a) => a.id === item.tense);
    raw = (alt?.example) || TimelineMath.TENSE_EXAMPLES[item.tense] || null;
  } else {
    raw = explanation.example || (item.tense ? TimelineMath.TENSE_EXAMPLES[item.tense] : null);
  }

  if (!raw) return "Chọn thì để xem ví dụ";
  const exObj = (typeof raw === "object" && raw !== null) ? raw : { text: raw, underline: null };
  if (!exObj.text) return "Chọn thì để xem ví dụ";
  const escaped = escapeHtml(exObj.text);
  if (!exObj.underline) return `Ví dụ: <em>${escaped}</em>`;
  const escapedUnderline = escapeHtml(exObj.underline);
  const highlighted = escaped.replace(escapedUnderline, `<u>${escapedUnderline}</u>`);
  return `Ví dụ: <em>${highlighted}</em>`;
}

function renderTimeline() {
  els.stage.querySelectorAll(".timeline-marker-2030").forEach((el) => el.remove());
  const waveTracks = TimelineMath.assignWaveTracks(state.events);
  els.layer.innerHTML = state.events.map((item) => {
    const lane = item.lane === "above" ? "is-above" : "is-below";
    const shape = item.shape === "range" ? "is-range" : "is-point";
    const waveTrack = waveTracks[item.id] || { side: "above", level: 0 };
    item.endX = clamp(item.endX ?? item.x + 18, item.x + 5, 96);
    const width = item.shape === "range" ? item.endX - item.x : 0;
    return `
      <article class="timeline-event ${lane} ${shape} wave-${waveTrack.side}" data-id="${item.id}" style="--event-x:${item.x}%;--event-width:${width}%;--event-color:${item.color};--wave-level:${waveTrack.level}" tabindex="0" aria-label="Sự kiện ${escapeAttribute(item.label)}">
        <div class="event-caption">
          <textarea class="inline-name" rows="1" aria-label="Tên sự kiện">${escapeHtml(item.label)}</textarea>
          <label class="timestamp-row ${item.timestamp ? "has-value" : ""}">
            <span>Thời điểm</span>
            <input class="timestamp-input" type="text" value="${escapeAttribute(item.timestamp)}" placeholder="tùy chọn" aria-label="Thời điểm của sự kiện (tùy chọn)" />
          </label>
          <label class="tense-row ${item.tense ? "is-manual" : TimelineMath.suggestTense(item, state.events, state.nowX) ? "is-suggested" : "is-unset"}">
            <span>${item.tense ? "Thì" : TimelineMath.suggestTense(item, state.events, state.nowX) ? "Thì (gợi ý)" : "Thì (cần chọn)"}</span>
            ${buildTenseSelectHtml(item)}
          </label>
          ${state.showTenseExplain ? `<p class="tense-example">${buildEventExampleHtml(item)}</p>` : ""}
          <div class="inline-controls">
            <label class="colour-control" title="Màu sự kiện"><span>Màu</span><input class="inline-colour" type="color" value="${item.color}" aria-label="Màu sự kiện" /></label>
            <button class="inline-action lane-action" type="button" title="Chuyển xuống ${item.lane === "above" ? "dưới" : "trên"} đường thời gian" aria-label="Chuyển xuống ${item.lane === "above" ? "dưới" : "trên"} đường thời gian">${item.lane === "above" ? "↓" : "↑"}</button>
            <button class="inline-action shape-action" type="button" title="${item.shape === "range" ? "Đổi thành một thời điểm" : "Đổi thành hành động diễn ra liên tục"}" aria-label="${item.shape === "range" ? "Đổi thành một thời điểm" : "Đổi thành hành động diễn ra liên tục"}">${item.shape === "range" ? "●" : "〰"}</button>
            <button class="inline-action remove-action" type="button" title="Xóa sự kiện" aria-label="Xóa ${escapeAttribute(item.label)}">×</button>
          </div>
        </div>
        <span class="event-stem" aria-hidden="true"></span>
        <span class="duration-wave" aria-hidden="true"></span>
        <button class="event-node event-start" type="button" aria-label="${item.shape === "range" ? "Kéo điểm bắt đầu của" : "Kéo"} ${escapeAttribute(item.label)}"></button>
        ${item.shape === "range" ? `<button class="event-node event-end" type="button" aria-label="Kéo điểm kết thúc của ${escapeAttribute(item.label)}"></button>` : ""}
      </article>`;
  }).join("");

  els.layer.querySelectorAll(".timeline-event").forEach((node) => {
    const item = state.events.find((entry) => entry.id === node.dataset.id);
    node.querySelector(".event-start").addEventListener("pointerdown", (event) => startDrag(event, item, node, item.shape === "range" ? "start" : "move"));
    node.querySelector(".event-end")?.addEventListener("pointerdown", (event) => startDrag(event, item, node, "end"));
    node.querySelector(".event-stem").addEventListener("pointerdown", (event) => startDrag(event, item, node, "move"));
    node.querySelector(".duration-wave").addEventListener("pointerdown", (event) => startDrag(event, item, node, "move"));
    const nameField = node.querySelector(".inline-name");
    resizeEventName(nameField, false);
    nameField.addEventListener("input", (event) => {
      recordHistory(`event-name-${item.id}`, true);
      item.label = event.target.value || "Sự kiện chưa đặt tên";
      resizeEventName(event.target);
      renderParagraphTools(false);
      renderConceptQuestions();
      scheduleSave();
    });
    const timestampField = node.querySelector(".timestamp-input");
    timestampField.addEventListener("input", (event) => {
      recordHistory(`event-time-${item.id}`, true);
      item.timestamp = event.target.value;
      event.target.closest(".timestamp-row").classList.toggle("has-value", Boolean(item.timestamp.trim()));
      renderConceptQuestions();
      scheduleCollisionLayout();
      scheduleSave();
    });
    timestampField.addEventListener("blur", () => requestAnimationFrame(scheduleCollisionLayout));
    const tenseField = node.querySelector(".tense-select");
    tenseField.addEventListener("change", (event) => {
      recordHistory(`event-tense-${item.id}`);
      item.tense = event.target.value || null;
      // Nếu là cặp overlap future range → tự set tense cho sự kiện kia
      if (item.tense === "future_continuous" || item.tense === "future_present_simple") {
        const partner = state.events.find((e) => e.id !== item.id
          && e.shape === "range"
          && TimelineMath.classifyEventTime(e, state.nowX) === "future"
          && Number(item.x) < Number(e.endX) && Number(e.x) < Number(item.endX));
        if (partner) {
          partner.tense = item.tense === "future_continuous" ? "future_present_simple" : "future_continuous";
        }
      }
      // Cặp quá khứ: điểm-điểm trong quá khứ
      // Chỉ tự động điền thì cho sự kiện đứng sau (gần NOW hơn) khi sự kiện đó
      // CHƯA được người dùng tự chọn thì (e.tense rỗng) — nếu đã chọn rồi thì
      // phải giữ nguyên, không được ghi đè lựa chọn của người dùng.
      if (item.shape === "point" && TimelineMath.classifyEventTime(item, state.nowX) === "past") {
        if (item.tense === "past_perfect_simple" || item.tense === "past_simple") {
          const laterPoint = state.events.find((e) => e.id !== item.id
            && e.shape === "point"
            && TimelineMath.classifyEventTime(e, state.nowX) === "past"
            && Number(e.x) > Number(item.x)
            && !e.tense);
          if (laterPoint) laterPoint.tense = "past_simple";
        }
      }
      renderTimeline();
      scheduleSave();
    });
    node.querySelector(".inline-colour").addEventListener("input", (event) => {
      if (event.target.value.toLowerCase() === item.color.toLowerCase()) return;
      recordHistory(`event-colour-${item.id}`, true);
      const previousColour = item.color;
      const chosenColour = event.target.value;
      const conflict = state.events.find((entry) => entry.id !== item.id && entry.color.toLowerCase() === chosenColour.toLowerCase());
      if (conflict) {
        conflict.color = previousColour;
        const conflictNode = els.layer.querySelector(`[data-id="${conflict.id}"]`);
        conflictNode?.style.setProperty("--event-color", conflict.color);
        const conflictPicker = conflictNode?.querySelector(".inline-colour");
        if (conflictPicker) conflictPicker.value = conflict.color;
      }
      item.color = chosenColour;
      node.style.setProperty("--event-color", item.color);
      renderParagraphTools();
      renderConceptQuestions();
      scheduleSave();
    });
    node.querySelector(".lane-action").addEventListener("click", () => {
      recordHistory(`event-lane-${item.id}`);
      const wantedLane = item.lane === "above" ? "below" : "above";
      const othersAbove = state.events.filter((e) => e.id !== item.id && e.lane === "above").length;
      const othersBelow = state.events.filter((e) => e.id !== item.id && e.lane === "below").length;
      if (Math.abs((wantedLane === "above" ? othersAbove + 1 : othersAbove) - (wantedLane === "below" ? othersBelow + 1 : othersBelow)) <= 1) {
        item.lane = wantedLane;
      }
      renderTimeline();
      scheduleSave();
    });
    node.querySelector(".shape-action").addEventListener("click", () => {
      recordHistory(`event-shape-${item.id}`);
      item.shape = item.shape === "range" ? "point" : "range";
      if (item.shape === "range") item.endX = clamp(item.endX ?? item.x + 18, item.x + 5, 96);
      // Shape đổi → thì cũ chắc chắn không còn đúng, reset về gợi ý tự động
      item.tense = null;
      autoResetTenses();
      renderTimeline();
      scheduleSave();
    });
    node.querySelector(".remove-action").addEventListener("click", () => deleteEvent(item.id));
    node.addEventListener("keydown", (event) => {
      if (event.target.matches("input, textarea, button")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        recordHistory(`event-keyboard-${item.id}`, true);
        const delta = event.key === "ArrowLeft" ? -2 : 2;
        if (item.shape === "range") {
          const duration = item.endX - item.x;
          item.x = clamp(item.x + delta, 4, 96 - duration);
          item.endX = item.x + duration;
        } else {
          item.x = clamp(item.x + delta, 4, 96);
        }
        autoResetTenses();
        renderTimeline();
        scheduleSave();
      }
    });
  });

  // Vẽ các nhãn 2030 gần vị trí các sự kiện tương lai hoàn thành / tương lai hoàn thành tiếp diễn
  state.events.forEach((item) => {
    if (item.tense === "future_perfect_simple" || item.tense === "future_perfect_continuous") {
      const label = document.createElement("div");
      label.className = "timeline-marker-2030";
      label.textContent = "2030";
      const posX = item.shape === "range" ? (Number(item.x) + Number(item.endX)) / 2 : Number(item.x);
      label.style.left = `${posX}%`;
      els.stage.appendChild(label);
    }
  });

  scheduleCollisionLayout();
  renderConceptQuestions();
  updateTenseWarnings();
}

function scheduleCollisionLayout() {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(applyCollisionLayout);
}

function resizeEventName(field, updateLayout = true) {
  field.style.height = "0px";
  field.style.height = `${field.scrollHeight}px`;
  if (updateLayout) scheduleCollisionLayout();
}

function applyCollisionLayout() {
  layoutFrame = null;
  const stageRect = els.stage.getBoundingClientRect();
  if (!stageRect.width) return;
  let greatestExtent = 0;

  ["above", "below"].forEach((lane) => {
    const entries = state.events
      .filter((item) => item.lane === lane)
      .map((item) => {
        const node = els.layer.querySelector(`[data-id="${item.id}"]`);
        const caption = node?.querySelector(".event-caption");
        const centerPercent = item.shape === "range" ? (item.x + item.endX) / 2 : item.x;
        const center = stageRect.width * centerPercent / 100;
        const box = caption?.getBoundingClientRect();
        const width = box?.width || 238;
        const height = box?.height || 56;
        return { node, height, left: center - width / 2, right: center + width / 2 };
      })
      .filter((entry) => entry.node)
      .sort((a, b) => a.left - b.left);

    const levelEnds = [];
    const levelHeights = [];
    entries.forEach((entry) => {
      let level = levelEnds.findIndex((right) => right + 14 <= entry.left);
      if (level === -1) level = levelEnds.length;
      levelEnds[level] = entry.right;
      levelHeights[level] = Math.max(levelHeights[level] || 0, entry.height);
      entry.level = level;
    });

    const offsets = [];
    levelHeights.forEach((height, level) => {
      offsets[level] = level === 0 ? 0 : offsets[level - 1] + levelHeights[level - 1] + 16;
    });
    entries.forEach((entry) => {
      const offset = offsets[entry.level] || 0;
      entry.node.style.setProperty("--stack-offset", `${offset}px`);
      greatestExtent = Math.max(greatestExtent, offset + entry.height);
    });
  });

  const minimumStageHeight = state.events.length ? 300 : 220;
  els.stage.style.height = `${Math.max(minimumStageHeight, Math.ceil((90 + greatestExtent) * 2))}px`;
}

function updateClickPreview(event) {
  if (drag || nowDrag || stageCreate || event.target.closest(".timeline-event, .now-line")) return hideClickPreview();
  const rect = els.stage.getBoundingClientRect();
  if (!TimelineMath.isAlongTimeline(event.clientY, rect)) return hideClickPreview();
  lastPreviewX = clamp(((event.clientX - rect.left) / rect.width) * 100, 4, 96);
  els.clickPreview.style.left = `${lastPreviewX}%`;
  els.clickPreview.classList.add("is-visible");
  els.stage.classList.add("is-axis-hover");
}

function hideClickPreview() {
  els.clickPreview.classList.remove("is-visible");
  els.stage.classList.remove("is-axis-hover");
}

function startStageCreate(event) {
  if (event.button !== 0 || drag || nowDrag || document.body.classList.contains("is-presenting")) return;
  if (event.target.closest(".timeline-event, .now-line, button, input, textarea, label")) return;
  const rect = els.stage.getBoundingClientRect();
  if (!TimelineMath.isAlongTimeline(event.clientY, rect)) return;
  const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 4, 96);
  stageCreate = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startX: x,
    currentX: x,
    moved: false,
  };
  hideClickPreview();
  event.preventDefault();
}

function updateStageCreate(event) {
  if (!stageCreate || event.pointerId !== stageCreate.pointerId) return;
  const rect = els.stage.getBoundingClientRect();
  stageCreate.currentX = clamp(((event.clientX - rect.left) / rect.width) * 100, 4, 96);
  stageCreate.moved = stageCreate.moved || Math.abs(event.clientX - stageCreate.startClientX) >= 8;
  if (!stageCreate.moved) return;
  const range = TimelineMath.rangeFromDrag(stageCreate.startX, stageCreate.currentX);
  els.rangePreview.style.setProperty("--draft-x", `${range.x}%`);
  els.rangePreview.style.setProperty("--draft-width", `${range.endX - range.x}%`);
  els.rangePreview.classList.add("is-visible");
}

function finishStageCreate(event) {
  if (!stageCreate || event.pointerId !== stageCreate.pointerId) return false;
  updateStageCreate(event);
  const creation = stageCreate;
  stageCreate = null;
  els.rangePreview.classList.remove("is-visible");
  if (creation.moved) {
    const range = TimelineMath.rangeFromDrag(creation.startX, creation.currentX);
    addEvent(range.x, { shape: "range", endX: range.endX });
    showToast("Đã thêm sự kiện diễn ra liên tục");
  } else {
    addEvent(creation.startX);
  }
  return true;
}

function cancelStageCreate(event) {
  if (!stageCreate || (event?.pointerId != null && event.pointerId !== stageCreate.pointerId)) return;
  stageCreate = null;
  els.rangePreview.classList.remove("is-visible");
}

function startNowDrag(event) {
  if (event.button !== 0) return;
  recordHistory("now-drag");
  nowDrag = true;
  els.nowMarker.classList.add("is-dragging");
  hideClickPreview();
  event.preventDefault();
  event.stopPropagation();
}

function setNowPosition(value, save = true) {
  state.nowX = clamp(Math.round(Number(value) || 78), 4, 96);
  els.stage.style.setProperty("--now-x", `${state.nowX}%`);
  els.nowMarker.setAttribute("aria-valuetext", `Hiện tại ở ${state.nowX}% dòng thời gian`);
  if (els.ccqList) renderConceptQuestions();
  if (save) scheduleSave();
}

function startDrag(event, item, node, handle) {
  if (event.button !== 0) return;
  recordHistory(`event-drag-${item.id}`);
  const rect = els.stage.getBoundingClientRect();
  drag = {
    id: item.id,
    handle,
    startY: event.clientY,
    pointerX: ((event.clientX - rect.left) / rect.width) * 100,
    originalX: item.x,
    originalEndX: item.endX,
  };
  node.classList.add("is-dragging");
  hideClickPreview();
  event.preventDefault();
}

function onPointerMove(event) {
  if (stageCreate) {
    updateStageCreate(event);
    return;
  }
  if (nowDrag) {
    const rect = els.stage.getBoundingClientRect();
    setNowPosition(((event.clientX - rect.left) / rect.width) * 100, false);
    return;
  }
  if (!drag) return;
  const item = state.events.find((entry) => entry.id === drag.id);
  const rect = els.stage.getBoundingClientRect();
  const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
  if (drag.handle === "end") {
    item.endX = Math.round(clamp(pointerX, item.x + 5, 96));
  } else if (drag.handle === "start") {
    item.x = Math.round(clamp(pointerX, 4, item.endX - 5));
  } else if (item.shape === "range") {
    const duration = drag.originalEndX - drag.originalX;
    item.x = Math.round(clamp(drag.originalX + pointerX - drag.pointerX, 4, 96 - duration));
    item.endX = item.x + duration;
  } else {
    item.x = Math.round(clamp(pointerX, 4, 96));
  }
  if (Math.abs(event.clientY - drag.startY) > 12) {
    const pointerLane = event.clientY < rect.top + rect.height / 2 ? "above" : "below";
    // Kiểm tra nếu đổi lane có gây mất cân bằng không
    const othersAbove = state.events.filter((e) => e.id !== item.id && e.lane === "above").length;
    const othersBelow = state.events.filter((e) => e.id !== item.id && e.lane === "below").length;
    // Chỉ cho đổi lane nếu phía đó không vượt quá phía kia quá 1
    if (Math.abs((pointerLane === "above" ? othersAbove + 1 : othersAbove) - (pointerLane === "below" ? othersBelow + 1 : othersBelow)) <= 1) {
      item.lane = pointerLane;
    }
  }
  renderTimeline();
}

function endDrag(event) {
  if (finishStageCreate(event)) return;
  if (nowDrag) {
    nowDrag = false;
    els.nowMarker.classList.remove("is-dragging");
    autoResetTenses();
    renderTimeline();
    scheduleSave();
    return;
  }
  if (!drag) return;
  drag = null;
  autoResetTenses();
  renderTimeline();
  scheduleSave();
}

function autoResetTenses() {
  if (!state.showTenseExplain) return;
  state.events.forEach((item) => {
    if (!item.tense) return; // đang dùng gợi ý tự động, không cần reset
    const suggested = TimelineMath.suggestTense(item, state.events, state.nowX);
    // Reset nếu gợi ý tự động rõ ràng và khác với thì đang chọn
    if (suggested && suggested !== item.tense) { item.tense = null; return; }
    // Reset nếu tense đang chọn thuộc nhóm sai timeframe
    // (vd: kéo event từ quá khứ sang tương lai mà vẫn giữ tense quá khứ)
    // Ngoại lệ: Hiện tại hoàn thành (present_perfect_simple/_just) thuộc nhóm
    // "present" nhưng là lựa chọn HỢP LỆ có chủ đích cho một sự kiện đang ở
    // vùng quá khứ (tách thành sự kiện độc lập, không nêu mốc cụ thể) — không
    // được reset chỉ vì nhóm không khớp timeframe quá khứ.
    const isPresentPerfectVariant = item.tense === "present_perfect_simple" || item.tense === "present_perfect_simple_just";
    const tenseGroup = TimelineMath.TENSES[item.tense]?.group;
    const timeFrame = TimelineMath.classifyEventTime(item, state.nowX);
    const expectedGroup = timeFrame === "past" ? "past" : timeFrame === "future" ? "future" : "present";
    const groupMismatch = tenseGroup && tenseGroup !== expectedGroup && !(isPresentPerfectVariant && timeFrame !== "future");
    if (groupMismatch) item.tense = null;
  });
}

// Sau khi xóa event, cân bằng lại lane above/below để tránh lệch quá nhiều.
// Thuật toán: sắp xếp theo x, lần lượt gán lane sao cho chênh lệch above-below <= 1.
function rebalanceLanes() {
  if (!state.events.length) return;
  const above = state.events.filter((e) => e.lane === "above").length;
  const below = state.events.filter((e) => e.lane === "below").length;
  if (Math.abs(above - below) <= 1) return; // đã cân bằng
  // Lấy lane thừa và dịch chuyển event gần giữa nhất sang lane thiếu
  const surplus = above > below ? "above" : "below";
  const deficit = surplus === "above" ? "below" : "above";
  const candidates = state.events
    .filter((e) => e.lane === surplus)
    .sort((a, b) => {
      const ca = a.shape === "range" ? (a.x + a.endX) / 2 : a.x;
      const cb = b.shape === "range" ? (b.x + b.endX) / 2 : b.x;
      return Math.abs(ca - 50) - Math.abs(cb - 50);
    });
  const toMove = Math.floor((Math.abs(above - below)) / 2);
  candidates.slice(0, toMove).forEach((e) => { e.lane = deficit; });
}

function updateTenseWarnings() {
  if (!state.showTenseExplain) return;
  els.layer.querySelectorAll(".timeline-event").forEach((node) => {
    const item = state.events.find((e) => e.id === node.dataset.id);
    if (!item) return;
    const tenseRow = node.querySelector(".tense-row");
    const tenseSelect = node.querySelector(".tense-select");
    if (!tenseRow || !tenseSelect) return;
    const suggested = TimelineMath.suggestTense(item, state.events, state.nowX);
    // Tô vàng khi: ngữ cảnh mơ hồ (không có gợi ý tự động) VÀ người dùng chưa chọn tay
    const needsChoice = !suggested && !item.tense;
    tenseRow.classList.toggle("is-stale", needsChoice);
    tenseSelect.classList.toggle("is-stale", needsChoice);
  });
}

function renderConceptQuestions() {
  els.ccqToggle.textContent = state.showCcqAnswers ? "Ẩn đáp án" : "Hiện đáp án";
  els.ccqToggle.setAttribute("aria-pressed", String(state.showCcqAnswers));
  els.ccqToggle.disabled = state.events.length === 0;
  els.tenseExplainToggle.textContent = state.showTenseExplain ? "Ẩn giải thích thì" : "Tự suy luận thì";
  els.tenseExplainToggle.setAttribute("aria-pressed", String(state.showTenseExplain));
  els.tenseExplainToggle.disabled = state.events.length === 0;

  if (!state.events.length) {
    els.ccqList.innerHTML = `<p class="ccq-empty">Hãy thêm một sự kiện để tạo câu hỏi kiểm tra khái niệm.</p>`;
    els.layer.querySelectorAll(".tense-row, .tense-select").forEach((el) => el.classList.remove("is-stale"));
    return;
  }

  const frameLabels = { past: "Quá khứ", future: "Tương lai", present: "Hiện tại" };
  els.ccqList.innerHTML = state.events.map((item) => {
    const questions = TimelineMath.buildConceptQuestions(item, state.events, state.nowX);
    const explanation = TimelineMath.explainTense(item, state.events, state.nowX);
    const resolvedTense = explanation.suggested || item.tense;
    const tenseAnswer = resolvedTense
      ? TimelineMath.TENSES[resolvedTense].label
      : "Tùy ngữ cảnh";
    questions.push({ question: "Sự kiện này nên dùng thì gì?", answer: tenseAnswer });
    const timeFrame = TimelineMath.classifyEventTime(item, state.nowX);
    const kind = item.shape === "range" ? "Hành động diễn ra liên tục" : "Một thời điểm";
    const time = item.timestamp?.trim();
    const frameLabel = frameLabels[timeFrame] || timeFrame;
    const meta = time ? `${frameLabel} · ${kind} · ${time}` : `${frameLabel} · ${kind}`;
    const tenseExplainHtml = state.showTenseExplain ? `
        <div class="ccq-tense-explain">
          <p class="ccq-tense-reason"><strong>${item.tense ? "Đã chọn tay:" : explanation.suggested ? "Gợi ý tự động:" : "Cần chọn tay:"}</strong> ${escapeHtml(explanation.reason)}</p>
          ${explanation.alternatives.length ? `
          <p class="ccq-tense-alt-label">Các thì khác có thể dùng:</p>
          <ul class="ccq-tense-alt-list">
            ${explanation.alternatives.map((alt) => `<li><button class="ccq-tense-alt-btn" data-event-id="${escapeAttribute(item.id)}" data-tense-key="${escapeAttribute(alt.id)}">${escapeHtml(alt.label)}</button> — ${escapeHtml(alt.reason)}</li>`).join("")}
          </ul>` : ""}
        </div>` : "";
    return `
      <article class="ccq-card" style="--event-color:${item.color}">
        <header class="ccq-card-heading">
          <i aria-hidden="true"></i>
          <div><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(meta)}</p></div>
        </header>
        <ol class="ccq-list">
          ${questions.map(({ question, answer }) => `
            <li><span class="ccq-question">${escapeHtml(question)}</span><strong class="ccq-answer" ${state.showCcqAnswers ? "" : "hidden"}>${escapeHtml(answer)}</strong></li>`).join("")}
        </ol>
        ${tenseExplainHtml}
      </article>`;
  }).join("");

  els.ccqList.querySelectorAll(".ccq-tense-alt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const eventItem = state.events.find((e) => e.id === btn.dataset.eventId);
      if (!eventItem) return;
      recordHistory(`event-tense-${eventItem.id}`);
      eventItem.tense = btn.dataset.tenseKey || null;
      // Nếu là cặp overlap future range → tự set tense cho sự kiện kia
      if (eventItem.tense === "future_continuous" || eventItem.tense === "future_present_simple") {
        const partner = state.events.find((e) => e.id !== eventItem.id
          && e.shape === "range"
          && TimelineMath.classifyEventTime(e, state.nowX) === "future"
          && Number(eventItem.x) < Number(e.endX) && Number(e.x) < Number(eventItem.endX));
        if (partner) {
          partner.tense = eventItem.tense === "future_continuous" ? "future_present_simple" : "future_continuous";
        }
      }
      renderTimeline();
      scheduleSave();
    });
  });
  updateTenseWarnings();
}

function renderParagraphTools(updateParagraph = true) {
  els.linkToolbar.innerHTML = state.events.length
    ? state.events.map((item) => `<button class="link-chip" style="--event-color:${item.color}" data-id="${item.id}" type="button"><i></i>${escapeHtml(item.label)}</button>`).join("") + `<button class="unlink-button" type="button">Xóa liên kết</button>`
    : `<span class="toolbar-empty">Hãy thêm một sự kiện trước khi liên kết từ.</span>`;

  els.linkToolbar.querySelectorAll(".link-chip").forEach((button) => {
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => linkSelection(button.dataset.id));
  });
  els.linkToolbar.querySelector(".unlink-button")?.addEventListener("click", () => {
    if (!state.links.length) return;
    recordHistory("clear-links");
    state.links = [];
    renderParagraph();
    scheduleSave();
  });
  if (updateParagraph) renderParagraph();
}

function renderParagraph() {
  els.editor.innerHTML = buildHighlightedText();
  if (!state.sentence) els.editor.dataset.empty = "true";
  else delete els.editor.dataset.empty;
}

function linkSelection(eventId) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return showSelectionHint();
  const range = selection.getRangeAt(0);
  if (!els.editor.contains(range.commonAncestorContainer) || range.collapsed) return showSelectionHint();

  const before = range.cloneRange();
  before.selectNodeContents(els.editor);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  const end = start + range.toString().length;
  recordHistory("link-selection");
  state.sentence = els.editor.innerText.replace(/\n$/, "");
  state.links = state.links.filter((link) => link.end <= start || link.start >= end);
  state.links.push({ eventId, start, end });
  state.links.sort((a, b) => a.start - b.start);
  renderParagraph();
  scheduleSave();
  showToast("Đã liên kết từ với sự kiện");
}

function showSelectionHint() {
  showToast("Hãy bôi đen một số từ trong đoạn văn trước");
  els.editor.focus();
}

function buildHighlightedText() {
  if (!state.sentence) return "";
  const links = [...state.links].filter((link) => link.start >= 0 && link.end <= state.sentence.length).sort((a, b) => a.start - b.start);
  let cursor = 0;
  let html = "";
  links.forEach((link) => {
    const item = state.events.find((event) => event.id === link.eventId);
    if (!item || link.start < cursor) return;
    html += escapeHtml(state.sentence.slice(cursor, link.start));
    html += `<mark style="--mark:${item.color}" title="${escapeAttribute(item.label)}">${escapeHtml(state.sentence.slice(link.start, link.end))}</mark>`;
    cursor = link.end;
  });
  return html + escapeHtml(state.sentence.slice(cursor));
}

function addEvent(x = null, options = {}) {
  recordHistory("add-event");
  const index = state.events.length;
  const eventX = x ?? clamp(25 + index * 15, 10, 90);
  const aboveCount = state.events.filter((e) => e.lane === "above").length;
  const belowCount = state.events.filter((e) => e.lane === "below").length;
  const lane = aboveCount <= belowCount ? "above" : "below";
  const item = {
    id: makeId(), label: `Sự kiện ${index + 1}`, timestamp: "", color: nextEventColour(state.events),
    x: eventX, lane, shape: options.shape || "point", tense: null,
  };
  item.endX = clamp(options.endX ?? item.x + 18, item.x + 5, 96);
  state.events.push(item);
  render();
  scheduleSave();
  requestAnimationFrame(() => {
    const input = els.layer.querySelector(`[data-id="${item.id}"] .inline-name`);
    input?.focus();
    input?.select();
  });
}

function deleteEvent(id) {
  recordHistory(`delete-event-${id}`);
  state.events = state.events.filter((item) => item.id !== id);
  state.links = state.links.filter((link) => link.eventId !== id);
  autoResetTenses();
  rebalanceLanes();
  render();
  scheduleSave();
}

function scheduleSave() {
  els.savedState.textContent = "Đang lưu…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 350);
}

function setTextSize(value, save = true) {
  const nextSize = clamp(Math.round(Number(value) || 24), 16, 48);
  if (save && nextSize !== state.textSize) recordHistory("text-size", true);
  state.textSize = nextSize;
  document.documentElement.style.setProperty("--readability-size", `${state.textSize}px`);
  els.textSizeRange.value = state.textSize;
  els.textSizeValue.textContent = `${state.textSize}px`;
  requestAnimationFrame(() => {
    els.layer.querySelectorAll(".inline-name").forEach((field) => resizeEventName(field, false));
    scheduleCollisionLayout();
  });
  if (save) scheduleSave();
}

function snapshotState() {
  const { showCcqAnswers: _viewPreference, showTenseExplain: _viewPreference2, ...project } = state;
  return JSON.stringify(project);
}

function recordHistory(key, coalesce = false) {
  projectHistory.record(snapshotState(), key, coalesce ? 900 : 0);
  updateHistoryButtons();
}

function updateHistoryButtons() {
  els.undoButton.disabled = !projectHistory.canUndo;
  els.redoButton.disabled = !projectHistory.canRedo;
}

function restoreHistorySnapshot(snapshot, message) {
  const showCcqAnswers = state.showCcqAnswers;
  const showTenseExplain = state.showTenseExplain;
  state = { ...JSON.parse(snapshot), showCcqAnswers, showTenseExplain };
  setTextSize(state.textSize, false);
  setNowPosition(state.nowX, false);
  render();
  saveNow();
  updateHistoryButtons();
  showToast(message);
}

function undoHistory() {
  const snapshot = projectHistory.undo(snapshotState());
  if (!snapshot) return showToast("Không còn gì để hoàn tác");
  restoreHistorySnapshot(snapshot, "Đã hoàn tác thay đổi");
}

function redoHistory() {
  const snapshot = projectHistory.redo(snapshotState());
  if (!snapshot) return showToast("Không còn gì để làm lại");
  restoreHistorySnapshot(snapshot, "Đã làm lại thay đổi");
}

function nextEventColour(events, excludeId = null) {
  const usedColours = events.filter((item) => item.id !== excludeId).map((item) => item.color);
  return TimelineMath.nextUniqueColor(usedColours, PALETTE);
}

function ensureUniqueEventColours(events) {
  const usedColours = [];
  events.forEach((item) => {
    const colour = /^#[0-9a-f]{6}$/i.test(item.color || "") ? item.color.toLowerCase() : null;
    item.color = colour && !usedColours.includes(colour)
      ? colour
      : TimelineMath.nextUniqueColor(usedColours, PALETTE);
    usedColours.push(item.color.toLowerCase());
  });
}

function saveNow() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  els.savedState.textContent = "Đã lưu trên máy";
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  setTimeout(() => els.toast.classList.remove("is-visible"), 2200);
}

function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function makeId() { return globalThis.crypto?.randomUUID?.() || `event-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function escapeHtml(value) { return String(value).replace(/[&<>'\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '\"': "&quot;" })[char]); }
function escapeAttribute(value) { return escapeHtml(value); }

init();