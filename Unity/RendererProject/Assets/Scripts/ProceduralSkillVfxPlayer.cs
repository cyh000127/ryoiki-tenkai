using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[Serializable]
public sealed class PracticeCompletedPayloadContract
{
    public double completedAtMs;
    public int completedRounds;
    public string skillId = string.Empty;
}

[Serializable]
public sealed class PracticeCompletedEnvelopeContract
{
    public PracticeCompletedPayloadContract payload = new();
    public string type = string.Empty;
}

public sealed class ProceduralSkillVfxPlayer : MonoBehaviour
{
    private struct SkillTheme
    {
        public Color accent;
        public Color background;
        public Color primary;
        public Color secondary;
    }

    private struct CameraPose
    {
        public float fieldOfView;
        public Vector3 lookTarget;
        public Vector3 position;
    }

    [Header("Rig")]
    [SerializeField] private bool autoBootstrapStage = true;
    [SerializeField] private Camera stageCamera;
    [SerializeField] private Light keyLight;
    [SerializeField] private Transform stageRoot;
    [SerializeField] private Transform staticRoot;
    [SerializeField] private Transform previewRoot;
    [SerializeField] private Transform effectRoot;
    [SerializeField] private Transform selfAnchor;
    [SerializeField] private Transform opponentAnchor;
    [SerializeField] private Transform centerAnchor;

    [Header("Debug")]
    [SerializeField] private string currentScene = "practice";
    [SerializeField] private string currentSkillId = string.Empty;
    [SerializeField] private string currentTimelineId = string.Empty;
    [SerializeField] private string currentActionId = string.Empty;
    [SerializeField] private string currentActionResult = string.Empty;
    [SerializeField] private float practiceProgressNormalized;
    [SerializeField] private int practiceCurrentStep;
    [SerializeField] private int practiceTargetLength;
    [SerializeField] private bool practiceHandDetected;

    private readonly List<GameObject> transientObjects = new();
    private readonly List<Material> runtimeMaterials = new();

    private Coroutine activeSequenceRoutine;
    private Coroutine shakeRoutine;
    private Material chargeCoreMaterial;
    private GameObject chargeCoreObject;
    private Material backdropMaterial;
    private Material floorMaterial;
    private string lastBattleActionToken = string.Empty;
    private string lastPracticeCompletionToken = string.Empty;
    private bool hasDesiredCameraPose;
    private Material markerPrimaryMaterial;
    private Material markerSecondaryMaterial;
    private Material platformMaterial;
    private Material progressRingMaterial;
    private LineRenderer progressRingRenderer;
    private float progressRingScale = 0.8f;
    private Material stageRingMaterial;
    private LineRenderer stageRingRenderer;
    private float stageRingScale = 1f;
    private Vector3 targetCameraPosition;
    private Quaternion targetCameraRotation = Quaternion.identity;
    private float targetFieldOfView = 39f;
    private Material secondaryRingMaterial;
    private LineRenderer secondaryRingRenderer;
    private float secondaryRingScale = 1.1f;
    private float targetChargeScale = 0.2f;

    private void Awake()
    {
        if (autoBootstrapStage)
        {
            EnsureStage();
        }

        SetPreviewVisible(false);
        ApplySkillTheme(string.Empty, true);
        SetCameraPreset("practice_idle", true);
    }

    private void OnDestroy()
    {
        ClearTransientEffects();

        foreach (var material in runtimeMaterials)
        {
            if (material != null)
            {
                Destroy(material);
            }
        }
    }

    private void Update()
    {
        if (!autoBootstrapStage)
        {
            return;
        }

        if (chargeCoreObject != null && chargeCoreObject.activeSelf)
        {
            var pulse = 1f + Mathf.Sin(Time.time * 5.6f) * 0.08f;
            chargeCoreObject.transform.localScale = Vector3.one * targetChargeScale * pulse;
            chargeCoreObject.transform.Rotate(12f * Time.deltaTime, 36f * Time.deltaTime, 24f * Time.deltaTime, Space.Self);
        }

        if (progressRingRenderer != null && progressRingRenderer.gameObject.activeSelf)
        {
            progressRingRenderer.transform.localScale = Vector3.one * progressRingScale;
            progressRingRenderer.transform.Rotate(0f, 18f * Time.deltaTime, 0f, Space.Self);
        }

        if (secondaryRingRenderer != null && secondaryRingRenderer.gameObject.activeSelf)
        {
            secondaryRingRenderer.transform.localScale = Vector3.one * secondaryRingScale;
            secondaryRingRenderer.transform.Rotate(0f, -24f * Time.deltaTime, 0f, Space.Self);
        }

        if (stageRingRenderer != null && stageRingRenderer.gameObject.activeSelf)
        {
            stageRingRenderer.transform.localScale = Vector3.one * stageRingScale;
            stageRingRenderer.transform.Rotate(0f, 10f * Time.deltaTime, 0f, Space.Self);
        }

        UpdateCameraRig();
    }

    public void ApplyEnvelope(string payloadJson, string resolvedSkillId, string resolvedTimelineId, string eventType)
    {
        if (string.IsNullOrWhiteSpace(payloadJson))
        {
            return;
        }

        EnsureStage();

        switch (eventType)
        {
            case "renderer.bootstrap":
                ApplyBootstrap(payloadJson);
                break;
            case "practice.skill_selected":
                ApplyPracticeSkill(payloadJson, resolvedSkillId, resolvedTimelineId);
                break;
            case "practice.progress_updated":
                ApplyPracticeProgress(payloadJson);
                break;
            case "practice.completed":
                ApplyPracticeCompleted(payloadJson, resolvedSkillId, resolvedTimelineId);
                break;
            case "battle.state_snapshot":
                ApplyBattleSnapshot(payloadJson, resolvedSkillId, resolvedTimelineId);
                break;
            case "battle.action_resolved":
                ApplyBattleAction(payloadJson, resolvedSkillId, resolvedTimelineId);
                break;
            case "battle.ended":
                ApplyBattleEnded(payloadJson);
                break;
        }
    }

    private void ApplyBootstrap(string payloadJson)
    {
        var envelope = JsonUtility.FromJson<RendererBootstrapEnvelopeContract>(payloadJson);
        if (envelope?.payload == null)
        {
            return;
        }

        currentScene = string.IsNullOrWhiteSpace(envelope.payload.scene) ? currentScene : envelope.payload.scene;
        SetPreviewVisible(currentScene == "practice");
        SetCameraPreset(GetScenePreset(currentScene), true);
    }

    private void ApplyPracticeSkill(string payloadJson, string resolvedSkillId, string resolvedTimelineId)
    {
        var envelope = JsonUtility.FromJson<PracticeSkillSelectedEnvelopeContract>(payloadJson);
        if (envelope?.payload == null)
        {
            return;
        }

        currentScene = "practice";
        currentSkillId = ReadOrFallback(envelope.payload.skillId, resolvedSkillId);
        currentTimelineId = ReadOrFallback(envelope.payload.presentation.timelineId, resolvedTimelineId);
        ApplySkillTheme(currentSkillId, true);
        SetCameraPreset(ReadOrFallback(envelope.payload.presentation.cameraPresetId, "practice_idle"), true);
        SetPreviewVisible(true);
        UpdatePracticePreview(0f, 0, envelope.payload.gestureSequence != null ? envelope.payload.gestureSequence.Length : 0, false);
        lastPracticeCompletionToken = string.Empty;
    }

    private void ApplyPracticeProgress(string payloadJson)
    {
        var envelope = JsonUtility.FromJson<PracticeProgressUpdatedEnvelopeContract>(payloadJson);
        if (envelope?.payload == null)
        {
            return;
        }

        currentScene = "practice";
        practiceCurrentStep = envelope.payload.currentStep;
        practiceTargetLength = envelope.payload.targetLength;
        practiceHandDetected = envelope.payload.handDetected;
        var normalizedProgress = envelope.payload.targetLength <= 0
            ? 0f
            : Mathf.Clamp01((float)envelope.payload.currentStep / envelope.payload.targetLength);
        practiceProgressNormalized = Mathf.Max(normalizedProgress, Mathf.Clamp01(envelope.payload.progressPercent / 100f));

        UpdatePracticePreview(
            practiceProgressNormalized,
            envelope.payload.currentStep,
            envelope.payload.targetLength,
            envelope.payload.handDetected
        );
    }

    private void ApplyPracticeCompleted(string payloadJson, string resolvedSkillId, string resolvedTimelineId)
    {
        var envelope = JsonUtility.FromJson<PracticeCompletedEnvelopeContract>(payloadJson);
        if (envelope?.payload == null)
        {
            return;
        }

        currentScene = "practice";
        currentSkillId = ReadOrFallback(envelope.payload.skillId, resolvedSkillId);
        currentTimelineId = ReadOrFallback(currentTimelineId, resolvedTimelineId);

        var completionToken = $"{currentSkillId}:{envelope.payload.completedAtMs:F0}";
        if (completionToken == lastPracticeCompletionToken)
        {
            return;
        }

        lastPracticeCompletionToken = completionToken;
        PlayFullSequence(currentSkillId);
    }

    private void ApplyBattleSnapshot(string payloadJson, string resolvedSkillId, string resolvedTimelineId)
    {
        var envelope = JsonUtility.FromJson<BattleStateSnapshotEnvelopeContract>(payloadJson);
        if (envelope?.payload == null)
        {
            return;
        }

        currentScene = "battle";
        currentSkillId = ReadOrFallback(envelope.payload.selectedSkillId, resolvedSkillId);
        currentTimelineId = ReadOrFallback(envelope.payload.presentation.timelineId, resolvedTimelineId);
        ApplySkillTheme(currentSkillId, true);
        SetCameraPreset(ReadOrFallback(envelope.payload.presentation.cameraPresetId, "battle_idle"), true);
        SetPreviewVisible(false);

        if (envelope.payload.status == "ENDED")
        {
            SetCameraPreset("result_idle", false);
        }
    }

    private void ApplyBattleAction(string payloadJson, string resolvedSkillId, string resolvedTimelineId)
    {
        var envelope = JsonUtility.FromJson<BattleActionResolvedEnvelopeContract>(payloadJson);
        if (envelope?.payload == null)
        {
            return;
        }

        currentScene = "battle";
        currentActionId = envelope.payload.actionId;
        currentActionResult = envelope.payload.result;
        currentSkillId = ReadOrFallback(envelope.payload.skillId, resolvedSkillId);
        currentTimelineId = ReadOrFallback(
            envelope.payload.presentation != null ? envelope.payload.presentation.timelineId : string.Empty,
            resolvedTimelineId
        );

        var actionToken = $"{currentActionId}:{currentActionResult}:{currentSkillId}";
        if (actionToken == lastBattleActionToken)
        {
            return;
        }

        lastBattleActionToken = actionToken;

        switch (envelope.payload.result)
        {
            case "pending":
                PlayPreviewSequence(currentSkillId);
                break;
            case "accepted":
                PlayFullSequence(currentSkillId);
                break;
            case "rejected":
                PlayRejectedSequence(currentSkillId);
                break;
        }
    }

    private void ApplyBattleEnded(string payloadJson)
    {
        var envelope = JsonUtility.FromJson<BattleEndedEnvelopeContract>(payloadJson);
        if (envelope?.payload == null)
        {
            return;
        }

        currentScene = "result";
        SetPreviewVisible(false);
        SetCameraPreset("result_idle", false);
        PlayResultSequence(envelope.payload.resultForPlayer == "WIN");
    }

    private void PlayPreviewSequence(string skillId)
    {
        switch (skillId)
        {
            case "jjk_gojo_red":
                PlaySequence(PlayGojoRed(previewOnly: true));
                break;
            case "jjk_gojo_hollow_purple":
                PlaySequence(PlayHollowPurple(previewOnly: true));
                break;
            case "jjk_gojo_infinite_void":
                PlaySequence(PlayInfiniteVoid(previewOnly: true));
                break;
            default:
                PlaySequence(PlayRejectedBurst(GetSkillTheme(skillId).secondary));
                break;
        }
    }

    private void PlayFullSequence(string skillId)
    {
        switch (skillId)
        {
            case "jjk_gojo_red":
                PlaySequence(PlayGojoRed(previewOnly: false));
                break;
            case "jjk_gojo_hollow_purple":
                PlaySequence(PlayHollowPurple(previewOnly: false));
                break;
            case "jjk_gojo_infinite_void":
                PlaySequence(PlayInfiniteVoid(previewOnly: false));
                break;
            default:
                PlaySequence(PlayRejectedBurst(GetSkillTheme(skillId).secondary));
                break;
        }
    }

    private void PlayRejectedSequence(string skillId)
    {
        PlaySequence(PlayRejectedBurst(GetSkillTheme(skillId).accent));
    }

    private void PlayResultSequence(bool isWin)
    {
        var theme = isWin
            ? new SkillTheme
            {
                primary = new Color(0.18f, 0.95f, 0.72f, 0.95f),
                secondary = new Color(0.82f, 1f, 0.92f, 0.8f),
                accent = new Color(0.98f, 1f, 1f, 1f),
                background = new Color(0.02f, 0.12f, 0.1f, 1f)
            }
            : new SkillTheme
            {
                primary = new Color(1f, 0.32f, 0.38f, 0.95f),
                secondary = new Color(1f, 0.78f, 0.42f, 0.8f),
                accent = new Color(1f, 0.96f, 0.92f, 1f),
                background = new Color(0.16f, 0.04f, 0.06f, 1f)
            };

        PlaySequence(PlayResultPulse(theme));
    }

    private void PlaySequence(IEnumerator routine)
    {
        ClearTransientEffects();
        activeSequenceRoutine = StartCoroutine(routine);
    }

    private IEnumerator PlayGojoRed(bool previewOnly)
    {
        var theme = GetSkillTheme("jjk_gojo_red");
        SetCameraPreset("projectile_closeup", false);
        ApplySkillTheme("jjk_gojo_red", true);

        var launchPoint = selfAnchor.localPosition + new Vector3(0f, 1.15f, 0f);
        var impactPoint = opponentAnchor.localPosition + new Vector3(0f, 1.2f, 0f);

        var core = CreateTransientPrimitive(
            PrimitiveType.Sphere,
            "GojoRedCore",
            launchPoint,
            Vector3.one * 0.16f,
            CreateRuntimeMaterial(theme.primary, transparent: true),
            effectRoot
        );
        var shell = CreateTransientPrimitive(
            PrimitiveType.Sphere,
            "GojoRedShell",
            launchPoint,
            Vector3.one * 0.22f,
            CreateRuntimeMaterial(theme.secondary, transparent: true),
            effectRoot
        );
        var halo = CreateTransientRing(
            "GojoRedHalo",
            launchPoint,
            Quaternion.Euler(90f, 0f, 0f),
            1f,
            0.08f,
            theme.secondary,
            faceCamera: false,
            effectRoot
        );

        CreateBurstParticles("GojoRedChargeDust", launchPoint, theme.secondary, theme.primary, 14, 0.6f, 0.12f, 0.4f, 0.45f);

        yield return AnimateOverTime(0.42f, (t) =>
        {
            var eased = EaseOutCubic(t);
            var pulse = 1f + Mathf.Sin(t * Mathf.PI * 6f) * 0.08f;
            core.transform.localScale = Vector3.one * Mathf.Lerp(0.16f, 0.78f, eased) * pulse;
            shell.transform.localScale = Vector3.one * Mathf.Lerp(0.22f, 1.05f, eased);
            halo.transform.localScale = Vector3.one * Mathf.Lerp(0.45f, 1.9f, eased);
            shell.transform.localPosition = launchPoint + new Vector3(0f, Mathf.Sin(t * Mathf.PI) * 0.08f, 0f);
            SetAlpha(core, Mathf.Lerp(0.9f, 0.72f, t));
            SetAlpha(shell, Mathf.Lerp(0.45f, 0.08f, t));
            SetLineAlpha(halo, Mathf.Lerp(0.85f, 0.06f, t));
        });

        if (previewOnly)
        {
            yield return FadeTransientObjects(0.25f);
            yield break;
        }

        var trail = CreateTransientBeam(
            "GojoRedTrail",
            launchPoint,
            launchPoint,
            0.08f,
            theme.secondary
        );

        yield return AnimateOverTime(0.32f, (t) =>
        {
            var eased = EaseInOutCubic(t);
            var arcHeight = Mathf.Sin(t * Mathf.PI) * 0.45f;
            var position = Vector3.Lerp(launchPoint, impactPoint, eased) + new Vector3(0f, arcHeight, 0f);
            core.transform.localPosition = position;
            shell.transform.localPosition = position;
            halo.transform.localPosition = position;
            trail.SetPosition(0, launchPoint);
            trail.SetPosition(1, position);
            shell.transform.localScale = Vector3.one * Mathf.Lerp(0.7f, 0.52f, t);
            halo.transform.localScale = Vector3.one * Mathf.Lerp(1.15f, 0.52f, t);
        });

        StartShake(0.26f, 0.18f);
        var impactSphere = CreateTransientPrimitive(
            PrimitiveType.Sphere,
            "GojoRedImpact",
            impactPoint,
            Vector3.one * 0.24f,
            CreateRuntimeMaterial(theme.secondary, transparent: true),
            effectRoot
        );
        var impactRing = CreateTransientRing(
            "GojoRedImpactRing",
            impactPoint,
            Quaternion.Euler(90f, 0f, 0f),
            1f,
            0.11f,
            theme.primary,
            faceCamera: false,
            effectRoot
        );
        CreateBurstParticles("GojoRedImpactBurst", impactPoint, theme.secondary, theme.accent, 28, 3.5f, 0.16f, 0.2f, 0.6f);

        yield return AnimateOverTime(0.48f, (t) =>
        {
            var eased = EaseOutCubic(t);
            impactSphere.transform.localScale = Vector3.one * Mathf.Lerp(0.24f, 2.4f, eased);
            impactRing.transform.localScale = Vector3.one * Mathf.Lerp(0.24f, 3.4f, eased);
            SetAlpha(impactSphere, Mathf.Lerp(0.75f, 0f, t));
            SetLineAlpha(impactRing, Mathf.Lerp(0.95f, 0f, t));
            SetAlpha(core, Mathf.Lerp(0.65f, 0f, t));
            SetAlpha(shell, Mathf.Lerp(0.25f, 0f, t));
            SetLineAlpha(halo, Mathf.Lerp(0.35f, 0f, t));
            SetLineAlpha(trail, Mathf.Lerp(0.55f, 0f, t));
        });
    }

    private IEnumerator PlayHollowPurple(bool previewOnly)
    {
        var theme = GetSkillTheme("jjk_gojo_hollow_purple");
        SetCameraPreset("beam_finisher", false);
        ApplySkillTheme("jjk_gojo_hollow_purple", true);

        var origin = selfAnchor.localPosition + new Vector3(0.45f, 1.28f, 0f);
        var beamStart = selfAnchor.localPosition + new Vector3(0.65f, 1.28f, 0f);
        var beamEnd = opponentAnchor.localPosition + new Vector3(0f, 1.32f, 0f);

        var blueOrb = CreateTransientPrimitive(
            PrimitiveType.Sphere,
            "PurpleBlueOrb",
            origin + Vector3.left * 0.5f,
            Vector3.one * 0.24f,
            CreateRuntimeMaterial(new Color(0.22f, 0.56f, 1f, 0.92f), transparent: true),
            effectRoot
        );
        var redOrb = CreateTransientPrimitive(
            PrimitiveType.Sphere,
            "PurpleRedOrb",
            origin + Vector3.right * 0.5f,
            Vector3.one * 0.24f,
            CreateRuntimeMaterial(new Color(1f, 0.28f, 0.32f, 0.92f), transparent: true),
            effectRoot
        );
        var core = CreateTransientPrimitive(
            PrimitiveType.Sphere,
            "PurpleCore",
            origin,
            Vector3.one * 0.12f,
            CreateRuntimeMaterial(theme.primary, transparent: true),
            effectRoot
        );
        var orbitRing = CreateTransientRing(
            "PurpleOrbitRing",
            origin,
            Quaternion.identity,
            1f,
            0.06f,
            theme.secondary,
            faceCamera: true,
            effectRoot
        );

        yield return AnimateOverTime(0.58f, (t) =>
        {
            var radius = Mathf.Lerp(0.52f, 0.08f, EaseInOutCubic(t));
            var angle = t * 780f * Mathf.Deg2Rad;
            var orbitOffset = new Vector3(Mathf.Cos(angle), Mathf.Sin(angle), 0f) * radius;
            blueOrb.transform.localPosition = origin + orbitOffset;
            redOrb.transform.localPosition = origin - orbitOffset;
            blueOrb.transform.localScale = Vector3.one * Mathf.Lerp(0.24f, 0.18f, t);
            redOrb.transform.localScale = Vector3.one * Mathf.Lerp(0.24f, 0.18f, t);
            core.transform.localScale = Vector3.one * Mathf.Lerp(0.12f, 0.62f, Mathf.Max(0f, t - 0.18f) / 0.82f);
            orbitRing.transform.localScale = Vector3.one * Mathf.Lerp(0.7f, 1.8f, t);
            SetLineAlpha(orbitRing, Mathf.Lerp(0.85f, 0.18f, t));
        });

        if (previewOnly)
        {
            yield return FadeTransientObjects(0.28f);
            yield break;
        }

        var flashOverlay = CreateCameraOverlay("PurpleFlash", new Color(0.82f, 0.48f, 1f, 0.32f));
        var beamOuter = CreateTransientBeam("PurpleBeamOuter", beamStart, beamEnd, 0.28f, theme.primary);
        var beamInner = CreateTransientBeam("PurpleBeamInner", beamStart, beamEnd, 0.12f, theme.accent);
        var impactSphere = CreateTransientPrimitive(
            PrimitiveType.Sphere,
            "PurpleImpactSphere",
            beamEnd,
            Vector3.one * 0.28f,
            CreateRuntimeMaterial(theme.secondary, transparent: true),
            effectRoot
        );
        var impactRing = CreateTransientRing(
            "PurpleImpactRing",
            beamEnd,
            Quaternion.Euler(90f, 0f, 0f),
            1f,
            0.14f,
            theme.accent,
            faceCamera: false,
            effectRoot
        );
        CreateBurstParticles("PurpleImpactBurst", beamEnd, theme.secondary, theme.accent, 34, 4.2f, 0.18f, 0.24f, 0.7f);
        StartShake(0.32f, 0.22f);

        yield return AnimateOverTime(0.44f, (t) =>
        {
            var pulse = 1f + Mathf.Sin(t * Mathf.PI * 8f) * 0.08f;
            core.transform.localScale = Vector3.one * Mathf.Lerp(0.62f, 0.9f, t) * pulse;
            impactSphere.transform.localScale = Vector3.one * Mathf.Lerp(0.28f, 2.8f, EaseOutCubic(t));
            impactRing.transform.localScale = Vector3.one * Mathf.Lerp(0.3f, 4.2f, EaseOutCubic(t));
            SetLineAlpha(beamOuter, Mathf.Lerp(0.92f, 0.22f, t));
            SetLineAlpha(beamInner, Mathf.Lerp(1f, 0.18f, t));
            SetAlpha(impactSphere, Mathf.Lerp(0.78f, 0f, t));
            SetLineAlpha(impactRing, Mathf.Lerp(0.95f, 0f, t));
            SetAlpha(flashOverlay, Mathf.Lerp(0.32f, 0f, t));
            SetAlpha(core, Mathf.Lerp(0.95f, 0f, t));
            SetAlpha(blueOrb, Mathf.Lerp(0.45f, 0f, t));
            SetAlpha(redOrb, Mathf.Lerp(0.45f, 0f, t));
            SetLineAlpha(orbitRing, Mathf.Lerp(0.2f, 0f, t));
        });
    }

    private IEnumerator PlayInfiniteVoid(bool previewOnly)
    {
        var theme = GetSkillTheme("jjk_gojo_infinite_void");
        SetCameraPreset("domain_expansion", false);
        ApplySkillTheme("jjk_gojo_infinite_void", true);

        var center = centerAnchor.localPosition + new Vector3(0f, 1.1f, 0f);
        var dome = CreateTransientPrimitive(
            PrimitiveType.Sphere,
            "InfiniteVoidDome",
            center,
            Vector3.one * 0.24f,
            CreateRuntimeMaterial(theme.primary, transparent: true),
            effectRoot
        );
        var innerRing = CreateTransientRing(
            "InfiniteVoidInnerRing",
            center,
            Quaternion.Euler(90f, 0f, 0f),
            1f,
            0.08f,
            theme.secondary,
            faceCamera: false,
            effectRoot
        );
        var midRing = CreateTransientRing(
            "InfiniteVoidMidRing",
            center + new Vector3(0f, 0.24f, 0f),
            Quaternion.Euler(90f, 0f, 0f),
            1f,
            0.06f,
            theme.primary,
            faceCamera: false,
            effectRoot
        );
        var haloRing = CreateTransientRing(
            "InfiniteVoidHaloRing",
            center,
            Quaternion.identity,
            1f,
            0.04f,
            theme.accent,
            faceCamera: true,
            effectRoot
        );
        var overlay = CreateCameraOverlay("InfiniteVoidOverlay", new Color(0.42f, 0.32f, 0.9f, 0.24f));
        var shards = CreateDomainShards(center, theme);

        yield return AnimateOverTime(0.86f, (t) =>
        {
            var eased = EaseOutCubic(t);
            var domeScale = Mathf.Lerp(0.24f, previewOnly ? 4.6f : 7.8f, eased);
            dome.transform.localScale = new Vector3(domeScale, domeScale, domeScale);
            innerRing.transform.localScale = Vector3.one * Mathf.Lerp(0.5f, 3.2f, eased);
            midRing.transform.localScale = Vector3.one * Mathf.Lerp(0.8f, 4.1f, eased);
            haloRing.transform.localScale = Vector3.one * Mathf.Lerp(0.7f, 2.4f, eased);
            SetAlpha(dome, Mathf.Lerp(0.06f, previewOnly ? 0.18f : 0.28f, t));
            SetLineAlpha(innerRing, Mathf.Lerp(0.65f, 0.4f, t));
            SetLineAlpha(midRing, Mathf.Lerp(0.55f, 0.28f, t));
            SetLineAlpha(haloRing, Mathf.Lerp(0.38f, 0.12f, t));
            SetAlpha(overlay, Mathf.Lerp(0.04f, previewOnly ? 0.14f : 0.24f, t));
            AnimateDomainShards(shards, center, t);
        });

        if (!previewOnly)
        {
            StartShake(0.55f, 0.12f);
            CreateBurstParticles("InfiniteVoidSparkBurst", center, theme.accent, theme.secondary, 42, 2.8f, 0.12f, 0.8f, 0.9f);

            yield return AnimateOverTime(0.52f, (t) =>
            {
                var pulse = 1f + Mathf.Sin(t * Mathf.PI * 10f) * 0.04f;
                haloRing.transform.localScale = Vector3.one * 2.4f * pulse;
                innerRing.transform.localScale = Vector3.one * Mathf.Lerp(3.2f, 4.6f, t);
                midRing.transform.localScale = Vector3.one * Mathf.Lerp(4.1f, 5.4f, t);
                SetAlpha(overlay, Mathf.Lerp(0.24f, 0.32f, t));
                AnimateDomainShards(shards, center, 1f + t);
            });
        }

        yield return AnimateOverTime(previewOnly ? 0.42f : 0.92f, (t) =>
        {
            var eased = EaseInOutCubic(t);
            SetAlpha(dome, Mathf.Lerp(previewOnly ? 0.18f : 0.28f, 0f, eased));
            SetLineAlpha(innerRing, Mathf.Lerp(0.4f, 0f, eased));
            SetLineAlpha(midRing, Mathf.Lerp(0.28f, 0f, eased));
            SetLineAlpha(haloRing, Mathf.Lerp(0.12f, 0f, eased));
            SetAlpha(overlay, Mathf.Lerp(previewOnly ? 0.14f : 0.32f, 0f, eased));
            AnimateDomainShards(shards, center, 1.8f + t);
            FadeShardAlpha(shards, 1f - eased);
        });
    }

    private IEnumerator PlayRejectedBurst(Color color)
    {
        SetCameraPreset(GetScenePreset(currentScene), false);
        var point = selfAnchor.localPosition + new Vector3(0f, 1.2f, 0f);
        var ring = CreateTransientRing(
            "RejectedRing",
            point,
            Quaternion.identity,
            1f,
            0.07f,
            color,
            faceCamera: true,
            effectRoot
        );
        var sphere = CreateTransientPrimitive(
            PrimitiveType.Sphere,
            "RejectedSphere",
            point,
            Vector3.one * 0.2f,
            CreateRuntimeMaterial(color, transparent: true),
            effectRoot
        );

        yield return AnimateOverTime(0.34f, (t) =>
        {
            ring.transform.localScale = Vector3.one * Mathf.Lerp(0.4f, 1.85f, EaseOutCubic(t));
            sphere.transform.localScale = Vector3.one * Mathf.Lerp(0.2f, 0.65f, t);
            SetLineAlpha(ring, Mathf.Lerp(0.88f, 0f, t));
            SetAlpha(sphere, Mathf.Lerp(0.56f, 0f, t));
        });
    }

    private IEnumerator PlayResultPulse(SkillTheme theme)
    {
        if (floorMaterial != null)
        {
            floorMaterial.color = Color.Lerp(theme.background, theme.primary, 0.2f);
        }

        if (stageCamera != null)
        {
            stageCamera.backgroundColor = theme.background;
        }

        SetCameraPreset("result_idle", false);

        var overlay = CreateCameraOverlay("ResultOverlay", new Color(theme.primary.r, theme.primary.g, theme.primary.b, 0.22f));
        var ring = CreateTransientRing(
            "ResultRing",
            centerAnchor.localPosition + new Vector3(0f, 1.1f, 0f),
            Quaternion.Euler(90f, 0f, 0f),
            1f,
            0.12f,
            theme.secondary,
            faceCamera: false,
            effectRoot
        );

        yield return AnimateOverTime(0.72f, (t) =>
        {
            ring.transform.localScale = Vector3.one * Mathf.Lerp(0.5f, 5.8f, EaseOutCubic(t));
            SetLineAlpha(ring, Mathf.Lerp(0.95f, 0f, t));
            SetAlpha(overlay, Mathf.Lerp(0.22f, 0f, t));
        });
    }

    private void EnsureStage()
    {
        if (
            stageRoot != null &&
            staticRoot != null &&
            previewRoot != null &&
            effectRoot != null &&
            selfAnchor != null &&
            opponentAnchor != null &&
            centerAnchor != null
        )
        {
            EnsureCameraAndLight();
            EnsurePreviewRig();
            return;
        }

        if (stageRoot == null)
        {
            stageRoot = new GameObject("RuntimeStageRoot").transform;
            stageRoot.SetParent(transform, false);
        }

        if (staticRoot == null)
        {
            staticRoot = EnsureChild(stageRoot, "StaticStage");
        }

        if (previewRoot == null)
        {
            previewRoot = EnsureChild(stageRoot, "PreviewStage");
        }

        if (effectRoot == null)
        {
            effectRoot = EnsureChild(stageRoot, "TransientEffects");
        }

        if (centerAnchor == null)
        {
            centerAnchor = EnsureChild(stageRoot, "CenterAnchor");
            centerAnchor.localPosition = new Vector3(0f, 0f, 0f);
        }

        if (selfAnchor == null)
        {
            selfAnchor = EnsureChild(stageRoot, "SelfAnchor");
            selfAnchor.localPosition = new Vector3(-2.4f, 0f, 0f);
        }

        if (opponentAnchor == null)
        {
            opponentAnchor = EnsureChild(stageRoot, "OpponentAnchor");
            opponentAnchor.localPosition = new Vector3(2.4f, 0f, 0f);
        }

        EnsureStaticStageGeometry();
        EnsureCameraAndLight();
        EnsurePreviewRig();
    }

    private void EnsureStaticStageGeometry()
    {
        if (floorMaterial == null)
        {
            floorMaterial = CreateRuntimeMaterial(new Color(0.1f, 0.12f, 0.2f, 1f), transparent: false);
        }

        if (platformMaterial == null)
        {
            platformMaterial = CreateRuntimeMaterial(new Color(0.16f, 0.18f, 0.28f, 1f), transparent: false);
        }

        if (backdropMaterial == null)
        {
            backdropMaterial = CreateRuntimeMaterial(new Color(0.05f, 0.08f, 0.16f, 1f), transparent: false);
        }

        if (stageRingMaterial == null)
        {
            stageRingMaterial = CreateRuntimeMaterial(new Color(0.52f, 0.66f, 1f, 0.24f), transparent: true);
        }

        if (markerPrimaryMaterial == null)
        {
            markerPrimaryMaterial = CreateRuntimeMaterial(new Color(0.72f, 0.82f, 1f, 0.18f), transparent: true);
        }

        if (markerSecondaryMaterial == null)
        {
            markerSecondaryMaterial = CreateRuntimeMaterial(new Color(1f, 0.78f, 0.68f, 0.14f), transparent: true);
        }

        if (GameObject.Find($"{name}_StageFloor") == null)
        {
            var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = $"{name}_StageFloor";
            floor.transform.SetParent(staticRoot, false);
            floor.transform.localPosition = new Vector3(0f, -1.28f, 0f);
            floor.transform.localScale = new Vector3(12f, 0.12f, 7.5f);
            RemoveCollider(floor);

            var renderer = floor.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = floorMaterial;
            }
        }

        if (GameObject.Find($"{name}_StagePlatform") == null)
        {
            var platform = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            platform.name = $"{name}_StagePlatform";
            platform.transform.SetParent(staticRoot, false);
            platform.transform.localPosition = new Vector3(0f, -1.2f, 0f);
            platform.transform.localScale = new Vector3(3.6f, 0.08f, 3.6f);
            RemoveCollider(platform);

            var renderer = platform.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = platformMaterial;
            }
        }

        if (GameObject.Find($"{name}_Backdrop") == null)
        {
            var backdrop = GameObject.CreatePrimitive(PrimitiveType.Quad);
            backdrop.name = $"{name}_Backdrop";
            backdrop.transform.SetParent(staticRoot, false);
            backdrop.transform.localPosition = new Vector3(0f, 2.4f, 4.2f);
            backdrop.transform.localScale = new Vector3(12f, 8f, 1f);
            RemoveCollider(backdrop);

            var renderer = backdrop.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = backdropMaterial;
            }
        }

        if (stageRingRenderer == null)
        {
            stageRingRenderer = CreateStaticRing(
                $"{name}_ArenaRing",
                new Vector3(0f, -1.11f, 0f),
                3.4f,
                0.05f,
                stageRingMaterial
            );
        }

        EnsureStageMarker($"{name}_SelfMarker", selfAnchor, markerPrimaryMaterial);
        EnsureStageMarker($"{name}_OpponentMarker", opponentAnchor, markerSecondaryMaterial);
    }

    private void EnsureCameraAndLight()
    {
        if (stageCamera == null)
        {
            stageCamera = Camera.main;
        }

        if (stageCamera == null)
        {
            var cameraObject = new GameObject("RuntimeStageCamera");
            cameraObject.transform.SetParent(transform, false);
            stageCamera = cameraObject.AddComponent<Camera>();
        }

        stageCamera.clearFlags = CameraClearFlags.SolidColor;
        stageCamera.nearClipPlane = 0.1f;
        stageCamera.farClipPlane = 100f;

        if (keyLight == null)
        {
            var lightObject = new GameObject("RuntimeKeyLight");
            lightObject.transform.SetParent(transform, false);
            keyLight = lightObject.AddComponent<Light>();
            keyLight.type = LightType.Directional;
            keyLight.intensity = 1.25f;
            lightObject.transform.rotation = Quaternion.Euler(35f, -26f, 0f);
        }
    }

    private void EnsurePreviewRig()
    {
        if (previewRoot == null)
        {
            return;
        }

        if (chargeCoreObject == null)
        {
            chargeCoreMaterial = CreateRuntimeMaterial(new Color(0.72f, 0.34f, 1f, 0.86f), transparent: true);
            chargeCoreObject = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            chargeCoreObject.name = "PreviewChargeCore";
            chargeCoreObject.transform.SetParent(previewRoot, false);
            chargeCoreObject.transform.localPosition = selfAnchor.localPosition + new Vector3(0f, 1.35f, 0f);
            chargeCoreObject.transform.localScale = Vector3.one * 0.001f;
            RemoveCollider(chargeCoreObject);

            var renderer = chargeCoreObject.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = chargeCoreMaterial;
            }
        }

        if (progressRingRenderer == null)
        {
            progressRingMaterial = CreateRuntimeMaterial(new Color(0.74f, 0.48f, 1f, 0.82f), transparent: true);
            progressRingRenderer = CreatePersistentRing(
                "PreviewPrimaryRing",
                selfAnchor.localPosition + new Vector3(0f, 1.35f, 0f),
                progressRingMaterial
            );
        }

        if (secondaryRingRenderer == null)
        {
            secondaryRingMaterial = CreateRuntimeMaterial(new Color(0.38f, 0.62f, 1f, 0.54f), transparent: true);
            secondaryRingRenderer = CreatePersistentRing(
                "PreviewSecondaryRing",
                selfAnchor.localPosition + new Vector3(0f, 1.35f, 0f),
                secondaryRingMaterial
            );
        }
    }

    private void UpdatePracticePreview(float normalizedProgress, int currentStep, int targetLength, bool handDetected)
    {
        EnsurePreviewRig();

        practiceCurrentStep = currentStep;
        practiceTargetLength = targetLength;
        practiceHandDetected = handDetected;
        practiceProgressNormalized = normalizedProgress;
        targetChargeScale = Mathf.Lerp(0.18f, 0.82f, normalizedProgress);
        progressRingScale = Mathf.Lerp(0.65f, 1.45f, normalizedProgress);
        secondaryRingScale = Mathf.Lerp(0.92f, 1.95f, normalizedProgress);

        if (progressRingRenderer != null)
        {
            progressRingRenderer.widthMultiplier = handDetected ? 0.08f : 0.04f;
        }

        if (secondaryRingRenderer != null)
        {
            secondaryRingRenderer.widthMultiplier = handDetected ? 0.04f : 0.022f;
        }
    }

    private void SetPreviewVisible(bool visible)
    {
        if (previewRoot != null)
        {
            previewRoot.gameObject.SetActive(visible);
        }
    }

    private void ApplySkillTheme(string skillId, bool immediateCamera)
    {
        var theme = GetSkillTheme(skillId);

        if (floorMaterial != null)
        {
            floorMaterial.color = Color.Lerp(theme.background, theme.primary, 0.18f);
        }

        if (platformMaterial != null)
        {
            platformMaterial.color = Color.Lerp(theme.background, theme.secondary, 0.24f);
        }

        if (backdropMaterial != null)
        {
            backdropMaterial.color = Color.Lerp(theme.background, theme.primary, 0.08f);
        }

        if (chargeCoreMaterial != null)
        {
            chargeCoreMaterial.color = new Color(theme.primary.r, theme.primary.g, theme.primary.b, 0.9f);
        }

        if (progressRingMaterial != null)
        {
            progressRingMaterial.color = new Color(theme.secondary.r, theme.secondary.g, theme.secondary.b, 0.86f);
        }

        if (secondaryRingMaterial != null)
        {
            secondaryRingMaterial.color = new Color(theme.accent.r, theme.accent.g, theme.accent.b, 0.52f);
        }

        if (stageRingMaterial != null)
        {
            stageRingMaterial.color = new Color(theme.secondary.r, theme.secondary.g, theme.secondary.b, 0.28f);
        }

        if (markerPrimaryMaterial != null)
        {
            markerPrimaryMaterial.color = new Color(theme.secondary.r, theme.secondary.g, theme.secondary.b, 0.18f);
        }

        if (markerSecondaryMaterial != null)
        {
            markerSecondaryMaterial.color = new Color(theme.accent.r, theme.accent.g, theme.accent.b, 0.14f);
        }

        if (stageCamera != null)
        {
            stageCamera.backgroundColor = theme.background;
            if (immediateCamera)
            {
                SetCameraPreset(GetScenePreset(currentScene), true);
            }
        }
    }

    private void SetCameraPreset(string presetId, bool immediate)
    {
        if (stageCamera == null)
        {
            return;
        }

        var pose = ResolveCameraPose(string.IsNullOrWhiteSpace(presetId) ? GetScenePreset(currentScene) : presetId);
        targetCameraPosition = pose.position;
        targetCameraRotation = Quaternion.LookRotation(
            (pose.lookTarget - pose.position).normalized,
            Vector3.up
        );
        targetFieldOfView = pose.fieldOfView;
        stageRingScale = currentScene == "result" ? 1.08f : currentScene == "battle" ? 1f : 0.94f;

        if (immediate || !hasDesiredCameraPose)
        {
            stageCamera.transform.position = targetCameraPosition;
            stageCamera.transform.rotation = targetCameraRotation;
            stageCamera.fieldOfView = targetFieldOfView;
        }

        hasDesiredCameraPose = true;
    }

    private CameraPose ResolveCameraPose(string presetId)
    {
        var self = selfAnchor != null ? selfAnchor.position : transform.position + new Vector3(-2.4f, 0f, 0f);
        var opponent = opponentAnchor != null ? opponentAnchor.position : transform.position + new Vector3(2.4f, 0f, 0f);
        var center = centerAnchor != null ? centerAnchor.position : transform.position;

        switch (presetId)
        {
            case "projectile_closeup":
                return new CameraPose
                {
                    fieldOfView = 34f,
                    lookTarget = Vector3.Lerp(self, opponent, 0.44f) + new Vector3(0f, 1.15f, 0f),
                    position = center + new Vector3(-1.45f, 2.05f, -6.1f)
                };
            case "beam_finisher":
                return new CameraPose
                {
                    fieldOfView = 28f,
                    lookTarget = opponent + new Vector3(0f, 1.15f, 0f),
                    position = center + new Vector3(-0.2f, 2.45f, -7.2f)
                };
            case "domain_expansion":
                return new CameraPose
                {
                    fieldOfView = 48f,
                    lookTarget = center + new Vector3(0f, 1.15f, 0f),
                    position = center + new Vector3(0f, 5.1f, -6.6f)
                };
            case "result_idle":
                return new CameraPose
                {
                    fieldOfView = 36f,
                    lookTarget = center + new Vector3(0f, 1.1f, 0f),
                    position = center + new Vector3(0f, 2.8f, -7.4f)
                };
            case "battle_idle":
                return new CameraPose
                {
                    fieldOfView = 40f,
                    lookTarget = center + new Vector3(0f, 1.1f, 0f),
                    position = center + new Vector3(0f, 2.3f, -8.8f)
                };
            case "practice_idle":
            default:
                return new CameraPose
                {
                    fieldOfView = 39f,
                    lookTarget = self + new Vector3(1.9f, 1.15f, 0f),
                    position = center + new Vector3(-0.7f, 2f, -8.3f)
                };
        }
    }

    private string GetScenePreset(string scene)
    {
        switch (scene)
        {
            case "battle":
                return "battle_idle";
            case "result":
                return "result_idle";
            case "practice":
            default:
                return "practice_idle";
        }
    }

    private SkillTheme GetSkillTheme(string skillId)
    {
        switch (skillId)
        {
            case "jjk_gojo_red":
                return new SkillTheme
                {
                    accent = new Color(1f, 0.94f, 0.78f, 1f),
                    background = new Color(0.11f, 0.04f, 0.05f, 1f),
                    primary = new Color(1f, 0.28f, 0.2f, 1f),
                    secondary = new Color(1f, 0.72f, 0.3f, 1f)
                };
            case "jjk_gojo_hollow_purple":
                return new SkillTheme
                {
                    accent = new Color(0.98f, 0.88f, 1f, 1f),
                    background = new Color(0.06f, 0.04f, 0.12f, 1f),
                    primary = new Color(0.7f, 0.25f, 1f, 1f),
                    secondary = new Color(0.38f, 0.6f, 1f, 1f)
                };
            case "jjk_gojo_infinite_void":
                return new SkillTheme
                {
                    accent = new Color(0.95f, 0.88f, 1f, 1f),
                    background = new Color(0.02f, 0.04f, 0.12f, 1f),
                    primary = new Color(0.22f, 0.46f, 1f, 1f),
                    secondary = new Color(0.72f, 0.5f, 1f, 1f)
                };
            default:
                return new SkillTheme
                {
                    accent = new Color(0.86f, 0.92f, 1f, 1f),
                    background = new Color(0.05f, 0.08f, 0.16f, 1f),
                    primary = new Color(0.32f, 0.56f, 1f, 1f),
                    secondary = new Color(0.68f, 0.72f, 1f, 1f)
                };
        }
    }

    private void ClearTransientEffects()
    {
        if (activeSequenceRoutine != null)
        {
            StopCoroutine(activeSequenceRoutine);
            activeSequenceRoutine = null;
        }

        if (shakeRoutine != null)
        {
            StopCoroutine(shakeRoutine);
            shakeRoutine = null;
        }

        foreach (var transientObject in transientObjects)
        {
            if (transientObject != null)
            {
                Destroy(transientObject);
            }
        }

        transientObjects.Clear();
        SetCameraPreset(GetScenePreset(currentScene), true);
    }

    private void UpdateCameraRig()
    {
        if (stageCamera == null || !hasDesiredCameraPose)
        {
            return;
        }

        var blendFactor = 1f - Mathf.Exp(-6f * Time.deltaTime);
        stageCamera.transform.position = Vector3.Lerp(
            stageCamera.transform.position,
            targetCameraPosition,
            blendFactor
        );
        stageCamera.transform.rotation = Quaternion.Slerp(
            stageCamera.transform.rotation,
            targetCameraRotation,
            blendFactor
        );
        stageCamera.fieldOfView = Mathf.Lerp(
            stageCamera.fieldOfView,
            targetFieldOfView,
            blendFactor
        );
    }

    private IEnumerator FadeTransientObjects(float duration)
    {
        var renderers = new List<Renderer>();
        var lines = new List<LineRenderer>();

        foreach (var transientObject in transientObjects)
        {
            if (transientObject == null)
            {
                continue;
            }

            var renderer = transientObject.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderers.Add(renderer);
            }

            var line = transientObject.GetComponent<LineRenderer>();
            if (line != null)
            {
                lines.Add(line);
            }
        }

        yield return AnimateOverTime(duration, (t) =>
        {
            var alpha = Mathf.Lerp(1f, 0f, t);
            foreach (var renderer in renderers)
            {
                if (renderer != null)
                {
                    SetAlpha(renderer.gameObject, alpha);
                }
            }

            foreach (var line in lines)
            {
                if (line != null)
                {
                    SetLineAlpha(line, alpha);
                }
            }
        });
    }

    private IEnumerator AnimateOverTime(float duration, Action<float> onStep)
    {
        if (duration <= 0f)
        {
            onStep?.Invoke(1f);
            yield break;
        }

        var elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            onStep?.Invoke(Mathf.Clamp01(elapsed / duration));
            yield return null;
        }

        onStep?.Invoke(1f);
    }

    private void StartShake(float duration, float amplitude)
    {
        if (stageCamera == null)
        {
            return;
        }

        if (shakeRoutine != null)
        {
            StopCoroutine(shakeRoutine);
        }

        shakeRoutine = StartCoroutine(ShakeCamera(duration, amplitude));
    }

    private IEnumerator ShakeCamera(float duration, float amplitude)
    {
        if (stageCamera == null)
        {
            yield break;
        }

        var basePosition = stageCamera.transform.position;
        var elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            var strength = Mathf.Lerp(amplitude, 0f, elapsed / duration);
            var offset = UnityEngine.Random.insideUnitSphere * strength;
            offset.z *= 0.35f;
            stageCamera.transform.position = basePosition + offset;
            yield return null;
        }

        stageCamera.transform.position = basePosition;
        shakeRoutine = null;
    }

    private GameObject CreateTransientPrimitive(
        PrimitiveType primitiveType,
        string objectName,
        Vector3 localPosition,
        Vector3 localScale,
        Material material,
        Transform parent
    )
    {
        var gameObject = GameObject.CreatePrimitive(primitiveType);
        gameObject.name = objectName;
        gameObject.transform.SetParent(parent, false);
        gameObject.transform.localPosition = localPosition;
        gameObject.transform.localScale = localScale;
        RegisterTransient(gameObject);
        RemoveCollider(gameObject);

        var renderer = gameObject.GetComponent<Renderer>();
        if (renderer != null)
        {
            renderer.sharedMaterial = material;
        }

        return gameObject;
    }

    private LineRenderer CreateTransientRing(
        string objectName,
        Vector3 localPosition,
        Quaternion localRotation,
        float baseScale,
        float width,
        Color color,
        bool faceCamera,
        Transform parent
    )
    {
        var ringObject = new GameObject(objectName);
        ringObject.transform.SetParent(parent, false);
        ringObject.transform.localPosition = localPosition;
        ringObject.transform.localRotation = localRotation;
        ringObject.transform.localScale = Vector3.one * baseScale;
        RegisterTransient(ringObject);

        var line = ringObject.AddComponent<LineRenderer>();
        line.loop = true;
        line.useWorldSpace = false;
        line.positionCount = 72;
        line.widthMultiplier = width;
        line.numCornerVertices = 4;
        line.numCapVertices = 4;
        line.alignment = faceCamera ? LineAlignment.View : LineAlignment.TransformZ;
        line.sharedMaterial = CreateRuntimeMaterial(color, transparent: true);

        for (var index = 0; index < line.positionCount; index += 1)
        {
            var angle = index / (float)(line.positionCount - 1) * Mathf.PI * 2f;
            line.SetPosition(index, new Vector3(Mathf.Cos(angle), Mathf.Sin(angle), 0f));
        }

        return line;
    }

    private LineRenderer CreatePersistentRing(string objectName, Vector3 localPosition, Material material)
    {
        var ringObject = new GameObject(objectName);
        ringObject.transform.SetParent(previewRoot, false);
        ringObject.transform.localPosition = localPosition;
        ringObject.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);

        var line = ringObject.AddComponent<LineRenderer>();
        line.loop = true;
        line.useWorldSpace = false;
        line.positionCount = 72;
        line.widthMultiplier = 0.06f;
        line.numCornerVertices = 4;
        line.numCapVertices = 4;
        line.alignment = LineAlignment.TransformZ;
        line.sharedMaterial = material;

        for (var index = 0; index < line.positionCount; index += 1)
        {
            var angle = index / (float)(line.positionCount - 1) * Mathf.PI * 2f;
            line.SetPosition(index, new Vector3(Mathf.Cos(angle), Mathf.Sin(angle), 0f));
        }

        return line;
    }

    private LineRenderer CreateStaticRing(
        string objectName,
        Vector3 localPosition,
        float radius,
        float width,
        Material material
    )
    {
        var ringObject = new GameObject(objectName);
        ringObject.transform.SetParent(staticRoot, false);
        ringObject.transform.localPosition = localPosition;
        ringObject.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);

        var line = ringObject.AddComponent<LineRenderer>();
        line.loop = true;
        line.useWorldSpace = false;
        line.positionCount = 96;
        line.widthMultiplier = width;
        line.numCornerVertices = 6;
        line.numCapVertices = 4;
        line.alignment = LineAlignment.TransformZ;
        line.sharedMaterial = material;

        for (var index = 0; index < line.positionCount; index += 1)
        {
            var angle = index / (float)(line.positionCount - 1) * Mathf.PI * 2f;
            line.SetPosition(index, new Vector3(Mathf.Cos(angle) * radius, Mathf.Sin(angle) * radius, 0f));
        }

        return line;
    }

    private LineRenderer CreateTransientBeam(
        string objectName,
        Vector3 startLocalPosition,
        Vector3 endLocalPosition,
        float width,
        Color color
    )
    {
        var beamObject = new GameObject(objectName);
        beamObject.transform.SetParent(effectRoot, false);
        RegisterTransient(beamObject);

        var line = beamObject.AddComponent<LineRenderer>();
        line.loop = false;
        line.useWorldSpace = false;
        line.positionCount = 2;
        line.widthMultiplier = width;
        line.numCornerVertices = 6;
        line.numCapVertices = 4;
        line.alignment = LineAlignment.View;
        line.sharedMaterial = CreateRuntimeMaterial(color, transparent: true, additive: true);
        line.SetPosition(0, startLocalPosition);
        line.SetPosition(1, endLocalPosition);
        return line;
    }

    private ParticleSystem CreateBurstParticles(
        string objectName,
        Vector3 localPosition,
        Color startColor,
        Color endColor,
        int particleCount,
        float speed,
        float size,
        float radius,
        float lifetime
    )
    {
        var particleObject = new GameObject(objectName);
        particleObject.transform.SetParent(effectRoot, false);
        particleObject.transform.localPosition = localPosition;
        RegisterTransient(particleObject);

        var particleSystem = particleObject.AddComponent<ParticleSystem>();
        var main = particleSystem.main;
        main.loop = false;
        main.duration = lifetime;
        main.startLifetime = lifetime;
        main.startSpeed = speed;
        main.startSize = size;
        main.maxParticles = particleCount;
        main.simulationSpace = ParticleSystemSimulationSpace.Local;
        main.startColor = new ParticleSystem.MinMaxGradient(startColor, endColor);

        var emission = particleSystem.emission;
        emission.rateOverTime = 0f;

        var shape = particleSystem.shape;
        shape.shapeType = ParticleSystemShapeType.Sphere;
        shape.radius = radius;

        var colorOverLifetime = particleSystem.colorOverLifetime;
        colorOverLifetime.enabled = true;
        var gradient = new Gradient();
        gradient.SetKeys(
            new[]
            {
                new GradientColorKey(startColor, 0f),
                new GradientColorKey(endColor, 0.55f),
                new GradientColorKey(endColor, 1f)
            },
            new[]
            {
                new GradientAlphaKey(0.95f, 0f),
                new GradientAlphaKey(0.45f, 0.55f),
                new GradientAlphaKey(0f, 1f)
            }
        );
        colorOverLifetime.color = new ParticleSystem.MinMaxGradient(gradient);

        var particleRenderer = particleObject.GetComponent<ParticleSystemRenderer>();
        if (particleRenderer != null)
        {
            particleRenderer.material = CreateRuntimeMaterial(startColor, transparent: true, additive: true);
        }

        particleSystem.Emit(particleCount);
        particleSystem.Play();
        return particleSystem;
    }

    private GameObject CreateCameraOverlay(string objectName, Color color)
    {
        if (stageCamera == null)
        {
            return null;
        }

        var overlay = GameObject.CreatePrimitive(PrimitiveType.Quad);
        overlay.name = objectName;
        overlay.transform.SetParent(stageCamera.transform, false);
        overlay.transform.localPosition = new Vector3(0f, 0f, 2f);
        overlay.transform.localRotation = Quaternion.identity;
        RemoveCollider(overlay);
        RegisterTransient(overlay);

        var height = 2f * overlay.transform.localPosition.z * Mathf.Tan(stageCamera.fieldOfView * 0.5f * Mathf.Deg2Rad);
        var width = height * stageCamera.aspect;
        overlay.transform.localScale = new Vector3(width, height, 1f);

        var renderer = overlay.GetComponent<Renderer>();
        if (renderer != null)
        {
            renderer.sharedMaterial = CreateRuntimeMaterial(color, transparent: true);
        }

        return overlay;
    }

    private List<GameObject> CreateDomainShards(Vector3 center, SkillTheme theme)
    {
        var shards = new List<GameObject>();

        for (var index = 0; index < 12; index += 1)
        {
            var shard = CreateTransientPrimitive(
                PrimitiveType.Cube,
                $"InfiniteVoidShard_{index}",
                center,
                Vector3.one * 0.16f,
                CreateRuntimeMaterial(index % 2 == 0 ? theme.secondary : theme.accent, transparent: true),
                effectRoot
            );
            shards.Add(shard);
        }

        return shards;
    }

    private void AnimateDomainShards(IReadOnlyList<GameObject> shards, Vector3 center, float phase)
    {
        if (shards == null)
        {
            return;
        }

        for (var index = 0; index < shards.Count; index += 1)
        {
            var shard = shards[index];
            if (shard == null)
            {
                continue;
            }

            var orbitAngle = phase * 2.1f + index * 0.55f;
            var radius = 1.7f + index * 0.18f;
            var height = 0.6f + Mathf.Sin(phase * 3.4f + index) * 0.7f + index * 0.05f;
            var position = center + new Vector3(Mathf.Cos(orbitAngle) * radius, height, Mathf.Sin(orbitAngle) * radius * 0.42f);
            shard.transform.localPosition = position;
            shard.transform.localScale = Vector3.one * (0.12f + (index % 4) * 0.04f);
            shard.transform.Rotate(55f * Time.deltaTime, 80f * Time.deltaTime, 35f * Time.deltaTime, Space.Self);
        }
    }

    private void FadeShardAlpha(IReadOnlyList<GameObject> shards, float strength)
    {
        if (shards == null)
        {
            return;
        }

        for (var index = 0; index < shards.Count; index += 1)
        {
            var shard = shards[index];
            if (shard == null)
            {
                continue;
            }

            SetAlpha(shard, Mathf.Clamp01(strength) * 0.85f);
        }
    }

    private Material CreateRuntimeMaterial(Color color, bool transparent, bool additive = false)
    {
        var shader = ResolveShader(transparent, additive);
        var material = shader != null ? new Material(shader) : new Material(Shader.Find("Standard"));
        material.color = color;
        runtimeMaterials.Add(material);
        return material;
    }

    private Shader ResolveShader(bool transparent, bool additive)
    {
        if (additive)
        {
            return Shader.Find("Legacy Shaders/Particles/Additive")
                ?? Shader.Find("Particles/Standard Unlit")
                ?? Shader.Find("Sprites/Default")
                ?? Shader.Find("Standard");
        }

        if (transparent)
        {
            return Shader.Find("Unlit/Transparent")
                ?? Shader.Find("Sprites/Default")
                ?? Shader.Find("Legacy Shaders/Particles/Alpha Blended")
                ?? Shader.Find("Standard");
        }

        return Shader.Find("Unlit/Color") ?? Shader.Find("Standard");
    }

    private void SetAlpha(GameObject target, float alpha)
    {
        if (target == null)
        {
            return;
        }

        var renderer = target.GetComponent<Renderer>();
        if (renderer?.sharedMaterial == null)
        {
            return;
        }

        var nextColor = renderer.sharedMaterial.color;
        nextColor.a = alpha;
        renderer.sharedMaterial.color = nextColor;
    }

    private void SetLineAlpha(LineRenderer line, float alpha)
    {
        if (line?.sharedMaterial == null)
        {
            return;
        }

        var nextColor = line.sharedMaterial.color;
        nextColor.a = alpha;
        line.sharedMaterial.color = nextColor;
        line.startColor = nextColor;
        line.endColor = nextColor;
    }

    private void RegisterTransient(GameObject transientObject)
    {
        if (transientObject != null)
        {
            transientObjects.Add(transientObject);
        }
    }

    private void EnsureStageMarker(string objectName, Transform anchor, Material material)
    {
        if (anchor == null || staticRoot == null || GameObject.Find(objectName) != null)
        {
            return;
        }

        var marker = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        marker.name = objectName;
        marker.transform.SetParent(staticRoot, false);
        marker.transform.localPosition = anchor.localPosition + new Vector3(0f, -0.1f, 0f);
        marker.transform.localScale = new Vector3(0.58f, 1.05f, 0.58f);
        RemoveCollider(marker);

        var renderer = marker.GetComponent<Renderer>();
        if (renderer != null)
        {
            renderer.sharedMaterial = material;
        }

        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = $"{objectName}_Head";
        head.transform.SetParent(marker.transform, false);
        head.transform.localPosition = new Vector3(0f, 0.92f, 0f);
        head.transform.localScale = new Vector3(0.62f, 0.52f, 0.62f);
        RemoveCollider(head);

        var headRenderer = head.GetComponent<Renderer>();
        if (headRenderer != null)
        {
            headRenderer.sharedMaterial = material;
        }
    }

    private Transform EnsureChild(Transform parent, string childName)
    {
        var child = parent.Find(childName);
        if (child != null)
        {
            return child;
        }

        var childObject = new GameObject(childName);
        childObject.transform.SetParent(parent, false);
        return childObject.transform;
    }

    private void RemoveCollider(GameObject target)
    {
        if (target == null)
        {
            return;
        }

        var collider = target.GetComponent<Collider>();
        if (collider != null)
        {
            Destroy(collider);
        }
    }

    private static float EaseInOutCubic(float value)
    {
        return value < 0.5f
            ? 4f * value * value * value
            : 1f - Mathf.Pow(-2f * value + 2f, 3f) / 2f;
    }

    private static float EaseOutCubic(float value)
    {
        return 1f - Mathf.Pow(1f - value, 3f);
    }

    private static string ReadOrFallback(string value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value;
    }
}
