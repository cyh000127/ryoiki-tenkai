using UnityEngine;

public static class RendererRuntimeBootstrap
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    private static void EnsureBridgeRuntime()
    {
        var bridgeObject = GameObject.Find("CodexBridge");
        if (bridgeObject == null)
        {
            bridgeObject = new GameObject("CodexBridge");
        }

        bridgeObject.name = "CodexBridge";

        var bridge = bridgeObject.GetComponent<CodexBridge>() ?? bridgeObject.AddComponent<CodexBridge>();
        var sceneState = bridgeObject.GetComponent<RendererSceneState>() ?? bridgeObject.AddComponent<RendererSceneState>();
        var timelineRouter = bridgeObject.GetComponent<SkillTimelineRouter>() ?? bridgeObject.AddComponent<SkillTimelineRouter>();
        var vfxPlayer = bridgeObject.GetComponent<ProceduralSkillVfxPlayer>() ?? bridgeObject.AddComponent<ProceduralSkillVfxPlayer>();

        bridge.Initialize(sceneState, timelineRouter);
        timelineRouter.Initialize(vfxPlayer);

        Object.DontDestroyOnLoad(bridgeObject);
    }
}
