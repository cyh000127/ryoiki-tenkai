(function () {
  function readDimensions(canvas) {
    var ratio = window.devicePixelRatio || 1;
    var width = canvas.clientWidth || 960;
    var height = canvas.clientHeight || 540;

    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }

    return {
      height: height,
      ratio: ratio,
      width: width
    };
  }

  function parseEnvelope(message) {
    try {
      return JSON.parse(message);
    } catch (error) {
      return null;
    }
  }

  function createState(config) {
    return {
      action: null,
      animsetId: null,
      battle: null,
      buildVersion: config.productVersion || "prototype-v1",
      practice: null,
      scene: "practice",
      selectedSkill: null,
      summary: null,
      timelineId: "timeline.pending"
    };
  }

  function updateState(state, envelope) {
    if (!envelope || !envelope.type) {
      return;
    }

    switch (envelope.type) {
      case "renderer.bootstrap":
        state.scene = envelope.payload.scene || state.scene;
        state.animsetId = envelope.payload.animsetId || state.animsetId;
        break;
      case "practice.skill_selected":
        state.selectedSkill = envelope.payload;
        state.timelineId = envelope.payload.presentation.timelineId;
        break;
      case "practice.progress_updated":
        state.practice = envelope.payload;
        break;
      case "practice.completed":
        state.practice = state.practice || {};
        state.practice.status = "complete";
        break;
      case "battle.state_snapshot":
        state.battle = envelope.payload;
        state.timelineId = envelope.payload.presentation.timelineId;
        break;
      case "battle.action_resolved":
        state.action = envelope.payload;
        if (envelope.payload.presentation && envelope.payload.presentation.timelineId) {
          state.timelineId = envelope.payload.presentation.timelineId;
        }
        break;
      case "battle.ended":
        state.summary = envelope.payload;
        break;
    }
  }

  function drawBox(ctx, x, y, width, height, label, value) {
    ctx.save();
    ctx.fillStyle = "rgba(9, 18, 28, 0.88)";
    ctx.strokeStyle = "rgba(111, 222, 255, 0.26)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, width, height, 14);
    } else {
      ctx.rect(x, y, width, height);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(180, 214, 230, 0.84)";
    ctx.font = "12px Menlo, monospace";
    ctx.fillText(label, x + 14, y + 20);

    ctx.fillStyle = "#f6fbff";
    ctx.font = "600 16px Menlo, monospace";
    ctx.fillText(value, x + 14, y + 42);
    ctx.restore();
  }

  function drawPractice(ctx, state, width, height) {
    var skillName = state.selectedSkill ? state.selectedSkill.skillName : "Skill pending";
    var practice = state.practice || {
      completedRounds: 0,
      currentStep: 0,
      expectedToken: "-",
      observedToken: "-",
      progressPercent: 0,
      status: "idle",
      targetLength: 0
    };

    drawBox(ctx, 36, 118, width - 72, 98, "Practice skill", skillName);
    drawBox(
      ctx,
      36,
      234,
      width - 72,
      92,
      "Sequence",
      practice.currentStep + "/" + practice.targetLength + " · " + practice.status
    );
    drawBox(ctx, 36, 344, width / 2 - 48, 92, "Expected", practice.expectedToken || "-");
    drawBox(ctx, width / 2 + 12, 344, width / 2 - 48, 92, "Observed", practice.observedToken || "-");

    ctx.save();
    ctx.fillStyle = "rgba(9, 18, 28, 0.72)";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(36, height - 88, width - 72, 28, 14);
    } else {
      ctx.rect(36, height - 88, width - 72, 28);
    }
    ctx.fill();
    ctx.fillStyle = "rgba(83, 215, 255, 0.96)";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(36, height - 88, Math.max(28, (width - 72) * (practice.progressPercent / 100)), 28, 14);
    } else {
      ctx.rect(36, height - 88, Math.max(28, (width - 72) * (practice.progressPercent / 100)), 28);
    }
    ctx.fill();
    ctx.restore();
  }

  function drawBattle(ctx, state, width, height) {
    var battle = state.battle || {
      opponent: {
        hp: 0,
        mana: 0
      },
      self: {
        hp: 0,
        mana: 0
      },
      selectedSkillName: "Battle pending",
      turnNumber: 0
    };
    var action = state.action || {
      result: "idle",
      skillName: battle.selectedSkillName || "Battle pending"
    };

    drawBox(ctx, 36, 118, width - 72, 98, "Battle skill", battle.selectedSkillName || "Battle pending");
    drawBox(ctx, 36, 234, width / 2 - 48, 92, "Self", battle.self.hp + " HP / " + battle.self.mana + " mana");
    drawBox(ctx, width / 2 + 12, 234, width / 2 - 48, 92, "Opponent", battle.opponent.hp + " HP / " + battle.opponent.mana + " mana");
    drawBox(ctx, 36, 344, width / 2 - 48, 92, "Turn", "T" + battle.turnNumber);
    drawBox(ctx, width / 2 + 12, 344, width / 2 - 48, 92, "Action", action.result + " / " + (action.skillName || "-"));
  }

  function drawResult(ctx, state, width, height) {
    var summary = state.summary || {
      endedReason: "-",
      resultForPlayer: "-",
      winnerPlayerId: "-"
    };

    drawBox(ctx, 36, 118, width - 72, 98, "Result", summary.resultForPlayer || "-");
    drawBox(ctx, 36, 234, width / 2 - 48, 92, "Winner", summary.winnerPlayerId || "-");
    drawBox(ctx, width / 2 + 12, 234, width / 2 - 48, 92, "Ended", summary.endedReason || "-");
    drawBox(
      ctx,
      36,
      344,
      width - 72,
      92,
      "Timeline",
      state.timelineId + " / " + (state.animsetId || "animset_unity_jjk")
    );
  }

  function drawFrame(canvas, state, config) {
    var context = canvas.getContext && canvas.getContext("2d");
    if (!context) {
      return;
    }

    var dimensions = readDimensions(canvas);
    var width = dimensions.width;
    var height = dimensions.height;
    var ratio = dimensions.ratio;

    context.save();
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);

    var gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#061019");
    gradient.addColorStop(1, "#13263a");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(255, 255, 255, 0.08)";
    for (var i = 0; i < width; i += 42) {
      context.fillRect(i, 0, 1, height);
    }
    for (var j = 0; j < height; j += 42) {
      context.fillRect(0, j, width, 1);
    }

    context.fillStyle = "#f4fbff";
    context.font = "600 26px Menlo, monospace";
    context.fillText("Unity WebGL Skeleton", 36, 48);

    context.fillStyle = "rgba(185, 219, 235, 0.86)";
    context.font = "14px Menlo, monospace";
    context.fillText(
      (state.scene || "practice").toUpperCase() + " / " + (state.buildVersion || config.productVersion || "prototype-v1"),
      36,
      74
    );
    context.fillText("Timeline: " + state.timelineId, 36, 96);

    if (state.scene === "battle") {
      drawBattle(context, state, width, height);
    } else if (state.scene === "result") {
      drawResult(context, state, width, height);
    } else {
      drawPractice(context, state, width, height);
    }

    context.restore();
  }

  window.createUnityInstance = function (canvas, config, onProgress) {
    return new Promise(function (resolve) {
      var state = createState(config || {});

      function render() {
        drawFrame(canvas, state, config || {});
      }

      function handleResize() {
        render();
      }

      window.addEventListener("resize", handleResize);
      if (typeof onProgress === "function") {
        onProgress(0.35);
      }

      setTimeout(function () {
        if (typeof onProgress === "function") {
          onProgress(1);
        }
        render();
        resolve({
          Quit: function () {
            window.removeEventListener("resize", handleResize);
            return Promise.resolve();
          },
          SendMessage: function (target, method, message) {
            if (target !== (config.bridgeTarget || "CodexBridge")) {
              return;
            }

            if (method !== (config.bridgeMethod || "ReceiveEvent")) {
              return;
            }

            var envelope = parseEnvelope(message);
            updateState(state, envelope);
            render();
          },
          SetFullscreen: function () {}
        });
      }, 60);
    });
  };
})();
