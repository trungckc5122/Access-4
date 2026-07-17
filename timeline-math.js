(function exposeTimelineMath(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TimelineMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTimelineMath() {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function assignWaveTracks(events, gap = 1) {
    const tracks = {};
    const trackEnds = [];
    const ranges = events
      .filter((item) => item.shape === "range")
      .map((item) => ({ ...item, x: Number(item.x), endX: Number(item.endX) }))
      .sort((a, b) => a.x - b.x || a.endX - b.endX || String(a.id).localeCompare(String(b.id)));

    ranges.forEach((item) => {
      let track = trackEnds.findIndex((end) => end + gap <= item.x);
      if (track === -1) track = trackEnds.length;
      trackEnds[track] = item.endX;
      tracks[item.id] = {
        track,
        side: track % 2 === 0 ? "above" : "below",
        level: Math.floor(track / 2),
      };
    });

    return tracks;
  }

  function rangeFromDrag(startValue, endValue, min = 4, max = 96, minSpan = 5) {
    const direction = Number(endValue) >= Number(startValue) ? 1 : -1;
    let start = clamp(Number(startValue), min, max);
    let end = clamp(Number(endValue), min, max);

    if (Math.abs(end - start) < minSpan) {
      if (direction > 0) {
        end = Math.min(max, start + minSpan);
        start = end - minSpan;
      } else {
        start = Math.max(min, start - minSpan);
        end = start + minSpan;
      }
    }

    return {
      x: Math.round(Math.min(start, end)),
      endX: Math.round(Math.max(start, end)),
    };
  }

  function isAlongTimeline(clientY, stageRect, tolerance = 28) {
    const axisY = Number(stageRect.top) + Number(stageRect.height) / 2;
    return Math.abs(Number(clientY) - axisY) <= tolerance;
  }

  function buildConceptQuestions(item, events = [], nowX = 78) {
    const timestamp = String(item.timestamp || "").trim();
    const isContinuous = item.shape === "range";
    const timeFrame = classifyEventTime(item, nowX);
    const questions = [];
    const lead = timestamp ? `Ở thời điểm “${timestamp}”, ` : "";

    questions.push({
      question: `${lead}đây là A) một thời điểm hay B) diễn ra liên tục?`,
      answer: isContinuous ? "B) Diễn ra liên tục" : "A) Một thời điểm",
    });

    const nowQuestion = isContinuous
      ? "Việc này đang diễn ra trước, đúng lúc, hay sau mốc Hiện tại (NOW)?"
      : "Việc này xảy ra trước, đúng lúc, hay sau mốc Hiện tại (NOW)?";
    questions.push({
      question: nowQuestion,
      answer: describeNowPosition(item, nowX),
    });

    const relationship = buildRelationshipQuestion(item, events, timeFrame);
    if (relationship) questions.push(relationship);
    return questions;
  }

  function positionRelativeToNow(value, nowX, tolerance = 1) {
    if (Number(value) < Number(nowX) - tolerance) return "before";
    if (Number(value) > Number(nowX) + tolerance) return "after";
    return "at";
  }

  // A point is simply before/at/after NOW. A range can start and end in
  // different zones (e.g. start before NOW, end after it) — a flat "at NOW"
  // answer would misrepresent that, so ranges get a position pair described
  // in full instead of being squeezed into a single bucket.
  function describeNowPosition(item, nowX = 78) {
    const startPos = positionRelativeToNow(item.x, nowX);
    if (item.shape !== "range") {
      return startPos === "before" ? "Trước NOW" : startPos === "after" ? "Sau NOW" : "Đúng lúc NOW";
    }

    const endPos = positionRelativeToNow(item.endX, nowX);
    if (startPos === "before" && endPos === "after") return "Bắt đầu trước NOW, đang tiếp diễn qua NOW và còn kéo dài đến sau NOW";
    if (startPos === "before" && endPos === "at") return "Bắt đầu trước NOW, và đang diễn ra đúng lúc NOW";
    if (startPos === "at" && endPos === "after") return "Bắt đầu đúng lúc NOW, và còn tiếp diễn đến sau NOW";
    if (startPos === "before" && endPos === "before") return "Trước NOW";
    if (startPos === "after" && endPos === "after") return "Sau NOW";
    return "Đúng lúc NOW";
  }

  function classifyEventTime(item, nowX = 78, tolerance = 1) {
    const start = Number(item.x);
    const end = item.shape === "range" ? Number(item.endX) : start;
    if (end < Number(nowX) - tolerance) return "past";
    if (start > Number(nowX) + tolerance) return "future";
    return "present";
  }

  function buildRelationshipQuestion(item, events, timeFrame) {
    const others = events.filter((event) => event.id !== item.id && event.label);
    if (!others.length) return null;

    if (item.shape === "range") {
      const containedMoment = others
        .filter((event) => event.shape !== "range" && Number(event.x) >= Number(item.x) && Number(event.x) <= Number(item.endX))
        .sort((a, b) => Number(b.x) - Number(a.x))[0];
      if (!containedMoment) return null;
      return { question: `Vào lúc “${containedMoment.label}”, việc này có đang diễn ra không?`, answer: "Có" };
    }

    const containingRange = others.find((event) => event.shape === "range" && Number(item.x) >= Number(event.x) && Number(item.x) <= Number(event.endX));
    if (containingRange) return null;

    const nearest = [...others].sort((a, b) => Math.abs(eventCenter(a) - Number(item.x)) - Math.abs(eventCenter(b) - Number(item.x)))[0];
    if (!nearest || eventCenter(item) <= eventCenter(nearest)) return null;
    return {
      question: `Việc nào xảy ra trước: sự kiện này hay “${nearest.label}”?`,
      answer: `“${nearest.label}”`,
    };
  }

  function eventCenter(item) {
    return item.shape === "range" ? (Number(item.x) + Number(item.endX)) / 2 : Number(item.x);
  }

  function createHistory(limit = 60) {
    const undoStack = [];
    const redoStack = [];
    let lastKey = "";
    let lastRecordedAt = 0;

    function resetCoalescing() {
      lastKey = "";
      lastRecordedAt = 0;
    }

    function push(stack, snapshot) {
      if (stack.at(-1) === snapshot) return false;
      stack.push(snapshot);
      if (stack.length > limit) stack.splice(0, stack.length - limit);
      return true;
    }

    return {
      record(snapshot, key = "", coalesceWindow = 0, recordedAt = Date.now()) {
        const canCoalesce = Boolean(
          coalesceWindow && key && key === lastKey && recordedAt - lastRecordedAt <= coalesceWindow && undoStack.length,
        );
        const recorded = canCoalesce ? false : push(undoStack, snapshot);
        redoStack.length = 0;
        lastKey = key;
        lastRecordedAt = recordedAt;
        return recorded;
      },
      undo(currentSnapshot) {
        resetCoalescing();
        while (undoStack.length) {
          const snapshot = undoStack.pop();
          if (snapshot === currentSnapshot) continue;
          push(redoStack, currentSnapshot);
          return snapshot;
        }
        return null;
      },
      redo(currentSnapshot) {
        resetCoalescing();
        while (redoStack.length) {
          const snapshot = redoStack.pop();
          if (snapshot === currentSnapshot) continue;
          push(undoStack, currentSnapshot);
          return snapshot;
        }
        return null;
      },
      resetCoalescing,
      get canUndo() { return undoStack.length > 0; },
      get canRedo() { return redoStack.length > 0; },
    };
  }

  function nextUniqueColor(usedColors = [], palette = []) {
    const used = new Set(usedColors.map((color) => String(color).toLowerCase()));
    const available = palette.find((color) => !used.has(String(color).toLowerCase()));
    if (available) return available;

    for (let index = 0; index < 360; index += 1) {
      const hue = (index * 137.508) % 360;
      const color = hslToHex(hue, 68, 42);
      if (!used.has(color.toLowerCase())) return color;
    }
    return "#333333";
  }

  function hslToHex(hue, saturation, lightness) {
    const s = saturation / 100;
    const l = lightness / 100;
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const section = hue / 60;
    const secondary = chroma * (1 - Math.abs((section % 2) - 1));
    const [red, green, blue] = section < 1 ? [chroma, secondary, 0]
      : section < 2 ? [secondary, chroma, 0]
        : section < 3 ? [0, chroma, secondary]
          : section < 4 ? [0, secondary, chroma]
            : section < 5 ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
    const match = l - chroma / 2;
    return `#${[red, green, blue].map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0")).join("")}`;
  }

  const TENSES = {
    past_simple: { label: "Quá khứ đơn", group: "past" },
    past_continuous: { label: "Quá khứ tiếp diễn", group: "past" },
    past_perfect_simple: { label: "Quá khứ hoàn thành", group: "past" },
    past_perfect_continuous: { label: "Quá khứ hoàn thành tiếp diễn", group: "past" },
    present_simple: { label: "Hiện tại đơn", group: "present" },
    present_continuous: { label: "Hiện tại tiếp diễn", group: "present" },
    present_continuous_habit: { label: "Hiện tại tiếp diễn (thói quen)", group: "present" },
    present_continuous_trend: { label: "Hiện tại tiếp diễn (xu hướng)", group: "present" },
    present_perfect_simple: { label: "Hiện tại hoàn thành", group: "present" },
    present_perfect_continuous: { label: "Hiện tại hoàn thành tiếp diễn", group: "present" },
    future_will: { label: "Tương lai đơn (will)", group: "future" },
    future_going_to: { label: "Be going to", group: "future" },
    future_present_continuous: { label: "Hiện tại tiếp diễn (chỉ tương lai)", group: "future" },
    future_present_simple: { label: "Hiện tại đơn (chỉ tương lai)", group: "future" },
    future_continuous: { label: "Tương lai tiếp diễn", group: "future" },
    future_continuous_course: { label: "Tương lai tiếp diễn (diễn ra theo lẽ thường)", group: "future" },
    future_perfect_simple: { label: "Tương lai hoàn thành", group: "future" },
    future_perfect_continuous: { label: "Tương lai hoàn thành tiếp diễn", group: "future" },
  };

  // One canonical, affirmative, active-voice Ronaldo example per tense —
  // used verbatim whenever a teacher manually picks a tense from the dropdown.
  const TENSE_EXAMPLES = {
    past_simple: "Ronaldo scored a hat-trick.",
    past_continuous: "Ronaldo was training at the gym.",
    past_perfect_simple: "Ronaldo had already scored before half-time.",
    past_perfect_continuous: "Ronaldo had been playing for Manchester United for six years.",
    present_simple: "Ronaldo trains every morning.",
    present_continuous: "Ronaldo is warming up right now.",
    present_continuous_habit: "Ronaldo is always arriving late to training.",
    present_continuous_trend: "Ronaldo is getting better every season.",
    present_perfect_simple: "Ronaldo has won five Ballon d'Or awards.",
    present_perfect_continuous: "Ronaldo has been playing football for over 20 years.",
    future_will: "Ronaldo will retire one day.",
    future_going_to: "Ronaldo is going to join a new club.",
    future_present_continuous: "Ronaldo is meeting his coach tomorrow.",
    future_present_simple: "Ronaldo's flight leaves at nine tomorrow.",
    future_continuous: "Ronaldo will be training at this time tomorrow.",
    future_continuous_course: "Ronaldo's team will be arriving on Thursday.",
    future_perfect_simple: "Ronaldo will have scored 900 goals by next year.",
    future_perfect_continuous: "Ronaldo will have been playing for 25 years by 2030.",
  };

  // Suggests a tense from structural signals only (shape, position vs NOW, containment).
  // Returns null whenever the correct tense genuinely depends on teacher intent
  // (all future events, and past events whose relationship to another past event
  // is sequential rather than containment) — those are left for manual selection.
  // A range that starts right at NOW (nothing precedes it) is unambiguously
  // "happening now" (Present Continuous). A range that starts before NOW —
  // however briefly — has elapsed duration behind it, so it's just as
  // plausibly "continuing up to now" (Present Perfect Continuous) as it is
  // "happening right now" — that's a matter of emphasis, not geometry, so
  // it's left for the teacher to pick.

  // A standalone past event that ended only shortly before NOW is just as
  // plausibly "completed recently" / "relevant to the present" (Present
  // Perfect) as it is a plain narrated Simple Past — that's a matter of
  // emphasis, not geometry, so it's left for the teacher to pick too.
  const RECENCY_THRESHOLD = 12;

  function suggestTense(item, events = [], nowX = 78) {
    const timeFrame = classifyEventTime(item, nowX);

    const isRange = item.shape === "range";
    const others = events.filter((event) => event.id !== item.id);

    if (timeFrame === "future") {
      const itemEnd = isRange ? Number(item.endX) : Number(item.x);
      const otherEnd = (event) => (event.shape === "range" ? Number(event.endX) : Number(event.x));

      if (isRange) {
        const containsPoint = others.some((event) => event.shape !== "range"
          && classifyEventTime(event, nowX) === "future"
          && Number(event.x) >= Number(item.x) && Number(event.x) <= Number(item.endX));
        if (containsPoint) return "future_continuous";

        const overlappingFutureRange = others.find((event) => event.shape === "range"
          && classifyEventTime(event, nowX) === "future"
          && Number(item.x) < Number(event.endX) && Number(event.x) < Number(item.endX));
        if (overlappingFutureRange) return null;
      } else {
        const containingRange = others.find((event) => event.shape === "range"
          && classifyEventTime(event, nowX) === "future"
          && Number(item.x) >= Number(event.x) && Number(item.x) <= Number(event.endX));
        if (containingRange) return "future_present_simple";
      }

      const precedesAnotherFuture = others.some((event) => classifyEventTime(event, nowX) === "future"
        && itemEnd < Number(event.x));
      if (precedesAnotherFuture) return "future_perfect_simple";

      const followsAnotherFuture = others.some((event) => classifyEventTime(event, nowX) === "future"
        && otherEnd(event) < Number(item.x));
      if (followsAnotherFuture) return "future_present_simple";

      return isRange ? "future_continuous" : null;
    }

    if (timeFrame === "present") {
      if (!isRange) return "present_simple";
      const startPos = positionRelativeToNow(item.x, nowX);
      const endPos = positionRelativeToNow(item.endX, nowX);
      // Full span across NOW (already running before it, still going after it)
      // is genuinely ambiguous between "happening now" and "continuing up to
      // now" framings — left for the teacher. The other two boundary cases
      // read confidently as Present Continuous.
      return startPos === "before" && endPos === "after" ? null : "present_continuous";
    }

    if (isRange) {
      const containsPoint = others.some((event) => event.shape !== "range"
        && Number(event.x) >= Number(item.x) && Number(event.x) <= Number(item.endX));
      if (containsPoint) return "past_continuous";

      // Two ranges genuinely overlapping in time (interval intersection) read
      // as simultaneous background actions, regardless of which started first.
      const overlapsAnotherPastRange = others.some((event) => event.shape === "range"
        && classifyEventTime(event, nowX) === "past"
        && Number(item.x) < Number(event.endX) && Number(event.x) < Number(item.endX));
      if (overlapsAnotherPastRange) return "past_continuous";

      const hasSequentialPastNeighbour = others.some((event) => classifyEventTime(event, nowX) === "past");
      if (hasSequentialPastNeighbour) return null;

      const recentness = Number(nowX) - Number(item.endX);
      return recentness <= RECENCY_THRESHOLD ? null : "past_continuous";
    }

    const containingRange = others.find((event) => event.shape === "range"
      && Number(item.x) >= Number(event.x) && Number(item.x) <= Number(event.endX));
    if (containingRange) return "past_simple";

    const hasOtherPastEvent = others.some((event) => classifyEventTime(event, nowX) === "past");
    if (hasOtherPastEvent) return null;

    const recentness = Number(nowX) - Number(item.x);
    return recentness <= RECENCY_THRESHOLD ? null : "past_simple";
  }

  function tenseRef(id, reason) {
    return { id, label: TENSES[id].label, reason, example: { text: TENSE_EXAMPLES[id], underline: null } };
  }

  function explainTense(item, events = [], nowX = 78) {
    const timeFrame = classifyEventTime(item, nowX);
    const isRange = item.shape === "range";
    const others = events.filter((event) => event.id !== item.id);

    if (timeFrame === "future") {
      const itemEnd = isRange ? Number(item.endX) : Number(item.x);
      const otherEnd = (event) => (event.shape === "range" ? Number(event.endX) : Number(event.x));

      if (isRange) {
        const containsPoint = others.some((event) => event.shape !== "range"
          && classifyEventTime(event, nowX) === "future"
          && Number(event.x) >= Number(item.x) && Number(event.x) <= Number(item.endX));
        if (containsPoint) {
          return {
            suggested: "future_continuous",
            reason: "Hành động này sẽ đang diễn ra tại một thời điểm cụ thể trong tương lai, có bối cảnh, thời gian xác định bởi 1 sự kiện nào đó. Bối cảnh này chia ở hiện tại đơn.",
            example: { text: "Ronaldo will be training when the new season starts.", underline: "Ronaldo will be training" },
            alternatives: [],
          };
        }

        const overlappingFutureRange = others.find((event) => event.shape === "range"
          && classifyEventTime(event, nowX) === "future"
          && Number(item.x) < Number(event.endX) && Number(event.x) < Number(item.endX));
        if (overlappingFutureRange) {
          const thisTense = item.tense;
          const otherTense = overlappingFutureRange.tense;
          // Khi đã chọn thì cho cả 2 → trả về example đúng với vai trò đã chọn
          const resolvedThis = thisTense || null;
          let exampleObj = null;
          if (resolvedThis === "future_continuous") {
            exampleObj = { text: "Ronaldo will be resting while the team travels.", underline: "Ronaldo will be resting" };
          } else if (resolvedThis === "future_present_simple") {
            exampleObj = { text: "Ronaldo will be resting while the team travels.", underline: "the team travels" };
          }
          return {
            suggested: null,
            reason: "Hai hành động xảy ra song song trong tương lai. Cấu trúc ngữ pháp bắt buộc: mệnh đề chứa \"while\" dùng Hiện tại đơn, hành động chính muốn nhấn mạnh sự kéo dài dùng Tương lai tiếp diễn. Việc phân chia không dựa trên mức độ quan trọng mà dựa trên vai trò ngữ pháp bạn chọn cho từng hành động.",
            example: exampleObj,
            alternatives: [
              { id: "future_continuous", label: "Tương lai tiếp diễn", reason: "Hành động chính — hành động bạn muốn nhấn mạnh sự kéo dài, đang diễn ra khi hành động kia xảy ra.", example: { text: "Ronaldo will be resting while the team travels.", underline: "Ronaldo will be resting" } },
              { id: "future_present_simple", label: "Hiện tại đơn (chỉ tương lai)", reason: "Mệnh đề nền — đứng trong mệnh đề \"while\", xác định bối cảnh thời gian cho hành động chính. Bắt buộc dùng Hiện tại đơn dù mang nghĩa tương lai.", example: { text: "Ronaldo will be resting while the team travels.", underline: "the team travels" } },
            ],
          };
        }
      } else {
        const containingRange = others.find((event) => event.shape === "range"
          && classifyEventTime(event, nowX) === "future"
          && Number(item.x) >= Number(event.x) && Number(item.x) <= Number(event.endX));
        if (containingRange) {
          return {
            suggested: "future_present_simple",
            reason: "Đây là mốc làm để xác định một hành động khác đang diễn ra liên tục trong tương lai — mốc thời gian kiểu này (trong mệnh đề \"when/after/before...\") luôn chia ở Hiện tại đơn dù mang nghĩa tương lai.",
            example: { text: "Ronaldo will be training when the new season starts.", underline: "the new season starts" },
            alternatives: [],
          };
        }
      }

      const precedesAnotherFuture = others.some((event) => classifyEventTime(event, nowX) === "future"
        && itemEnd < Number(event.x));
      if (precedesAnotherFuture) {
        const usePerfectContinuous = item.tense === "future_perfect_continuous";
        const exText = usePerfectContinuous
          ? "By next month, Ronaldo will have been playing for Al-Nassr for 5 years."
          : "Ronaldo will have finished training by the time the match starts.";
        const exUnderline = usePerfectContinuous
          ? "Ronaldo will have been playing for Al-Nassr for 5 years"
          : "Ronaldo will have finished training";
        return {
          suggested: "future_perfect_simple",
          reason: "Hành động này sẽ hoàn tất TRƯỚC một sự kiện tương lai khác",
          example: { text: exText, underline: exUnderline },
          alternatives: isRange ? [
            { id: "future_perfect_continuous", label: TimelineMath?.TENSES?.future_perfect_continuous?.label || "Tương lai hoàn thành tiếp diễn", reason: "Nếu muốn nhấn mạnh khoảng thời gian đã tiếp diễn liên tục tính đến mốc tương lai kia, thay vì chỉ nói đã hoàn tất.", example: { text: "By next month, Ronaldo will have been playing for Al-Nassr for 5 years.", underline: "Ronaldo will have been playing for Al-Nassr for 5 years" } },
          ] : [],
        };
      }

      const followsAnotherFutureEvent = others.find((event) => classifyEventTime(event, nowX) === "future"
        && otherEnd(event) < Number(item.x));
      if (followsAnotherFutureEvent) {
        const precedingUsesContinuous = followsAnotherFutureEvent.tense === "future_perfect_continuous";
        return {
          suggested: "future_present_simple",
          reason: "Đây là mốc thời gian dùng làm điểm mốc cho một hành động tương lai khác đã hoàn tất trước đó — mốc tham chiếu này luôn chia ở Hiện tại đơn dù mang nghĩa tương lai.",
          example: precedingUsesContinuous
            ? { text: "By next month, Ronaldo will have been playing for Al-Nassr for 5 years.", underline: "next month" }
            : { text: "Ronaldo will have finished training by the time the match starts.", underline: "the match starts" },
          alternatives: [],
        };
      }

      if (isRange) {
        return {
          suggested: null,
          reason: "Sự kiện diễn ra liên tục trong tương lai, đứng độc lập. Tương lai tiếp diễn có thể diễn tả hành động đang xảy ra tại một thời điểm cụ thể, một sự việc diễn ra theo lẽ thường, hoặc một thói quen lặp lại trong tương lai — ba cách dùng này cần ngữ cảnh để phân biệt.",
          alternatives: [
            { id: "future_continuous", label: "Tương lai tiếp diễn", reason: "Hành động sẽ đang diễn ra tại một thời điểm cụ thể trong tương lai.", example: { text: "Ronaldo will be training at this time tomorrow.", underline: null } },
            { id: "future_continuous_course", label: "Tương lai tiếp diễn (diễn ra theo lẽ thường)", reason: "Sự việc sẽ xảy ra theo diễn tiến bình thường — dùng để nói về điều gì đó sắp xảy ra mà không ngụ ý yêu cầu hay đề nghị.", example: { text: "Ronaldo's team will be arriving on Thursday.", underline: null } },
          ],
        };
      }

      return {
        suggested: null,
        reason: "Sự kiện nằm ở tương lai, đứng độc lập (không gián đoạn/không có mốc tương lai nào khác liên quan). Thì phù hợp phụ thuộc vào ý định (dự đoán, dự định có sẵn, lịch trình cố định, sự sắp xếp...) chứ không chỉ vị trí trên dòng thời gian.",
        alternatives: [
          tenseRef("future_will", "Dự đoán chung chung, hoặc quyết định ngay lúc nói."),
          tenseRef("future_going_to", "Dự định đã có từ trước, hoặc dự đoán dựa trên bằng chứng ở hiện tại."),
          tenseRef("future_present_continuous", "Sự sắp xếp, hẹn đã lên kế hoạch cụ thể với người khác."),
          tenseRef("future_present_simple", "Lịch trình, thời gian biểu cố định (giờ tàu, giờ học...)."),
          tenseRef("future_continuous", "Hành động sẽ đang diễn ra tại một thời điểm cụ thể trong tương lai."),
          tenseRef("future_perfect_simple", "Hành động sẽ hoàn tất trước một mốc trong tương lai."),
          tenseRef("future_perfect_continuous", "Hành động tiếp diễn liên tục tính đến một mốc trong tương lai."),
        ],
      };
    }

    if (timeFrame === "present") {
      if (!isRange) {
        return {
          suggested: "present_simple",
          reason: "Đây là một thời điểm đơn lẻ ngay tại mốc Hiện tại (NOW) — khớp với sự thật hiển nhiên, thói quen, hoặc tường thuật trực tiếp (bình luận thể thao, hướng dẫn từng bước...).",
          example: { text: "Ronaldo trains every morning.", underline: null },
          alternatives: [
            tenseRef("present_continuous", "Nếu đây thực chất là một hành động đang xảy ra ngay lúc nói, chưa hoàn tất."),
          ],
        };
      }
      const startPos = positionRelativeToNow(item.x, nowX);
      const endPos = positionRelativeToNow(item.endX, nowX);

      if (startPos === "before" && endPos === "after") {
        return {
          suggested: null,
          reason: "Sự kiện bắt đầu từ trước NOW, đang diễn ra ngay bây giờ, và còn tiếp diễn sang tương lai. Đây có thể là hành động đang xảy ra ngay lúc nói, hoặc một khoảng thời gian đã tiếp diễn tính đến hiện tại — hai cách hiểu này cần thì khác nhau.",
          alternatives: [
            { id: "present_continuous", label: "Hiện tại tiếp diễn", reason: "Hành động đang xảy ra ngay bây giờ, tại thời điểm nói.", example: { text: "Ronaldo is warming up right now.", underline: null } },
            { id: "present_continuous_habit", label: "Hiện tại tiếp diễn (thói quen gây chú ý)", reason: "Diễn tả thói quen lặp đi lặp lại gây bực bội hoặc thú vị — dùng với always/constantly/forever.", example: { text: "Ronaldo is always arriving late to training.", underline: null } },
            { id: "present_continuous_trend", label: "Hiện tại tiếp diễn (xu hướng thay đổi)", reason: "Diễn tả một xu hướng hoặc sự thay đổi đang dần xảy ra trong giai đoạn này.", example: { text: "Ronaldo is getting better every season.", underline: null } },
            tenseRef("present_perfect_continuous", "Nhấn mạnh khoảng thời gian đã tiếp diễn liên tục tính đến hiện tại."),
            tenseRef("present_perfect_simple", "Một tình huống/trạng thái bắt đầu trong quá khứ và vẫn đúng đến bây giờ."),
          ],
        };
      }

      if (startPos === "before" && endPos === "at") {
        return {
          suggested: "present_continuous",
          reason: "Sự kiện bắt đầu từ trước NOW và đang diễn ra đúng lúc NOW — vẫn là một hành động đang tiếp diễn tại thời điểm nói.",
          example: { text: "Ronaldo is finishing his warm-up right now.", underline: null },
          alternatives: [
            tenseRef("present_perfect_continuous", "Nếu muốn nhấn mạnh khoảng thời gian đã tiếp diễn liên tục tính đến hiện tại, thay vì chỉ nói nó đang xảy ra."),
            tenseRef("present_perfect_simple", "Nếu muốn nhấn mạnh đây là một tình huống/trạng thái bắt đầu trong quá khứ và vẫn đúng đến bây giờ."),
          ],
        };
      }

      if (startPos === "at" && endPos === "after") {
        return {
          suggested: "present_continuous",
          reason: "Sự kiện bắt đầu đúng lúc NOW và sẽ còn tiếp diễn sang tương lai - một hành động đang xảy ra, chưa kết thúc.",
          example: { text: "Ronaldo is starting his warm-up right now.", underline: null },
          alternatives: [],
        };
      }

      return {
        suggested: "present_continuous",
        reason: "Hành động đang xảy ra ngay bây giờ, xung quanh mốc Hiện tại (NOW), mang tính tạm thời.",
        example: { text: "Ronaldo is warming up right now.", underline: null },
        alternatives: [],
      };
    }

    // timeFrame === "past"
    if (isRange) {
      const containsPoint = others.some((event) => event.shape !== "range"
        && Number(event.x) >= Number(item.x) && Number(event.x) <= Number(item.endX));
      if (containsPoint) {
        return {
          suggested: "past_continuous",
          reason: "Hành động đang diễn ra trong quá khứ thì bị một sự kiện khác (điểm mốc nằm bên trong) xen vào, làm gián đoạn.",
          example: { text: "Ronaldo was training when the coach arrived.", underline: "Ronaldo was training" },
          alternatives: [
            tenseRef("past_perfect_continuous", "Nếu muốn nhấn mạnh hành động này đã tiếp diễn một khoảng thời gian tính đến mốc gián đoạn đó."),
          ],
        };
      }

      const overlapsAnotherPastRange = others.some((event) => event.shape === "range"
        && classifyEventTime(event, nowX) === "past"
        && Number(item.x) < Number(event.endX) && Number(event.x) < Number(item.endX));
      if (overlapsAnotherPastRange) {
        return {
          suggested: "past_continuous",
          reason: "Hai hành động cùng diễn ra song song, chồng lấn thời gian trong quá khứ.",
          example: { text: "Ronaldo was training while Messi was resting.", underline: null },
          alternatives: [],
        };
      }

      const hasSequentialPastNeighbour = others.some((event) => classifyEventTime(event, nowX) === "past");
      if (hasSequentialPastNeighbour) {
        return {
          suggested: null,
          reason: "Đây là một hành động kéo dài trong quá khứ, xảy ra trước/sau (không chồng lấn) một sự kiện quá khứ khác. Thì phù hợp tùy vào việc bạn muốn kể theo trình tự hay nhấn mạnh nó đã tiếp diễn/hoàn tất trước mốc kia.",
          alternatives: [
            tenseRef("past_continuous", "Kể như một tình huống nền, diễn ra trong quá khứ, không nhấn mạnh trình tự."),
            tenseRef("past_perfect_continuous", "Nhấn mạnh hành động đã tiếp diễn một khoảng thời gian tính đến mốc sự kiện kia."),
          ],
        };
      }

      const recentness = Number(nowX) - Number(item.endX);
      if (recentness <= RECENCY_THRESHOLD) {
        return {
          suggested: null,
          reason: "Hành động này vừa kết thúc, khá gần với mốc Hiện tại (NOW), và không có sự kiện quá khứ nào khác liên quan trực tiếp. Có thể kể như một tình huống đang diễn ra trong quá khứ, hoặc nhấn mạnh nó vừa hoàn tất/còn liên quan đến hiện tại.",
          alternatives: [
            tenseRef("past_continuous", "Kể như một tình huống tạm thời, đang diễn ra trong quá khứ."),
            tenseRef("present_perfect_continuous", "Nhấn mạnh khoảng thời gian đã tiếp diễn, vừa kết thúc gần đây, còn liên quan đến hiện tại."),
            tenseRef("present_perfect_simple", "Nhấn mạnh kết quả/sự liên quan của hành động đến hiện tại."),
          ],
        };
      }

      return {
        suggested: "past_continuous",
        reason: "Hành động diễn ra liên tục trong quá khứ, không có sự kiện quá khứ nào khác liên quan trực tiếp — phù hợp với một tình huống tạm thời hoặc bối cảnh nền.",
        example: { text: "Ronaldo was training at the gym.", underline: null },
        alternatives: [
          tenseRef("past_simple", "Nếu muốn coi đây là một hành động trọn vẹn đã hoàn tất, không nhấn mạnh tính đang-diễn-ra."),
        ],
      };
    }

    const containingRange = others.find((event) => event.shape === "range"
      && Number(item.x) >= Number(event.x) && Number(item.x) <= Number(event.endX));
    if (containingRange) {
      return {
        suggested: "past_simple",
        reason: "Đây là một hành động ngắn, xen vào và làm gián đoạn một hành động khác đang diễn ra liên tục trong quá khứ.",
        example: { text: "Ronaldo was training when the coach arrived.", underline: "the coach arrived" },
        alternatives: [],
      };
    }

    const hasOtherPastEvent = others.some((event) => classifyEventTime(event, nowX) === "past");
    if (hasOtherPastEvent) {
      const otherPastEvent = others.find((event) => classifyEventTime(event, nowX) === "past");
      const isEarlier = otherPastEvent && Number(item.x) < eventCenter(otherPastEvent);
      const otherTense = otherPastEvent?.tense;
      const thisTense = item.tense;

      // Nhánh: một bên past_perfect_simple, bên kia past_simple (hoặc ngược lại)
      const isPerfectSimplePair = (thisTense === "past_perfect_simple" && otherTense === "past_simple")
        || (thisTense === "past_simple" && otherTense === "past_perfect_simple")
        || (!thisTense && otherTense === "past_perfect_simple")
        || (thisTense === "past_perfect_simple" && !otherTense);

      if (isPerfectSimplePair) {
        // Ví dụ: sự kiện trước (past_perfect) gạch "had already scored", sau (past_simple) gạch "the final whistle blew"
        const ppText = "Ronaldo had already scored before the final whistle blew.";
        const ppUnderline = (thisTense === "past_perfect_simple" || (!thisTense && isEarlier))
          ? "Ronaldo had already scored"
          : "the final whistle blew";
        return {
          suggested: null,
          reason: "Có một sự kiện quá khứ khác không lồng vào sự kiện này. Nếu đây chỉ là một sự kiện tiếp theo trong chuỗi câu chuyện, dùng Quá khứ đơn cho cả hai; nếu muốn nhấn mạnh sự kiện này đã xảy ra/hoàn tất TRƯỚC sự kiện quá khứ kia, dùng Quá khứ hoàn thành.",
          example: { text: ppText, underline: ppUnderline },
          alternatives: [
            tenseRef("past_simple", "Một trong các sự kiện chính, kể theo trình tự thời gian."),
            tenseRef("past_perfect_simple", "Đã hoàn tất trước một mốc quá khứ khác, muốn nhấn mạnh trình tự trước-sau."),
          ],
        };
      }

      // Nhánh mặc định: cả hai past_simple hoặc chưa chọn
      const bothPastSimple = (thisTense === "past_simple" && otherTense === "past_simple");
      const exampleText = "Ronaldo scored a hat-trick. Then he shouted: I'm back, I'm back.";
      const exampleUnderline = isEarlier ? "Ronaldo scored a hat-trick" : "he shouted: I'm back, I'm back";
      return {
        suggested: null,
        reason: "Có một sự kiện quá khứ khác không lồng vào sự kiện này. Nếu đây chỉ là một sự kiện tiếp theo trong chuỗi câu chuyện, dùng Quá khứ đơn cho cả hai; nếu muốn nhấn mạnh sự kiện này đã xảy ra/hoàn tất TRƯỚC sự kiện quá khứ kia, dùng Quá khứ hoàn thành.",
        example: bothPastSimple ? { text: exampleText, underline: exampleUnderline } : null,
        alternatives: [
          tenseRef("past_simple", "Một trong các sự kiện chính, kể theo trình tự thời gian."),
          tenseRef("past_perfect_simple", "Đã hoàn tất trước một mốc quá khứ khác, muốn nhấn mạnh trình tự trước-sau."),
        ],
      };
    }

    const recentness = Number(nowX) - Number(item.x);
    if (recentness <= RECENCY_THRESHOLD) {
      return {
        suggested: null,
        reason: "Hành động này vừa mới xảy ra, khá gần với mốc Hiện tại (NOW). Nếu muốn kể như một sự việc đã hoàn tất tại một thời điểm cụ thể, dùng Quá khứ đơn; nếu muốn nhấn mạnh kết quả/sự liên quan của nó đến hiện tại (hoặc không nêu rõ thời điểm cụ thể), dùng Hiện tại hoàn thành.",
        alternatives: [
          tenseRef("past_simple", "Kể như một hành động đã hoàn tất tại một thời điểm cụ thể trong quá khứ."),
          tenseRef("present_perfect_simple", "Nhấn mạnh kết quả ở hiện tại, hoặc thời điểm cụ thể không quan trọng."),
        ],
      };
    }

    return {
      suggested: "past_simple",
      reason: "Một hành động đơn, đã hoàn tất tại một thời điểm cụ thể trong quá khứ.",
      example: { text: "Ronaldo scored a hat-trick.", underline: null },
      alternatives: [],
    };
  }

  return {
    assignWaveTracks, rangeFromDrag, isAlongTimeline, buildConceptQuestions, classifyEventTime,
    createHistory, nextUniqueColor, TENSES, TENSE_EXAMPLES, suggestTense, explainTense,
  };
});