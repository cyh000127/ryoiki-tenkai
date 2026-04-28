using UnityEngine;

public sealed class CodexBridge : MonoBehaviour
{
    [SerializeField] private RendererSceneState sceneState;

    [SerializeField] private SkillTimelineRouter timelineRouter;

    [TextArea]
    [SerializeField] private string lastPayload = string.Empty;

    [SerializeField] private string lastEventType = "idle";

    private void Awake()
    {
        ResolveDependencies();
    }

    public void Initialize(RendererSceneState nextSceneState, SkillTimelineRouter nextTimelineRouter)
    {
        sceneState = nextSceneState;
        timelineRouter = nextTimelineRouter;
        ResolveDependencies();
    }

    public void ReceiveEvent(string payloadJson)
    {
        if (string.IsNullOrWhiteSpace(payloadJson))
        {
            return;
        }

        lastPayload = payloadJson;
        if (!RendererPayloadReader.TryReadString(payloadJson, "type", out var eventType))
        {
            lastEventType = "unknown";
            return;
        }

        lastEventType = eventType;
        sceneState?.ApplyEnvelope(payloadJson);
        timelineRouter?.ApplyEnvelope(payloadJson);
    }

    private void ResolveDependencies()
    {
        if (sceneState == null)
        {
            sceneState = GetComponent<RendererSceneState>() ?? FindObjectOfType<RendererSceneState>();
        }

        if (timelineRouter == null)
        {
            timelineRouter = GetComponent<SkillTimelineRouter>() ?? FindObjectOfType<SkillTimelineRouter>();
        }
    }
}
