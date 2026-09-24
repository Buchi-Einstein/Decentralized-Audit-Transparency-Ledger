# AuditLedger .NET / C# SDK

Official C# SDK for the **Decentralized Audit Transparency Ledger**. Provides full asynchronous APIs, Microsoft.Extensions dependency injection, and out-of-the-box compatibility with Blazor WebAssembly and Unity.

## Features

- **Asynchronous First**: Non-blocking `async/await` patterns with `CancellationToken` support.
- **Dependency Injection**: Seamless integration via `IServiceCollection.AddAuditLedger(...)`.
- **NuGet Ready**: Multi-targets `.NET Standard 2.0`, `.NET Standard 2.1`, `.NET 6.0`, and `.NET 8.0`.
- **Unity Compatible**: Verified for Unity 2020+ (Mono and IL2CPP) and Unity WebGL builds.
- **Blazor Compatible**: Full support for Blazor Server and Blazor WebAssembly (WASM).
- **Cryptographic Verification**: Verifies Merkle roots and on-chain proofs for recorded events.

## Installation

```bash
dotnet add package AuditLedger.SDK
```

## Quick Start

### 1. ASP.NET Core & Dependency Injection

In `Program.cs`:

```csharp
using AuditLedger.SDK.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuditLedger(options =>
{
    options.BaseUrl = "https://ledger.example.com";
    options.ApiKey = builder.Configuration["AuditLedger:ApiKey"];
    options.TimeoutSeconds = 30;
});
```

Inject and use `IAuditLedgerClient`:

```csharp
public class OrderService
{
    private readonly IAuditLedgerClient _ledger;

    public OrderService(IAuditLedgerClient ledger)
    {
        _ledger = ledger;
    }

    public async Task ProcessOrderAsync(string orderId)
    {
        var eventId = await _ledger.LogEventAsync(new AuditEvent
        {
            Topic = "order.processed",
            Payload = $"{{\"orderId\":\"{orderId}\"}}",
            SubmitterAddress = "G..."
        });
    }
}
```

### 2. Blazor WebAssembly

In `Program.cs`:

```csharp
builder.Services.AddAuditLedger(options =>
{
    options.BaseUrl = builder.HostEnvironment.BaseAddress;
});
```

### 3. Unity Integration

Attach client creation to your MonoBehaviour:

```csharp
using AuditLedger.SDK;
using AuditLedger.SDK.Compatibility;
using UnityEngine;

public class LedgerManager : MonoBehaviour
{
    private IAuditLedgerClient _client;

    void Start()
    {
        _client = PlatformCompatibility.CreateUnityClient("https://ledger.example.com");
    }

    public async void RecordAction(string action)
    {
        var id = await _client.LogEventAsync(new AuditEvent
        {
            Topic = "gameplay.action",
            Payload = action
        });
        Debug.Log("Logged audit event: " + id);
    }
}
```
