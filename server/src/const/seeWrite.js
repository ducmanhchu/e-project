export const SW_LESSON_TYPE = "SeeWrite";

export const SW_LIST_PROJECTION = Object.freeze({
  title: 1,
  level: 1,
  topic: 1,
  image: 1,
  imagePublicId: 1,
  createdAt: 1,
});

export const SW_ADMIN_PROJECTION = Object.freeze({
  title: 1,
  level: 1,
  topic: 1,
  image: 1,
  imagePublicId: 1,
  wordPool: 1,
  minWordCount: 1,
  maxWordCount: 1,
  createdAt: 1,
});

export const SW_POPULATE_WORDPOOL = Object.freeze({
  path: "wordPool.id",
  select: "word ipa partOfSpeech definitions audio",
});

export const SW_UPDATABLE_FIELDS = Object.freeze([
  "title",
  "level",
  "topic",
  "description",
  "minWordCount",
  "maxWordCount",
]);
