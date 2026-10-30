import type { Lesson } from './lesson.schema.js';

export function nextLesson(lessons: Lesson[], completedIds: Iterable<string>): Lesson | undefined {
  const completed = new Set(completedIds);

  return lessons.find((lesson) => !completed.has(lesson.id));
}

export interface LevelProgress {
  level: number;
  completed: number;
  total: number;
}

export function progressByLevel(
  lessons: Lesson[],
  completedIds: Iterable<string>,
): LevelProgress[] {
  const completed = new Set(completedIds);
  const levels = [...new Set(lessons.map((lesson) => lesson.level))].sort((a, b) => a - b);

  return levels.map((level) => {
    const inLevel = lessons.filter((lesson) => lesson.level === level);

    return {
      level,
      completed: inLevel.filter((lesson) => completed.has(lesson.id)).length,
      total: inLevel.length,
    };
  });
}
