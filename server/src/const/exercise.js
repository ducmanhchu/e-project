// Score threshold to mark a sentence/essay as completed
export const COMPLETION_THRESHOLD = 70;

// IELTS band threshold to mark exam as completed (band >= 6.0 = "competent user")
export const COMPLETION_BAND = 6.0;

// IELTS minimum word count per exam type
export const EXAM_MIN_WORDS = {
  ielts_task1: 150,
  ielts_task2: 250,
};

// Band ↔ Score conversion (IELTS band 1-9 → score 0-100)
export const bandToScore = (band) => Math.round(band * 10);
export const scoreToBand = (score) => score / 10;

// Round band to nearest 0.5 (IELTS standard)
export const roundBand = (band) => Math.round(band * 2) / 2;
