use std::collections::{BTreeMap, HashMap, HashSet};

/// Metadata attached to a contract event that is searchable.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct EventMetadata {
    pub name: String,
    pub contract: String,
    pub description: String,
    pub tags: Vec<String>,
}

impl EventMetadata {
    /// Collect the searchable text fields for this event.
    fn searchable_fields(&self) -> Vec<&str> {
        let mut fields = vec![self.name.as_str(), self.contract.as_str(), self.description.as_str()];
        for tag in &self.tags {
            fields.push(tag.as_str());
        }
        fields
    }
}

/// A single search hit with its relevance score and highlighted fields.
#[derive(Debug, Clone, PartialEq)]
pub struct SearchHit {
    pub event_id: String,
    pub score: f64,
    pub highlights: Vec<String>,
}

/// Full-text search index over contract event metadata.
///
/// Maintains an inverted index from stemmed terms to the events that contain
/// them, supporting full-text queries, fuzzy matching, ranking and highlighting.
#[derive(Debug, Default)]
pub struct EventSearchIndex {
    /// stemmed term -> event id -> term frequency
    inverted: HashMap<String, HashMap<String, usize>>,
    /// event id -> original metadata
    metadata: HashMap<String, EventMetadata>,
}

impl EventSearchIndex {
    pub fn new() -> Self {
        Self::default()
    }

    /// Index (or re-index) an event's metadata.
    pub fn index_event(&mut self, event_id: impl Into<String>, metadata: EventMetadata) {
        let event_id = event_id.into();
        self.remove_event(&event_id);

        let mut term_freqs: HashMap<String, usize> = HashMap::new();
        for field in metadata.searchable_fields() {
            for token in tokenize(field) {
                let stem = stem(&token);
                if stem.is_empty() {
                    continue;
                }
                *term_freqs.entry(stem).or_insert(0) += 1;
            }
        }

        for (term, freq) in term_freqs {
            self.inverted
                .entry(term)
                .or_default()
                .insert(event_id.clone(), freq);
        }
        self.metadata.insert(event_id, metadata);
    }

    /// Remove an event from the index.
    pub fn remove_event(&mut self, event_id: &str) {
        if self.metadata.remove(event_id).is_none() {
            return;
        }
        for postings in self.inverted.values_mut() {
            postings.remove(event_id);
        }
        self.inverted.retain(|_, postings| !postings.is_empty());
    }

    /// Full-text search with fuzzy matching, ranking and highlighting.
    pub fn search(&self, query: &str) -> Vec<SearchHit> {
        let query_terms: Vec<String> = tokenize(query)
            .into_iter()
            .map(|t| stem(&t))
            .filter(|t| !t.is_empty())
            .collect();

        if query_terms.is_empty() {
            return Vec::new();
        }

        let mut scores: HashMap<String, f64> = HashMap::new();
        for term in &query_terms {
            // Exact term matches rank highest.
            if let Some(postings) = self.inverted.get(term) {
                for (event_id, freq) in postings {
                    *scores.entry(event_id.clone()).or_insert(0.0) += *freq as f64;
                }
            }
            // Fuzzy matches contribute a discounted score.
            for (indexed_term, postings) in &self.inverted {
                if indexed_term == term {
                    continue;
                }
                if let Some(distance) = fuzzy_distance(term, indexed_term) {
                    let weight = 1.0 / (1.0 + distance as f64);
                    for (event_id, freq) in postings {
                        *scores.entry(event_id.clone()).or_insert(0.0) += *freq as f64 * weight;
                    }
                }
            }
        }

        let mut hits: Vec<SearchHit> = scores
            .into_iter()
            .map(|(event_id, score)| {
                let highlights = self
                    .metadata
                    .get(&event_id)
                    .map(|m| highlight(m, &query_terms))
                    .unwrap_or_default();
                SearchHit { event_id, score, highlights }
            })
            .collect();

        hits.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| a.event_id.cmp(&b.event_id))
        });
        hits
    }
}

/// Split text into lowercase alphanumeric tokens.
fn tokenize(text: &str) -> Vec<String> {
    text.split(|c: char| !c.is_alphanumeric())
        .filter(|t| !t.is_empty())
        .map(|t| t.to_lowercase())
        .collect()
}

/// Lightweight English stemmer applied to both indexed and query terms.
fn stem(term: &str) -> String {
    let term = term.to_lowercase();
    for suffix in ["ingly", "edly", "ing", "ies", "ied", "es", "ed", "s"] {
        if term.len() > suffix.len() + 2 && term.ends_with(suffix) {
            let base = &term[..term.len() - suffix.len()];
            return match suffix {
                "ies" | "ied" => format!("{}y", base),
                _ => base.to_string(),
            };
        }
    }
    term
}

/// Bounded Levenshtein distance used for fuzzy matching.
/// Returns `None` when the terms are further apart than the allowed threshold.
fn fuzzy_distance(a: &str, b: &str) -> Option<usize> {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let max_len = a.len().max(b.len());
    let threshold = if max_len <= 4 { 1 } else { 2 };

    if a.len().abs_diff(b.len()) > threshold {
        return None;
    }

    let mut prev: Vec<usize> = (0..=b.len()).collect();
    let mut curr = vec![0usize; b.len() + 1];
    for (i, ca) in a.iter().enumerate() {
        curr[0] = i + 1;
        for (j, cb) in b.iter().enumerate() {
            let cost = if ca == cb { 0 } else { 1 };
            curr[j + 1] = (prev[j + 1] + 1).min(curr[j] + 1).min(prev[j] + cost);
        }
        std::mem::swap(&mut prev, &mut curr);
    }

    let distance = prev[b.len()];
    if distance <= threshold {
        Some(distance)
    } else {
        None
    }
}

/// Produce highlighted snippets for the fields that matched the query terms.
fn highlight(metadata: &EventMetadata, query_terms: &[String]) -> Vec<String> {
    let terms: HashSet<&str> = query_terms.iter().map(|t| t.as_str()).collect();
    let mut highlights = Vec::new();
    for field in metadata.searchable_fields() {
        let mut matched = false;
        let mut rendered = String::new();
        for token in field.split_whitespace() {
            if !rendered.is_empty() {
                rendered.push(' ');
            }
            let stemmed = stem(&token.to_lowercase());
            if terms.contains(stemmed.as_str()) {
                matched = true;
                rendered.push_str("<em>");
                rendered.push_str(token);
                rendered.push_str("</em>");
            } else {
                rendered.push_str(token);
            }
        }
        if matched {
            highlights.push(rendered);
        }
    }
    highlights
}

/// Convenience wrapper exposing a ranked map of event id -> score.
pub fn search_events(index: &EventSearchIndex, query: &str) -> BTreeMap<String, f64> {
    index
        .search(query)
        .into_iter()
        .map(|hit| (hit.event_id, hit.score))
        .collect()
}
