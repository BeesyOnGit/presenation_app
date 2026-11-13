use super::model::{Choice, StepKind, Talk};
use std::{collections::HashSet, fs, path::Path};

/// Reads and validates the talk; the server refuses to start on a bad file.
pub fn load_talk(path: &Path) -> Result<Talk, String> {
    let raw = fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let talk: Talk = serde_json::from_str(&raw).map_err(|e| format!("{}: {e}", path.display()))?;
    validate(&talk)?;
    Ok(talk)
}

fn unique_ids(what: &str, choices: &[Choice]) -> Result<(), String> {
    let mut seen = HashSet::new();
    match choices.iter().find(|c| !seen.insert(&c.id)) {
        Some(c) => Err(format!("{what}: duplicate id `{}`", c.id)),
        None => Ok(()),
    }
}

pub fn validate(talk: &Talk) -> Result<(), String> {
    if talk.steps.is_empty() {
        return Err("talk has no steps".into());
    }
    let mut ids = HashSet::new();
    for step in &talk.steps {
        let at = format!("step `{}`", step.id);
        if !ids.insert(&step.id) {
            return Err(format!("{at}: duplicate step id"));
        }
        if let Some(p) = step.poll() {
            if p.options.len() < 2 {
                return Err(format!("{at}: a poll needs at least 2 options"));
            }
            unique_ids(&at, &p.options)?;
            if let Some(c) = &p.correct_option_id
                && !p.options.iter().any(|o| &o.id == c)
            {
                return Err(format!("{at}: correctOptionId `{c}` is not an option"));
            }
        }
        if let Some(r) = step.round() {
            if !(5..=8).contains(&r.elements.len()) {
                return Err(format!("{at}: a screen needs 5 to 8 elements"));
            }
            unique_ids(&at, &r.elements)?;
            if r.elements.iter().any(|e| e.id == "none") {
                return Err(format!("{at}: `none` is reserved for \"No pattern here\""));
            }
            for id in r.answers.iter().flatten() {
                if !r.elements.iter().any(|e| &e.id == id) {
                    return Err(format!("{at}: answer `{id}` is not an element"));
                }
            }
            if r.answers.iter().any(Vec::is_empty) {
                return Err(format!("{at}: empty answer entry"));
            }
            if r.max_selections == 0 || r.max_selections > r.answers.len().max(1) {
                return Err(format!("{at}: maxSelections must be 1..=number of answers"));
            }
            if r.duration_sec == 0 {
                return Err(format!("{at}: durationSec must be > 0"));
            }
        }
        // Linked polls must be defined earlier in the talk
        let linked = match &step.kind {
            StepKind::Reveal { poll_id } => Some(poll_id),
            StepKind::Compare { before_poll_id, .. } => Some(before_poll_id),
            _ => None,
        };
        if let Some(id) = linked
            && !talk.steps.iter().take_while(|s| s.id != step.id).any(|s| &s.id == id && s.poll().is_some())
        {
            return Err(format!("{at}: `{id}` is not an earlier poll"));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bundled_talk_is_valid() {
        let talk = load_talk(Path::new("content/talk.json")).unwrap();
        assert_eq!(talk.steps.len(), 31);
    }

    #[test]
    fn rejects_unknown_answer() {
        let mut talk = load_talk(Path::new("content/talk.json")).unwrap();
        let step = talk.steps.iter_mut().find(|s| s.id == "round-1").unwrap();
        if let StepKind::GameRound(r) = &mut step.kind {
            r.answers = vec![vec!["nope".into()]];
        }
        assert!(validate(&talk).unwrap_err().contains("nope"));
    }
}
