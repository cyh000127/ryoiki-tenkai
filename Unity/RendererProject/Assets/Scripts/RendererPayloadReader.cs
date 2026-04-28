using System;

public static class RendererPayloadReader
{
    public static bool TryReadString(string json, string key, out string value)
    {
        value = string.Empty;
        if (string.IsNullOrWhiteSpace(json))
        {
            return false;
        }

        var token = $"\"{key}\"";
        var keyIndex = json.IndexOf(token, StringComparison.Ordinal);
        if (keyIndex < 0)
        {
            return false;
        }

        var colonIndex = json.IndexOf(':', keyIndex + token.Length);
        if (colonIndex < 0)
        {
            return false;
        }

        var firstQuoteIndex = json.IndexOf('"', colonIndex + 1);
        if (firstQuoteIndex < 0)
        {
            return false;
        }

        var secondQuoteIndex = json.IndexOf('"', firstQuoteIndex + 1);
        if (secondQuoteIndex < 0)
        {
            return false;
        }

        value = json.Substring(firstQuoteIndex + 1, secondQuoteIndex - firstQuoteIndex - 1);
        return true;
    }
}
