import { z } from "zod";

export const MAX_PROJECTS_PER_USER = 50;

export const projectInputSchema = z.object({
  name: z.string().trim().min(1, "Projeye bir isim verin.").max(80, "İsim en fazla 80 karakter olabilir."),
  description: z.string().trim().max(500, "Açıklama en fazla 500 karakter olabilir."),
  /** Boş: proje bir profile bağlı değil */
  profileId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

export interface Project {
  id: string;
  name: string;
  description: string;
  profileId: string | null;
  profileName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Proje listesinde gösterilen özet: plan sayısı ve son plan tarihi. */
export interface ProjectSummary extends Project {
  outputCount: number;
  lastOutputAt: string | null;
}

/**
 * Proje içinde üretilen planlar için yapay zekâya giden bağlam girdisi;
 * aynı projedeki planların birbiriyle tutarlı olmasını sağlar.
 */
export function projectContextEntry(project: Pick<Project, "name" | "description">) {
  const description = project.description.trim();
  return {
    question: "Bu plan hangi projenin parçası?",
    answer: description ? `${project.name}: ${description}` : project.name,
  };
}
