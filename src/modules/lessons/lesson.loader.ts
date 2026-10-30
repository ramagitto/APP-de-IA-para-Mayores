import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { type Lesson, lessonSchema } from './lesson.schema.js';

export interface LessonSource {
  fileName: string;
  content: string;
}

export interface LessonValidation {
  lessons: Lesson[];
  errors: string[];
}

// Junta todos los errores de una vez, para que quien edita no tenga que corregirlos de a uno.
export function validateLessons(sources: LessonSource[]): LessonValidation {
  const errors: string[] = [];
  const lessons: Lesson[] = [];

  for (const { fileName, content } of sources) {
    const lesson = parseLesson(fileName, content, errors);
    if (lesson) lessons.push(lesson);
  }

  checkCollection(lessons, errors);

  return { lessons: sortLessons(lessons), errors };
}

function parseLesson(fileName: string, content: string, errors: string[]): Lesson | undefined {
  let data: unknown;

  try {
    data = parse(content);
  } catch (error) {
    errors.push(`${fileName}: el YAML está mal escrito (${(error as Error).message})`);
    return undefined;
  }

  const result = lessonSchema.safeParse(data);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${fileName}: ${issue.path.join('.') || '(archivo)'}: ${issue.message}`);
    }
    return undefined;
  }

  if (fileName !== `${result.data.id}.yaml`) {
    errors.push(`${fileName}: el archivo tiene que llamarse ${result.data.id}.yaml`);
  }

  return result.data;
}

function checkCollection(lessons: Lesson[], errors: string[]): void {
  const positions = new Map<string, string>();

  for (const lesson of lessons) {
    const position = `nivel ${lesson.level}, orden ${lesson.order}`;
    const repeated = positions.get(position);

    if (repeated) errors.push(`${lesson.id}: repite la posición de ${repeated} (${position})`);
    positions.set(position, lesson.id);
  }

  for (const level of new Set(lessons.map((lesson) => lesson.level))) {
    const hasAntiscam = lessons.some(
      (lesson) => lesson.level === level && lesson.kind === 'antiscam',
    );

    if (!hasAntiscam) errors.push(`Nivel ${level}: falta al menos una lección antiestafa`);
  }
}

export function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => a.level - b.level || a.order - b.order);
}

export function readLessonSources(directory: string): LessonSource[] {
  return readdirSync(directory)
    .filter((fileName) => fileName.endsWith('.yaml'))
    .map((fileName) => ({
      fileName,
      content: readFileSync(join(directory, fileName), 'utf8'),
    }));
}

export function loadLessons(directory: string): Lesson[] {
  const { lessons, errors } = validateLessons(readLessonSources(directory));

  if (errors.length > 0) throw new Error(`Hay lecciones inválidas:\n${errors.join('\n')}`);

  return lessons;
}
