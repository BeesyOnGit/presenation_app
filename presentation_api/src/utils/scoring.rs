//! Game scoring (spec section 3), pure functions.

use serde::{Deserialize, Serialize};

/// One "Lock in" of a player. `element: None` is "No pattern here".
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lock {
    pub element: Option<String>,
    /// Tap position as a fraction (0–1) of the screen's design size, for the heatmap
    pub x: Option<f64>,
    pub y: Option<f64>,
    /// Seconds between the round start and the lock, measured by the server
    pub elapsed: f64,
}

pub struct RoundRules<'a> {
    /// One entry per pattern to find; any id in an entry counts for it. Empty = clean screen.
    pub answers: &'a [Vec<String>],
    pub scored: bool,
    pub duration_sec: f64,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct RoundScore {
    pub points: i64,
    /// Found every pattern (or rightly said "No pattern here")
    pub correct: bool,
    /// Seconds counted for the leaderboard tie-break (0 when nothing was right)
    pub correct_time: f64,
}

/// +0 to +50, linear: 50 at 0 s, 0 at the end of the round.
pub fn speed_bonus(elapsed: f64, duration: f64) -> i64 {
    (50.0 * (1.0 - elapsed.max(0.0) / duration).max(0.0)).round() as i64
}

/// A round's points from a player's locks, in the order they were locked.
pub fn score_round(rules: &RoundRules, locks: &[Lock]) -> RoundScore {
    let Some(last) = locks.last() else {
        return RoundScore::default();
    };
    if !rules.scored {
        return RoundScore::default();
    }
    let bonus = speed_bonus(last.elapsed, rules.duration_sec);

    if rules.answers.is_empty() {
        return match locks[0].element {
            None => RoundScore {
                points: 100 + bonus,
                correct: true,
                correct_time: last.elapsed,
            },
            Some(_) => RoundScore {
                points: -50,
                ..Default::default()
            },
        };
    }

    let mut found = vec![false; rules.answers.len()];
    let mut points = 0;
    for lock in locks {
        let target = lock
            .element
            .as_deref()
            .and_then(|e| rules.answers.iter().position(|ids| ids.iter().any(|id| id == e)));
        match target {
            Some(i) if !found[i] => {
                found[i] = true;
                points += 100;
            }
            // A second element for a pattern already found: no gain, no loss
            Some(_) => {}
            None => points -= 50,
        }
    }
    let hits = found.iter().filter(|f| **f).count();
    // Bonus round: one speed bonus, from the last lock
    if hits > 0 {
        points += bonus;
    }
    RoundScore {
        points,
        correct: hits == rules.answers.len(),
        correct_time: if hits > 0 { last.elapsed } else { 0.0 },
    }
}

/// A total never goes below 0.
pub fn add_points(total: i64, points: i64) -> i64 {
    (total + points).max(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lock(element: Option<&str>, elapsed: f64) -> Lock {
        Lock {
            element: element.map(String::from),
            x: None,
            y: None,
            elapsed,
        }
    }
    fn answers(groups: &[&[&str]]) -> Vec<Vec<String>> {
        groups
            .iter()
            .map(|g| g.iter().map(|s| s.to_string()).collect())
            .collect()
    }
    fn points(answers: &[Vec<String>], scored: bool, locks: &[Lock]) -> i64 {
        let rules = RoundRules {
            answers,
            scored,
            duration_sec: 30.0,
        };
        score_round(&rules, locks).points
    }

    #[test]
    fn scoring_table() {
        let one = answers(&[&["banner"]]);
        let clean = answers(&[]);
        let bonus = answers(&[&["step", "link"], &["checkbox"]]);

        // Correct element + linear speed bonus
        assert_eq!(points(&one, true, &[lock(Some("banner"), 0.0)]), 150);
        assert_eq!(points(&one, true, &[lock(Some("banner"), 15.0)]), 125);
        assert_eq!(points(&one, true, &[lock(Some("banner"), 30.0)]), 100);
        assert_eq!(points(&one, true, &[lock(Some("banner"), 30.4)]), 100);
        // "No pattern here" on a clean screen
        assert_eq!(points(&clean, true, &[lock(None, 0.0)]), 150);
        assert_eq!(points(&clean, true, &[lock(None, 6.0)]), 140);
        // Wrong element / "No pattern" on a pattern / any element on a clean screen
        assert_eq!(points(&one, true, &[lock(Some("price"), 1.0)]), -50);
        assert_eq!(points(&one, true, &[lock(None, 1.0)]), -50);
        assert_eq!(points(&clean, true, &[lock(Some("price"), 1.0)]), -50);
        // No answer
        assert_eq!(points(&one, true, &[]), 0);
        // Debate round
        assert_eq!(points(&clean, false, &[lock(None, 0.0)]), 0);
        // Bonus round: +100 per pattern, one bonus from the second lock
        assert_eq!(points(&bonus, true, &[lock(Some("step"), 3.0), lock(Some("checkbox"), 15.0)]), 225);
        assert_eq!(points(&bonus, true, &[lock(Some("link"), 3.0), lock(Some("checkbox"), 30.0)]), 200);
        assert_eq!(points(&bonus, true, &[lock(Some("step"), 3.0), lock(Some("link"), 15.0)]), 125);
        assert_eq!(points(&bonus, true, &[lock(Some("step"), 3.0), lock(Some("keep"), 15.0)]), 75);
        assert!(score_round(
            &RoundRules { answers: &bonus, scored: true, duration_sec: 30.0 },
            &[lock(Some("link"), 1.0), lock(Some("checkbox"), 2.0)]
        )
        .correct);
        // Total floors at 0
        assert_eq!(add_points(20, -50), 0);
        assert_eq!(add_points(120, -50), 70);
    }
}
