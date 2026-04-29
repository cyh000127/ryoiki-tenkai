(function () {
  function nowMs() {
    return typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function easeOutCubic(value) {
    var progress = clamp(value, 0, 1);
    return 1 - Math.pow(1 - progress, 3);
  }

  function readDimensions(canvas) {
    var ratio = window.devicePixelRatio || 1;
    var width = canvas.clientWidth || 960;
    var height = canvas.clientHeight || 720;

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
      burstAtMs: nowMs(),
      completedAtRuntimeMs: null,
      phaseSeed: Math.random() * Math.PI * 2,
      practice: null,
      scene: "practice",
      selectedSkill: null,
      summary: null,
      timelineId: "timeline.pending"
    };
  }

  function markBurst(state) {
    state.burstAtMs = nowMs();
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
        state.phaseSeed = (state.phaseSeed + 0.7) % (Math.PI * 2);
        state.completedAtRuntimeMs = null;
        markBurst(state);
        break;
      case "practice.progress_updated":
        var previousStatus = state.practice ? state.practice.status : null;
        state.practice = envelope.payload;
        if (envelope.payload.status === "complete" && previousStatus !== "complete") {
          state.completedAtRuntimeMs = nowMs();
          markBurst(state);
        }
        break;
      case "practice.completed":
        state.practice = state.practice || {};
        state.practice.status = "complete";
        state.completedAtRuntimeMs = nowMs();
        markBurst(state);
        break;
      case "battle.state_snapshot":
        state.battle = envelope.payload;
        state.timelineId = envelope.payload.presentation.timelineId;
        markBurst(state);
        break;
      case "battle.action_resolved":
        state.action = envelope.payload;
        if (envelope.payload.presentation && envelope.payload.presentation.timelineId) {
          state.timelineId = envelope.payload.presentation.timelineId;
        }
        markBurst(state);
        break;
      case "battle.ended":
        state.summary = envelope.payload;
        markBurst(state);
        break;
    }
  }

  function getSkillId(state) {
    if (state.selectedSkill && state.selectedSkill.skillId) {
      return state.selectedSkill.skillId;
    }

    if (state.action && state.action.skillId) {
      return state.action.skillId;
    }

    return "";
  }

  function getTheme(skillId) {
    switch (skillId) {
      case "jjk_gojo_red":
        return {
          accent: "rgba(255, 86, 86, 0.92)",
          edge: "rgba(255, 186, 96, 0.7)",
          glow: "rgba(255, 54, 54, 0.32)",
          hueA: "#15070c",
          hueB: "#451215",
          hueC: "#ff8256"
        };
      case "jjk_gojo_hollow_purple":
        return {
          accent: "rgba(186, 108, 255, 0.96)",
          edge: "rgba(113, 216, 255, 0.74)",
          glow: "rgba(142, 62, 255, 0.36)",
          hueA: "#060912",
          hueB: "#241046",
          hueC: "#8f63ff"
        };
      case "jjk_gojo_infinite_void":
        return {
          accent: "rgba(118, 149, 255, 0.94)",
          edge: "rgba(167, 255, 250, 0.76)",
          glow: "rgba(49, 109, 255, 0.34)",
          hueA: "#040914",
          hueB: "#111f4c",
          hueC: "#6c8dff"
        };
      default:
        return {
          accent: "rgba(83, 215, 255, 0.92)",
          edge: "rgba(255, 208, 89, 0.68)",
          glow: "rgba(83, 215, 255, 0.26)",
          hueA: "#061019",
          hueB: "#13263a",
          hueC: "#53d7ff"
        };
    }
  }

  function createRoundedRectPath(ctx, x, y, width, height, radius) {
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  function fillCircle(ctx, x, y, radius, color, blur) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur || 0;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function strokeRing(ctx, x, y, radius, width, color, alpha) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function isPracticeComplete(state) {
    return Boolean(state.practice && state.practice.status === "complete");
  }

  function getProgress(state) {
    return clamp(((state.practice && state.practice.progressPercent) || 0) / 100, 0, 1);
  }

  function getCompletionAgeMs(state) {
    return nowMs() - (state.completedAtRuntimeMs || state.burstAtMs);
  }

  function getBurstProgress(state, durationMs) {
    return easeOutCubic((nowMs() - state.burstAtMs) / durationMs);
  }

  function getCompletionSustain(state) {
    if (!isPracticeComplete(state)) {
      return 0;
    }

    var ageMs = getCompletionAgeMs(state);
    if (ageMs < 1800) {
      return 1;
    }

    return Math.max(0.48, 1 - (ageMs - 1800) / 8200);
  }

  function drawImpactSpokes(ctx, x, y, radius, count, color, alpha, rotation) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (var spokeIndex = 0; spokeIndex < count; spokeIndex += 1) {
      var angle = rotation + (Math.PI * 2 * spokeIndex) / count;
      var inner = radius * 0.32;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
      ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawActivationStamp(ctx, state, width, height, theme) {
    if (!isPracticeComplete(state)) {
      return;
    }

    var skillLabel = state.selectedSkill ? state.selectedSkill.skillName : "Skill activated";
    var pulse = 0.74 + Math.sin(nowMs() / 180) * 0.08;
    var boxWidth = Math.min(width * 0.52, 430);
    var boxHeight = 72;
    var x = Math.max(26, width - boxWidth - 26);
    var y = height - boxHeight - 78;

    ctx.save();
    createRoundedRectPath(ctx, x, y, boxWidth, boxHeight, 18);
    ctx.fillStyle = "rgba(4, 9, 15, 0.68)";
    ctx.fill();
    ctx.strokeStyle = theme.edge;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.edge;
    ctx.font = "12px Menlo, monospace";
    ctx.fillText("TECHNIQUE ACTIVATED", x + 20, y + 28);
    ctx.fillStyle = "#f7fbff";
    ctx.font = "600 18px Menlo, monospace";
    ctx.fillText(skillLabel, x + 20, y + 54);
    ctx.restore();
  }

  function drawBackdrop(ctx, width, height, theme, timeSeconds) {
    var gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, theme.hueA);
    gradient.addColorStop(0.55, theme.hueB);
    gradient.addColorStop(1, "#02050b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    var glow = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, width * 0.62);
    glow.addColorStop(0, theme.glow);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#ffffff";
    for (var gridX = 0; gridX < width; gridX += 38) {
      ctx.fillRect(gridX, 0, 1, height);
    }
    for (var gridY = 0; gridY < height; gridY += 38) {
      ctx.fillRect(0, gridY, width, 1);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = theme.edge;
    ctx.lineWidth = 1;
    for (var index = 0; index < 5; index += 1) {
      var sweepOffset = (timeSeconds * 80 + index * 180) % (width + 220) - 110;
      ctx.beginPath();
      ctx.moveTo(sweepOffset, 0);
      ctx.lineTo(sweepOffset - 180, height);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSkillBanner(ctx, state, width, height, theme) {
    var skillLabel = state.selectedSkill ? state.selectedSkill.skillName : "Skill preview";
    var progress = state.practice || {
      currentStep: 0,
      expectedToken: "-",
      observedToken: "-",
      progressPercent: 0,
      status: "idle",
      targetLength: 0
    };

    ctx.save();
    createRoundedRectPath(ctx, 26, 22, Math.min(width * 0.44, 380), 88, 18);
    ctx.fillStyle = "rgba(4, 10, 16, 0.56)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(214, 236, 244, 0.84)";
    ctx.font = "12px Menlo, monospace";
    ctx.fillText("Practice renderer", 42, 48);

    ctx.fillStyle = "#f6fbff";
    ctx.font = "600 22px Menlo, monospace";
    ctx.fillText(skillLabel, 42, 78);

    ctx.fillStyle = theme.edge;
    ctx.font = "13px Menlo, monospace";
    ctx.fillText(
      progress.currentStep + "/" + progress.targetLength + "  " + String(progress.status || "idle").toUpperCase(),
      42,
      101
    );
    ctx.restore();

    ctx.save();
    createRoundedRectPath(ctx, 26, height - 58, width - 52, 18, 10);
    ctx.fillStyle = "rgba(8, 16, 25, 0.64)";
    ctx.fill();
    createRoundedRectPath(
      ctx,
      26,
      height - 58,
      Math.max(34, (width - 52) * clamp((progress.progressPercent || 0) / 100, 0, 1)),
      18,
      10
    );
    ctx.fillStyle = theme.accent;
    ctx.fill();
    ctx.restore();
  }

  function drawRedEffect(ctx, width, height, state, timeSeconds) {
    var progress = getProgress(state);
    var complete = isPracticeComplete(state);
    var burst = getBurstProgress(state, 650);
    var sustain = getCompletionSustain(state);
    var orbit = Math.sin(timeSeconds * 3.8 + state.phaseSeed);
    var orbX = lerp(width * 0.36, width * 0.5, progress * 0.35);
    var orbY = height * 0.56 + orbit * 8;
    var orbRadius = 42 + orbit * 4 + progress * 16 + sustain * 7;

    fillCircle(ctx, orbX, orbY, orbRadius + 28, "rgba(255, 72, 72, 0.22)", 48);
    fillCircle(ctx, orbX, orbY, orbRadius, "rgba(255, 92, 92, 0.94)", 28);
    fillCircle(ctx, orbX, orbY, orbRadius * 0.46, "rgba(255, 240, 216, 0.82)", 18);
    if (complete) {
      fillCircle(ctx, orbX, orbY, orbRadius + 82, "rgba(255, 42, 42, 0.12)", 78);
      drawImpactSpokes(ctx, orbX, orbY, orbRadius + 112, 14, "rgba(255, 194, 128, 0.5)", sustain, timeSeconds * 0.55);
    }

    ctx.save();
    ctx.strokeStyle = "rgba(255, 180, 122, 0.46)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (var arcIndex = 0; arcIndex < 4; arcIndex += 1) {
      ctx.beginPath();
      ctx.arc(
        orbX,
        orbY,
        orbRadius + 18 + arcIndex * 12,
        timeSeconds * 1.4 + arcIndex * 0.65,
        timeSeconds * 1.4 + arcIndex * 0.65 + Math.PI * 0.9
      );
      ctx.stroke();
    }
    ctx.restore();

    if (!complete) {
      return;
    }

    var projectileProgress = getBurstProgress(state, 900);
    var projectileX = lerp(orbX, width * 0.76, projectileProgress);
    var projectileY = lerp(orbY, height * 0.42, projectileProgress * 0.75);
    var trailGradient = ctx.createLinearGradient(orbX, orbY, projectileX, projectileY);
    trailGradient.addColorStop(0, "rgba(255, 93, 93, 0)");
    trailGradient.addColorStop(1, "rgba(255, 164, 110, 0.9)");
    ctx.save();
    ctx.strokeStyle = trailGradient;
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(orbX + 8, orbY);
    ctx.lineTo(projectileX, projectileY);
    ctx.stroke();
    ctx.restore();

    fillCircle(ctx, projectileX, projectileY, 28 + burst * 18, "rgba(255, 108, 92, 0.95)", 36);
    fillCircle(ctx, projectileX, projectileY, 84 + Math.sin(timeSeconds * 4.5) * 8, "rgba(255, 56, 56, 0.16)", 64);
    strokeRing(ctx, projectileX, projectileY, 54 + burst * 72, 8, "rgba(255, 204, 150, 0.88)", Math.max(0.34, 1 - burst * 0.7));
    strokeRing(ctx, projectileX, projectileY, 112 + Math.sin(timeSeconds * 2.2) * 14, 3, "rgba(255, 105, 83, 0.7)", sustain);
  }

  function drawHollowPurpleEffect(ctx, width, height, state, timeSeconds) {
    var progress = getProgress(state);
    var complete = isPracticeComplete(state);
    var burst = getBurstProgress(state, 900);
    var sustain = getCompletionSustain(state);
    var centerX = width * 0.46;
    var centerY = height * 0.54;
    var orbitRadius = 96 - progress * 28;
    var orbitAngle = timeSeconds * 2.2 + state.phaseSeed;
    var blueX = centerX + Math.cos(orbitAngle) * orbitRadius;
    var blueY = centerY + Math.sin(orbitAngle) * orbitRadius * 0.42;
    var redX = centerX + Math.cos(orbitAngle + Math.PI) * orbitRadius;
    var redY = centerY + Math.sin(orbitAngle + Math.PI) * orbitRadius * 0.42;

    fillCircle(ctx, blueX, blueY, 30, "rgba(95, 228, 255, 0.92)", 32);
    fillCircle(ctx, redX, redY, 30, "rgba(255, 110, 132, 0.9)", 32);

    ctx.save();
    ctx.strokeStyle = "rgba(189, 156, 255, 0.3)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(blueX, blueY);
    ctx.lineTo(redX, redY);
    ctx.stroke();
    ctx.restore();

    var mergeRadius = 44 + progress * 18 + sustain * 9;
    fillCircle(ctx, centerX, centerY, mergeRadius + 22, "rgba(120, 64, 255, 0.18)", 42);
    fillCircle(ctx, centerX, centerY, mergeRadius, "rgba(168, 110, 255, 0.68)", 26);
    if (complete) {
      fillCircle(ctx, centerX, centerY, mergeRadius + 74, "rgba(166, 76, 255, 0.14)", 86);
      drawImpactSpokes(ctx, centerX, centerY, mergeRadius + 128, 18, "rgba(196, 151, 255, 0.44)", sustain, -timeSeconds * 0.42);
    }

    if (!complete && progress < 0.5) {
      return;
    }

    var beamProgress = complete ? getBurstProgress(state, 850) : progress;
    var beamWidth = 26 + beamProgress * 36;
    var beamEndX = lerp(centerX + 40, width * 0.96, beamProgress);
    var beamGradient = ctx.createLinearGradient(centerX, centerY, beamEndX, centerY);
    beamGradient.addColorStop(0, "rgba(163, 110, 255, 0)");
    beamGradient.addColorStop(0.24, "rgba(188, 123, 255, 0.85)");
    beamGradient.addColorStop(0.74, "rgba(113, 216, 255, 0.9)");
    beamGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.save();
    ctx.strokeStyle = beamGradient;
    ctx.lineWidth = beamWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(centerX + 12, centerY);
    ctx.lineTo(beamEndX, centerY - beamWidth * 0.08);
    ctx.stroke();
    ctx.restore();

    if (complete) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.76)";
      ctx.lineWidth = Math.max(3, beamWidth * 0.18);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(centerX + 16, centerY);
      ctx.lineTo(width * 0.98, centerY - beamWidth * 0.08);
      ctx.stroke();
      ctx.restore();
    }

    strokeRing(ctx, centerX, centerY, 66 + burst * 34, 10, "rgba(201, 161, 255, 0.92)", Math.max(0.38, 1 - burst * 0.42));
    strokeRing(ctx, centerX, centerY, 124 + Math.sin(timeSeconds * 2.4) * 16, 4, "rgba(115, 221, 255, 0.72)", sustain);
  }

  function drawInfiniteVoidEffect(ctx, width, height, state, timeSeconds) {
    var complete = isPracticeComplete(state);
    var burst = getBurstProgress(state, 1200);
    var sustain = getCompletionSustain(state);
    var centerX = width * 0.5;
    var centerY = height * 0.54;
    var domeRadius = Math.min(width, height) * (complete ? 0.44 : 0.36);

    ctx.save();
    var domeGradient = ctx.createRadialGradient(centerX, centerY, domeRadius * 0.12, centerX, centerY, domeRadius);
    domeGradient.addColorStop(0, "rgba(255, 255, 255, 0.14)");
    domeGradient.addColorStop(0.55, "rgba(88, 126, 255, 0.22)");
    domeGradient.addColorStop(1, "rgba(7, 16, 40, 0)");
    ctx.fillStyle = domeGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, domeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (var ringIndex = 0; ringIndex < 4; ringIndex += 1) {
      var ringRadius = domeRadius * 0.34 + ringIndex * 38 + Math.sin(timeSeconds * 1.3 + ringIndex) * 10;
      strokeRing(
        ctx,
        centerX,
        centerY,
        ringRadius,
        ringIndex === 0 ? 8 : 4,
        ringIndex === 0 ? "rgba(173, 229, 255, 0.86)" : "rgba(108, 151, 255, 0.54)",
        0.9 - ringIndex * 0.14
      );
    }

    ctx.save();
    for (var shardIndex = 0; shardIndex < 14; shardIndex += 1) {
      var shardAngle = (Math.PI * 2 * shardIndex) / 14 + timeSeconds * 0.55 + state.phaseSeed;
      var shardDistance = domeRadius * (0.36 + (shardIndex % 3) * 0.18);
      var shardX = centerX + Math.cos(shardAngle) * shardDistance;
      var shardY = centerY + Math.sin(shardAngle) * shardDistance * 0.72;
      var shardSize = 10 + (shardIndex % 4) * 3;
      ctx.fillStyle = shardIndex % 2 === 0 ? "rgba(140, 200, 255, 0.74)" : "rgba(214, 236, 255, 0.48)";
      ctx.beginPath();
      ctx.moveTo(shardX, shardY - shardSize);
      ctx.lineTo(shardX + shardSize * 0.6, shardY + shardSize);
      ctx.lineTo(shardX - shardSize * 0.6, shardY + shardSize);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    if (!complete) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "rgba(16, 29, 88, " + (0.2 + burst * 0.18) + ")";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    for (var starIndex = 0; starIndex < 34; starIndex += 1) {
      var starAngle = (Math.PI * 2 * starIndex) / 34 + state.phaseSeed;
      var starDistance = domeRadius * (0.2 + (starIndex % 7) * 0.12);
      var starX = centerX + Math.cos(starAngle + timeSeconds * 0.12) * starDistance;
      var starY = centerY + Math.sin(starAngle - timeSeconds * 0.08) * starDistance * 0.7;
      fillCircle(ctx, starX, starY, 1.5 + (starIndex % 3), "rgba(226, 247, 255, 0.72)", 8);
    }

    strokeRing(ctx, centerX, centerY, domeRadius + burst * 48, 14, "rgba(210, 246, 255, 0.88)", Math.max(0.42, 1 - burst * 0.4));
    strokeRing(ctx, centerX, centerY, domeRadius * 0.68 + Math.sin(timeSeconds * 2.1) * 16, 5, "rgba(135, 175, 255, 0.8)", sustain);
    drawImpactSpokes(ctx, centerX, centerY, domeRadius * 0.92, 24, "rgba(185, 230, 255, 0.28)", sustain, timeSeconds * 0.18);
  }

  function drawFallbackEffect(ctx, width, height, state, timeSeconds, theme) {
    var progress = getProgress(state);
    var complete = isPracticeComplete(state);
    var sustain = getCompletionSustain(state);
    var centerX = width * 0.5;
    var centerY = height * 0.55;
    var radius = 88 + Math.sin(timeSeconds * 2 + state.phaseSeed) * 10;

    fillCircle(ctx, centerX, centerY, radius + 42, theme.glow, 52);
    strokeRing(ctx, centerX, centerY, radius, 10, theme.accent, 0.86);
    strokeRing(ctx, centerX, centerY, radius + 46, 4, theme.edge, 0.52);
    if (complete) {
      fillCircle(ctx, centerX, centerY, radius + 72, theme.glow, 82);
      strokeRing(ctx, centerX, centerY, radius + 72 + Math.sin(timeSeconds * 2.6) * 10, 5, theme.edge, sustain);
      drawImpactSpokes(ctx, centerX, centerY, radius + 132, 16, theme.edge, sustain * 0.72, timeSeconds * 0.4);
    }

    ctx.save();
    ctx.strokeStyle = theme.edge;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(centerX - 120, centerY + 94);
    ctx.lineTo(centerX - 120 + progress * 240, centerY + 94);
    ctx.stroke();
    ctx.restore();
  }

  function drawPractice(ctx, state, width, height, timeSeconds) {
    var skillId = getSkillId(state);
    var theme = getTheme(skillId);

    drawBackdrop(ctx, width, height, theme, timeSeconds);

    if (skillId === "jjk_gojo_red") {
      drawRedEffect(ctx, width, height, state, timeSeconds);
    } else if (skillId === "jjk_gojo_hollow_purple") {
      drawHollowPurpleEffect(ctx, width, height, state, timeSeconds);
    } else if (skillId === "jjk_gojo_infinite_void") {
      drawInfiniteVoidEffect(ctx, width, height, state, timeSeconds);
    } else {
      drawFallbackEffect(ctx, width, height, state, timeSeconds, theme);
    }

    drawSkillBanner(ctx, state, width, height, theme);
    drawActivationStamp(ctx, state, width, height, theme);
  }

  function drawBattle(ctx, state, width, height, timeSeconds) {
    var skillId = getSkillId(state);
    var theme = getTheme(skillId);
    var battle = state.battle || {
      opponent: { hp: 0, mana: 0 },
      self: { hp: 0, mana: 0 },
      selectedSkillName: "Battle pending",
      turnNumber: 0
    };
    var action = state.action || {
      result: "idle",
      skillName: battle.selectedSkillName || "Battle pending"
    };

    drawBackdrop(ctx, width, height, theme, timeSeconds);
    drawFallbackEffect(ctx, width, height, state, timeSeconds, theme);

    ctx.save();
    createRoundedRectPath(ctx, 24, 22, width - 48, 92, 18);
    ctx.fillStyle = "rgba(4, 10, 16, 0.54)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.stroke();
    ctx.fillStyle = "#f6fbff";
    ctx.font = "600 18px Menlo, monospace";
    ctx.fillText(battle.selectedSkillName || "Battle pending", 42, 58);
    ctx.fillStyle = "rgba(214, 236, 244, 0.84)";
    ctx.font = "13px Menlo, monospace";
    ctx.fillText("Turn " + battle.turnNumber + " / " + action.result, 42, 84);
    ctx.fillText("Self " + battle.self.hp + " HP / " + battle.self.mana + " mana", 42, height - 44);
    ctx.fillText("Opponent " + battle.opponent.hp + " HP / " + battle.opponent.mana + " mana", width * 0.52, height - 44);
    ctx.restore();
  }

  function drawResult(ctx, state, width, height, timeSeconds) {
    var theme = getTheme(getSkillId(state));
    var summary = state.summary || {
      endedReason: "-",
      resultForPlayer: "-",
      winnerPlayerId: "-"
    };

    drawBackdrop(ctx, width, height, theme, timeSeconds);
    strokeRing(ctx, width * 0.5, height * 0.48, Math.min(width, height) * 0.24, 12, theme.accent, 0.9);
    strokeRing(ctx, width * 0.5, height * 0.48, Math.min(width, height) * 0.34, 4, theme.edge, 0.56);

    ctx.save();
    createRoundedRectPath(ctx, width * 0.22, height * 0.18, width * 0.56, height * 0.42, 24);
    ctx.fillStyle = "rgba(4, 10, 16, 0.56)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.stroke();
    ctx.fillStyle = "#f6fbff";
    ctx.font = "600 28px Menlo, monospace";
    ctx.fillText(String(summary.resultForPlayer || "-"), width * 0.32, height * 0.31);
    ctx.font = "14px Menlo, monospace";
    ctx.fillStyle = "rgba(214, 236, 244, 0.84)";
    ctx.fillText("Winner: " + String(summary.winnerPlayerId || "-"), width * 0.32, height * 0.39);
    ctx.fillText("Ended: " + String(summary.endedReason || "-"), width * 0.32, height * 0.45);
    ctx.fillText("Timeline: " + state.timelineId, width * 0.32, height * 0.51);
    ctx.restore();
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
    var timeSeconds = nowMs() / 1000;

    context.save();
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);

    if (state.scene === "battle") {
      drawBattle(context, state, width, height, timeSeconds);
    } else if (state.scene === "result") {
      drawResult(context, state, width, height, timeSeconds);
    } else {
      drawPractice(context, state, width, height, timeSeconds);
    }

    context.save();
    context.fillStyle = "rgba(255, 255, 255, 0.82)";
    context.font = "12px Menlo, monospace";
    context.fillText(
      String((state.scene || "practice").toUpperCase()) +
        " / " +
        String(state.buildVersion || config.productVersion || "prototype-v1"),
      26,
      height - 22
    );
    context.restore();

    context.restore();
  }

  window.createUnityInstance = function (canvas, config, onProgress) {
    return new Promise(function (resolve) {
      var state = createState(config || {});
      var animationFrameId = 0;

      function render() {
        drawFrame(canvas, state, config || {});
      }

      function startLoop() {
        function tick() {
          render();
          animationFrameId = window.requestAnimationFrame(tick);
        }

        animationFrameId = window.requestAnimationFrame(tick);
      }

      function stopLoop() {
        if (animationFrameId) {
          window.cancelAnimationFrame(animationFrameId);
          animationFrameId = 0;
        }
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
        startLoop();
        resolve({
          Quit: function () {
            stopLoop();
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
