# AuditLedger Java/Kotlin SDK

A Java/Kotlin client library for interacting with the AuditLedger REST API with support for blocking, reactive, and coroutines-based APIs.

## Installation

### Maven

Add this to your `pom.xml`:

```xml
<dependency>
    <groupId>org.auditledger</groupId>
    <artifactId>audit-ledger-sdk</artifactId>
    <version>0.1.0</version>
</dependency>
```

### Gradle

Add this to your `build.gradle`:

```groovy
dependencies {
    implementation 'org.auditledger:audit-ledger-sdk:0.1.0'
}
```

Or for Gradle Kotlin DSL:

```kotlin
dependencies {
    implementation("org.auditledger:audit-ledger-sdk:0.1.0")
}
```

## Usage

### Java Blocking API

```java
import org.auditledger.sdk.AuditLedgerClient;

public class Example {
    public static void main(String[] args) {
        // Create a new client
        try (AuditLedgerClient client = new AuditLedgerClient("http://localhost:3002/v1")) {
            // Check health
            AuditLedgerClient.HealthStatus health = client.getHealth();
            System.out.println("Health status: " + health.getStatus());
            
            // Get statistics
            AuditLedgerClient.Statistics stats = client.getStatistics();
            System.out.println("Total events: " + stats.getTotalEvents());
            
            // List events
            AuditLedgerClient.EventListResponse events = client.listEvents(10, 0, null);
            System.out.println("Found " + events.getData().size() + " events");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### Kotlin Coroutines API

```kotlin
import org.auditedger.sdk.kotlin.AuditLedgerClientKotlin
import org.auditedger.sdk.kotlin.AuditLedgerClientKotlinFactory.create
import kotlinx.coroutines.runBlocking

fun main() = runBlocking {
    // Create a new client
    val client = create("http://localhost:3002/v1")
    
    // Check health
    val health = client.getHealth()
    println("Health status: ${health.status}")
    
    // Get statistics
    val stats = client.getStatistics()
    println("Total events: ${stats.totalEvents}")
    
    // List events
    val events = client.listEvents(10, 0)
    println("Found ${events.data.size} events")
    
    client.close()
}
```

### Kotlin Reactive API (Project Reactor)

```kotlin
import org.auditedger.sdk.kotlin.AuditLedgerClientKotlin
import org.auditedger.sdk.kotlin.AuditLedgerClientKotlinFactory.create
import reactor.core.publisher.subscribe

fun main() {
    // Create a new client
    val client = create("http://localhost:3002/v1")
    
    // Check health
    client.getHealthMono()
        .subscribe { health ->
            println("Health status: ${health.status}")
        }
    
    // Get statistics
    client.getStatisticsMono()
        .subscribe { stats ->
            println("Total events: ${stats.totalEvents}")
        }
    
    // In a real application, you would subscribe to multiple observables
    // and properly dispose of them
}
```

### Java Reactive API (Project Reactor)

```java
import org.auditleger.sdk.AuditLedgerClient.ReactiveAuditLedgerClient;
import reactor.core.publisher.Mono;

public class ReactiveExample {
    public static void main(String[] args) {
        // Create a new client
        AuditLedgerClient client = new AuditLedgerClient("http://localhost:3002/v1");
        ReactiveAuditLedgerClient reactiveClient = new ReactiveAuditLedgerClient(client);
        
        // Check health
        Mono<AuditLedgerClient.HealthStatus> healthMono = reactiveClient.getHealth();
        healthMono.subscribe(health -> {
            System.out.println("Health status: " + health.getStatus());
        });
        
        // Get statistics
        Mono<AuditLedgerClient.Statistics> statsMono = reactiveClient.getStatistics();
        statsMono.subscribe(stats -> {
            System.out.println("Total events: " + stats.getTotalEvents());
        });
        
        // In a real application, you would properly dispose of the disposables
    }
}
```

## Features

- **Blocking API**: Traditional synchronous Java API
- **Reactive API**: Non-blocking API using Project Reactor
- **Coroutines API**: Idiomatic Kotlin API using Kotlin coroutines
- **Full API coverage**: All AuditLedger REST API endpoints
- **Automatic JSON serialization/deserialization**: Using Jackson
- **Configurable HTTP client**: Customizable timeouts, headers, etc.
- **Android compatible**: Works with Android API level 21+
- **Zero dependencies beyond standard libraries**: Only uses well-known, lightweight libraries

## API Coverage

- Health checks (`/healthz`, `/readyz`)
- Metrics (`/metrics`)
- Cache management (`/cache/stats`, `/cache/invalidate`)
- Events (`/events`, `/events/search`, `/events/{index}`, `/events/type/{type}`)
- Exports (`/export/events.json`, `/export/events.csv`, `/export/events/stream`, `/export/progress`)
- Statistics (`/stats`)

## Running Tests

### Maven

```bash
mvn test
```

### Gradle

```bash
./gradlew test
```

## License

MIT