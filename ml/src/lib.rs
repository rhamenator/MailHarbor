use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Model {
    labels: BTreeMap<String, LabelStats>,
    vocabulary: BTreeSet<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LabelStats {
    examples: u32,
    total_tokens: u32,
    tokens: BTreeMap<String, u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Prediction {
    label: String,
    confidence: f64,
    explanation: String,
    matched_tokens: Vec<String>,
    scores: BTreeMap<String, f64>,
}

#[wasm_bindgen]
pub fn empty_model() -> String {
    serde_json::to_string(&Model::default()).expect("empty model serializes")
}

#[wasm_bindgen]
pub fn learn(text: &str, label: &str, model_json: &str) -> Result<String, JsValue> {
    let mut model = parse_model(model_json)?;
    let tokens = tokenize(text);
    model.vocabulary.extend(tokens.iter().cloned());
    let stats = model.labels.entry(label.trim().to_owned()).or_default();
    stats.examples += 1;
    stats.total_tokens += tokens.len() as u32;
    for token in tokens {
        *stats.tokens.entry(token).or_default() += 1;
    }
    serde_json::to_string(&model).map_err(js_error)
}

#[wasm_bindgen]
pub fn predict(text: &str, model_json: &str) -> Result<String, JsValue> {
    let model = parse_model(model_json)?;
    if model.labels.is_empty() {
        return serde_json::to_string(&Prediction {
            label: "Review".into(),
            confidence: 0.0,
            explanation: "No corrections have been learned yet; a rule supplied this suggestion."
                .into(),
            matched_tokens: Vec::new(),
            scores: BTreeMap::new(),
        })
        .map_err(js_error);
    }
    let tokens = tokenize(text);
    let vocabulary = model.vocabulary.len().max(1) as f64;
    let total_examples = model
        .labels
        .values()
        .map(|stats| stats.examples)
        .sum::<u32>() as f64;
    let mut log_scores = BTreeMap::new();
    for (label, stats) in &model.labels {
        let prior = (stats.examples as f64 + 1.0) / (total_examples + model.labels.len() as f64);
        let denominator = stats.total_tokens as f64 + vocabulary;
        let score = tokens.iter().fold(prior.ln(), |score, token| {
            let count = *stats.tokens.get(token).unwrap_or(&0) as f64;
            score + ((count + 1.0) / denominator).ln()
        });
        log_scores.insert(label.clone(), score);
    }
    let max_score = log_scores
        .values()
        .copied()
        .fold(f64::NEG_INFINITY, f64::max);
    let normalizer: f64 = log_scores
        .values()
        .map(|score| (score - max_score).exp())
        .sum();
    let scores: BTreeMap<String, f64> = log_scores
        .into_iter()
        .map(|(label, score)| (label, (score - max_score).exp() / normalizer))
        .collect();
    let (label, confidence) = scores
        .iter()
        .max_by(|left, right| left.1.total_cmp(right.1))
        .map(|(label, score)| (label.clone(), *score))
        .expect("non-empty label scores");
    let matched_tokens: Vec<String> = tokens
        .iter()
        .filter(|token| {
            model
                .labels
                .get(&label)
                .and_then(|stats| stats.tokens.get(*token))
                .copied()
                .unwrap_or(0)
                > 0
        })
        .take(6)
        .cloned()
        .collect();
    let explanation = if matched_tokens.is_empty() {
        format!("Personal model favored {label} from correction history; no strong token match.")
    } else {
        format!(
            "Personal model favored {label} from learned tokens: {}.",
            matched_tokens.join(", ")
        )
    };
    serde_json::to_string(&Prediction {
        label,
        confidence,
        explanation,
        matched_tokens,
        scores,
    })
    .map_err(js_error)
}

fn parse_model(model_json: &str) -> Result<Model, JsValue> {
    if model_json.trim().is_empty() {
        Ok(Model::default())
    } else {
        serde_json::from_str(model_json).map_err(js_error)
    }
}

fn tokenize(text: &str) -> Vec<String> {
    text.to_lowercase()
        .split(|character: char| !character.is_alphanumeric() && character != '@')
        .filter(|token| token.len() > 2 && !STOP_WORDS.contains(token))
        .map(ToOwned::to_owned)
        .collect()
}

fn js_error(error: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&error.to_string())
}

const STOP_WORDS: &[&str] = &[
    "and", "are", "for", "from", "have", "that", "the", "this", "was", "with", "you", "your",
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn correction_history_personalizes_prediction() {
        let model = learn("invoice receipt payment", "Finance", "").unwrap();
        let model = learn("release notes build deploy", "Engineering", &model).unwrap();
        let prediction: PredictionView =
            serde_json::from_str(&predict("payment receipt", &model).unwrap()).unwrap();
        assert_eq!(prediction.label, "Finance");
        assert!(prediction.confidence > 0.5);
    }

    #[derive(Deserialize)]
    struct PredictionView {
        label: String,
        confidence: f64,
    }
}
