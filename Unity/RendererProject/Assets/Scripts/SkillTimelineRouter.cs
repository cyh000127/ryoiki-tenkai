using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable]
public sealed class SkillTimelineBinding
{
    public string skillId = string.Empty;
    public string timelineId = string.Empty;
    public string playableKey = string.Empty;
}

public sealed class SkillTimelineRouter : MonoBehaviour
{
    [SerializeField] private List<SkillTimelineBinding> bindings = new();

    [SerializeField] private ProceduralSkillVfxPlayer vfxPlayer;

    [SerializeField] private string currentEventType = "idle";

    [SerializeField] private string currentSkillId = string.Empty;

    [SerializeField] private string currentTimelineId = string.Empty;

    [SerializeField] private string currentPlayableKey = string.Empty;

    private void Awake()
    {
        EnsureDefaultBindings();
        if (vfxPlayer == null)
        {
            vfxPlayer = GetComponent<ProceduralSkillVfxPlayer>() ?? FindObjectOfType<ProceduralSkillVfxPlayer>();
        }
    }

    public void Initialize(ProceduralSkillVfxPlayer nextVfxPlayer)
    {
        vfxPlayer = nextVfxPlayer;
        EnsureDefaultBindings();
    }

    public void ApplyEnvelope(string payloadJson)
    {
        if (!RendererPayloadReader.TryReadString(payloadJson, "type", out var eventType))
        {
            return;
        }

        currentEventType = eventType;

        if (RendererPayloadReader.TryReadString(payloadJson, "skillId", out var skillId))
        {
            currentSkillId = skillId;
        }

        if (RendererPayloadReader.TryReadString(payloadJson, "timelineId", out var timelineId))
        {
            currentTimelineId = timelineId;
        }

        if (!string.IsNullOrWhiteSpace(currentSkillId))
        {
            SelectTimeline(currentSkillId, currentTimelineId);
        }

        vfxPlayer?.ApplyEnvelope(payloadJson, currentSkillId, currentTimelineId, currentEventType);
    }

    public void SelectTimeline(string skillId, string fallbackTimelineId)
    {
        var binding = bindings.Find((entry) => entry.skillId == skillId);
        currentSkillId = skillId;
        currentTimelineId = binding != null && !string.IsNullOrWhiteSpace(binding.timelineId)
            ? binding.timelineId
            : fallbackTimelineId;
        currentPlayableKey = binding != null && !string.IsNullOrWhiteSpace(binding.playableKey)
            ? binding.playableKey
            : "procedural.fallback";
    }

    private void EnsureDefaultBindings()
    {
        UpsertBinding("jjk_gojo_red", "timeline.gojo.red", "procedural.gojo.red");
        UpsertBinding("jjk_gojo_hollow_purple", "timeline.gojo.hollow_purple", "procedural.gojo.hollow_purple");
        UpsertBinding("jjk_gojo_infinite_void", "timeline.gojo.infinite_void", "procedural.gojo.infinite_void");
    }

    private void UpsertBinding(string skillId, string timelineId, string playableKey)
    {
        var binding = bindings.Find((entry) => entry.skillId == skillId);
        if (binding != null)
        {
            if (string.IsNullOrWhiteSpace(binding.timelineId))
            {
                binding.timelineId = timelineId;
            }

            if (string.IsNullOrWhiteSpace(binding.playableKey))
            {
                binding.playableKey = playableKey;
            }

            return;
        }

        bindings.Add(new SkillTimelineBinding
        {
            skillId = skillId,
            timelineId = timelineId,
            playableKey = playableKey
        });
    }
}
