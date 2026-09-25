use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};

/// A single event in the system.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Event {
    pub id: String,
    pub kind: String,
    pub payload: String,
    /// Groups events that belong to the same logical flow/transaction.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub correlation_id: Option<String>,
    /// The id of the event that directly caused this event.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub causation_id: Option<String>,
}

impl Event {
    pub fn new(id: impl Into<String>, kind: impl Into<String>, payload: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            kind: kind.into(),
            payload: payload.into(),
            correlation_id: None,
            causation_id: None,
        }
    }

    /// Attach a correlation id, grouping this event with related events.
    pub fn with_correlation_id(mut self, correlation_id: impl Into<String>) -> Self {
        self.correlation_id = Some(correlation_id.into());
        self
    }

    /// Attach a causation id, recording the event that caused this one.
    pub fn with_causation_id(mut self, causation_id: impl Into<String>) -> Self {
        self.causation_id = Some(causation_id.into());
        self
    }
}

/// In-memory store supporting correlation/causation queries and graph building.
#[derive(Debug, Default, Clone)]
pub struct EventStore {
    events: Vec<Event>,
}

impl EventStore {
    pub fn new() -> Self {
        Self { events: Vec::new() }
    }

    pub fn append(&mut self, event: Event) {
        self.events.push(event);
    }

    pub fn all(&self) -> &[Event] {
        &self.events
    }

    /// Retrieve every event sharing the given correlation id.
    pub fn by_correlation_id(&self, correlation_id: &str) -> Vec<&Event> {
        self.events
            .iter()
            .filter(|e| e.correlation_id.as_deref() == Some(correlation_id))
            .collect()
    }

    /// Retrieve every event directly caused by the given event id.
    pub fn by_causation_id(&self, causation_id: &str) -> Vec<&Event> {
        self.events
            .iter()
            .filter(|e| e.causation_id.as_deref() == Some(causation_id))
            .collect()
    }

    /// Build the full cause-effect graph reachable from a root event id.
    pub fn causation_graph(&self, root_id: &str) -> CausationGraph {
        let mut graph = CausationGraph::default();
        let mut visited: HashSet<&str> = HashSet::new();
        let mut queue: VecDeque<&str> = VecDeque::new();

        if let Some(root) = self.events.iter().find(|e| e.id == root_id) {
            graph.nodes.push(root.id.clone());
            visited.insert(root.id.as_str());
            queue.push_back(root.id.as_str());
        }

        while let Some(current) = queue.pop_front() {
            for child in self.by_causation_id(current) {
                graph.edges.push((current.to_string(), child.id.clone()));
                if visited.insert(child.id.as_str()) {
                    graph.nodes.push(child.id.clone());
                    queue.push_back(child.id.as_str());
                }
            }
        }

        graph
    }

    /// Build a graph of all events sharing a correlation id.
    pub fn correlation_graph(&self, correlation_id: &str) -> CausationGraph {
        let mut graph = CausationGraph::default();
        let members = self.by_correlation_id(correlation_id);
        let ids: HashSet<&str> = members.iter().map(|e| e.id.as_str()).collect();

        for event in &members {
            graph.nodes.push(event.id.clone());
            if let Some(cause) = event.causation_id.as_deref() {
                if ids.contains(cause) {
                    graph.edges.push((cause.to_string(), event.id.clone()));
                }
            }
        }

        graph
    }
}

/// A directed graph of events linked by causation relationships.
#[derive(Debug, Default, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CausationGraph {
    pub nodes: Vec<String>,
    pub edges: Vec<(String, String)>,
}

impl CausationGraph {
    /// Render the graph as a simple adjacency map for visualization.
    pub fn adjacency(&self) -> HashMap<String, Vec<String>> {
        let mut map: HashMap<String, Vec<String>> = HashMap::new();
        for node in &self.nodes {
            map.entry(node.clone()).or_default();
        }
        for (from, to) in &self.edges {
            map.entry(from.clone()).or_default().push(to.clone());
        }
        map
    }

    /// Emit a DOT representation suitable for graph visualization tooling.
    pub fn to_dot(&self) -> String {
        let mut out = String::from("digraph causation {\n");
        for node in &self.nodes {
            out.push_str(&format!("  \"{}\";\n", node));
        }
        for (from, to) in &self.edges {
            out.push_str(&format!("  \"{}\" -> \"{}\";\n", from, to));
        }
        out.push_str("}\n");
        out
    }
}

/// Alert raised when a correlation chain exceeds an expected depth.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CorrelationAlert {
    pub correlation_id: String,
    pub depth: usize,
    pub threshold: usize,
}

/// Evaluate a correlation chain and raise an alert if it is too deep.
pub fn check_correlation_depth(
    store: &EventStore,
    correlation_id: &str,
    threshold: usize,
) -> Option<CorrelationAlert> {
    let depth = store.by_correlation_id(correlation_id).len();
    if depth > threshold {
        Some(CorrelationAlert {
            correlation_id: correlation_id.to_string(),
            depth,
            threshold,
        })
    } else {
        None
    }
}
