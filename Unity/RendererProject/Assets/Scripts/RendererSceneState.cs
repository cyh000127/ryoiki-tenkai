using System;
using UnityEngine;

[Serializable]
public sealed class RendererSkillPresentationContract
{
    public string animsetId = string.Empty;
    public string cameraPresetId = string.Empty;
    public string clipId = string.Empty;
    public string fallbackMode = "html-only";
    public string impactVfxId = string.Empty;
    public string skillId = string.Empty;
    public string tier = "standard";
    public string timelineId = string.Empty;
}

[Serializable]
public sealed class RendererParticipantProjectionContract
{
    public int hp;
    public int mana;
    public string playerId = string.Empty;
}

[Serializable]
public sealed class RendererBootstrapPayloadContract
{
    public string animsetId = string.Empty;
    public string opponentId = string.Empty;
    public string playerId = string.Empty;
    public string scene = "practice";
}

[Serializable]
public sealed class RendererBootstrapEnvelopeContract
{
    public RendererBootstrapPayloadContract payload = new();
    public string type = string.Empty;
}

[Serializable]
public sealed class PracticeSkillSelectedPayloadContract
{
    public string[] gestureSequence = Array.Empty<string>();
    public RendererSkillPresentationContract presentation = new();
    public string skillId = string.Empty;
    public string skillName = string.Empty;
}

[Serializable]
public sealed class PracticeSkillSelectedEnvelopeContract
{
    public PracticeSkillSelectedPayloadContract payload = new();
    public string type = string.Empty;
}

[Serializable]
public sealed class PracticeProgressUpdatedPayloadContract
{
    public int completedRounds;
    public float confidence;
    public int currentStep;
    public string expectedToken = string.Empty;
    public bool handDetected;
    public string observedToken = string.Empty;
    public float progressPercent;
    public string status = "idle";
    public int targetLength;
}

[Serializable]
public sealed class PracticeProgressUpdatedEnvelopeContract
{
    public PracticeProgressUpdatedPayloadContract payload = new();
    public string type = string.Empty;
}

[Serializable]
public sealed class BattleStateSnapshotPayloadContract
{
    public string actionDeadlineAt = string.Empty;
    public string battleSessionId = string.Empty;
    public string matchId = string.Empty;
    public RendererParticipantProjectionContract opponent = new();
    public RendererSkillPresentationContract presentation = new();
    public string selectedSkillId = string.Empty;
    public string selectedSkillName = string.Empty;
    public RendererParticipantProjectionContract self = new();
    public string status = "ACTIVE";
    public int turnNumber;
    public string turnOwnerPlayerId = string.Empty;
}

[Serializable]
public sealed class BattleStateSnapshotEnvelopeContract
{
    public BattleStateSnapshotPayloadContract payload = new();
    public string type = string.Empty;
}

[Serializable]
public sealed class BattleActionResolvedPayloadContract
{
    public string actionId = string.Empty;
    public string actorPlayerId = string.Empty;
    public RendererSkillPresentationContract presentation = new();
    public string reason = string.Empty;
    public string result = "pending";
    public string skillId = string.Empty;
    public string skillName = string.Empty;
}

[Serializable]
public sealed class BattleActionResolvedEnvelopeContract
{
    public BattleActionResolvedPayloadContract payload = new();
    public string type = string.Empty;
}

[Serializable]
public sealed class BattleEndedPayloadContract
{
    public string battleSessionId = string.Empty;
    public string endedReason = string.Empty;
    public string loserPlayerId = string.Empty;
    public int ratingChange;
    public string resultForPlayer = string.Empty;
    public string winnerPlayerId = string.Empty;
}

[Serializable]
public sealed class BattleEndedEnvelopeContract
{
    public BattleEndedPayloadContract payload = new();
    public string type = string.Empty;
}

public sealed class RendererSceneState : MonoBehaviour
{
    [Header("Global")]
    [SerializeField] private string currentScene = "practice";
    [SerializeField] private string currentAnimsetId = string.Empty;
    [SerializeField] private string currentPlayerId = string.Empty;
    [SerializeField] private string currentOpponentId = string.Empty;

    [Header("Presentation")]
    [SerializeField] private string currentSkillId = string.Empty;
    [SerializeField] private string currentSkillName = string.Empty;
    [SerializeField] private string currentTimelineId = string.Empty;
    [SerializeField] private string currentClipId = string.Empty;
    [SerializeField] private string currentCameraPresetId = string.Empty;
    [SerializeField] private string currentImpactVfxId = string.Empty;

    [Header("Practice")]
    [SerializeField] private string practiceStatus = "idle";
    [SerializeField] private int practiceCompletedRounds;
    [SerializeField] private int practiceCurrentStep;
    [SerializeField] private int practiceTargetLength;
    [SerializeField] private float practiceProgressPercent;
    [SerializeField] private string practiceExpectedToken = string.Empty;
    [SerializeField] private string practiceObservedToken = string.Empty;
    [SerializeField] private bool practiceHandDetected;

    [Header("Battle")]
    [SerializeField] private string battleStatus = "ACTIVE";
    [SerializeField] private int battleTurnNumber;
    [SerializeField] private string battleTurnOwnerPlayerId = string.Empty;
    [SerializeField] private int selfHp;
    [SerializeField] private int selfMana;
    [SerializeField] private int opponentHp;
    [SerializeField] private int opponentMana;
    [SerializeField] private string lastActionResult = string.Empty;
    [SerializeField] private string lastActionReason = string.Empty;

    [Header("Result")]
    [SerializeField] private string resultForPlayer = string.Empty;
    [SerializeField] private string winnerPlayerId = string.Empty;
    [SerializeField] private string loserPlayerId = string.Empty;
    [SerializeField] private string endedReason = string.Empty;
    [SerializeField] private int ratingChange;

    public void ApplyEnvelope(string payloadJson)
    {
        if (!RendererPayloadReader.TryReadString(payloadJson, "type", out var eventType))
        {
            return;
        }

        switch (eventType)
        {
            case "renderer.bootstrap":
                ApplyBootstrap(payloadJson);
                break;
            case "practice.skill_selected":
                ApplyPracticeSkill(payloadJson);
                break;
            case "practice.progress_updated":
                ApplyPracticeProgress(payloadJson);
                break;
            case "practice.completed":
                practiceStatus = "complete";
                break;
            case "battle.state_snapshot":
                ApplyBattleSnapshot(payloadJson);
                break;
            case "battle.action_resolved":
                ApplyBattleAction(payloadJson);
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

        currentScene = ReadOrDefault(envelope.payload.scene, currentScene);
        currentAnimsetId = ReadOrDefault(envelope.payload.animsetId, currentAnimsetId);
        currentPlayerId = ReadOrDefault(envelope.payload.playerId, currentPlayerId);
        currentOpponentId = ReadOrDefault(envelope.payload.opponentId, currentOpponentId);
    }

    private void ApplyPracticeSkill(string payloadJson)
    {
        var envelope = JsonUtility.FromJson<PracticeSkillSelectedEnvelopeContract>(payloadJson);
        if (envelope?.payload == null)
        {
            return;
        }

        currentSkillId = ReadOrDefault(envelope.payload.skillId, currentSkillId);
        currentSkillName = ReadOrDefault(envelope.payload.skillName, currentSkillName);
        ApplyPresentation(envelope.payload.presentation);
    }

    private void ApplyPracticeProgress(string payloadJson)
    {
        var envelope = JsonUtility.FromJson<PracticeProgressUpdatedEnvelopeContract>(payloadJson);
        if (envelope?.payload == null)
        {
            return;
        }

        practiceStatus = ReadOrDefault(envelope.payload.status, practiceStatus);
        practiceCompletedRounds = envelope.payload.completedRounds;
        practiceCurrentStep = envelope.payload.currentStep;
        practiceTargetLength = envelope.payload.targetLength;
        practiceProgressPercent = envelope.payload.progressPercent;
        practiceExpectedToken = ReadOrDefault(envelope.payload.expectedToken, practiceExpectedToken);
        practiceObservedToken = ReadOrDefault(envelope.payload.observedToken, practiceObservedToken);
        practiceHandDetected = envelope.payload.handDetected;
    }

    private void ApplyBattleSnapshot(string payloadJson)
    {
        var envelope = JsonUtility.FromJson<BattleStateSnapshotEnvelopeContract>(payloadJson);
        if (envelope?.payload == null)
        {
            return;
        }

        currentSkillId = ReadOrDefault(envelope.payload.selectedSkillId, currentSkillId);
        currentSkillName = ReadOrDefault(envelope.payload.selectedSkillName, currentSkillName);
        battleStatus = ReadOrDefault(envelope.payload.status, battleStatus);
        battleTurnNumber = envelope.payload.turnNumber;
        battleTurnOwnerPlayerId = ReadOrDefault(envelope.payload.turnOwnerPlayerId, battleTurnOwnerPlayerId);
        selfHp = envelope.payload.self != null ? envelope.payload.self.hp : selfHp;
        selfMana = envelope.payload.self != null ? envelope.payload.self.mana : selfMana;
        opponentHp = envelope.payload.opponent != null ? envelope.payload.opponent.hp : opponentHp;
        opponentMana = envelope.payload.opponent != null ? envelope.payload.opponent.mana : opponentMana;
        ApplyPresentation(envelope.payload.presentation);
    }

    private void ApplyBattleAction(string payloadJson)
    {
        var envelope = JsonUtility.FromJson<BattleActionResolvedEnvelopeContract>(payloadJson);
        if (envelope?.payload == null)
        {
            return;
        }

        lastActionResult = ReadOrDefault(envelope.payload.result, lastActionResult);
        lastActionReason = ReadOrDefault(envelope.payload.reason, lastActionReason);
        currentSkillId = ReadOrDefault(envelope.payload.skillId, currentSkillId);
        currentSkillName = ReadOrDefault(envelope.payload.skillName, currentSkillName);
        ApplyPresentation(envelope.payload.presentation);
    }

    private void ApplyBattleEnded(string payloadJson)
    {
        var envelope = JsonUtility.FromJson<BattleEndedEnvelopeContract>(payloadJson);
        if (envelope?.payload == null)
        {
            return;
        }

        resultForPlayer = ReadOrDefault(envelope.payload.resultForPlayer, resultForPlayer);
        winnerPlayerId = ReadOrDefault(envelope.payload.winnerPlayerId, winnerPlayerId);
        loserPlayerId = ReadOrDefault(envelope.payload.loserPlayerId, loserPlayerId);
        endedReason = ReadOrDefault(envelope.payload.endedReason, endedReason);
        ratingChange = envelope.payload.ratingChange;
    }

    private void ApplyPresentation(RendererSkillPresentationContract presentation)
    {
        if (presentation == null)
        {
            return;
        }

        currentTimelineId = ReadOrDefault(presentation.timelineId, currentTimelineId);
        currentClipId = ReadOrDefault(presentation.clipId, currentClipId);
        currentCameraPresetId = ReadOrDefault(presentation.cameraPresetId, currentCameraPresetId);
        currentImpactVfxId = ReadOrDefault(presentation.impactVfxId, currentImpactVfxId);
        currentAnimsetId = ReadOrDefault(presentation.animsetId, currentAnimsetId);
    }

    private static string ReadOrDefault(string value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value;
    }
}
