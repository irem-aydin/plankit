import { describe, expect, it } from "vitest";
import { projectContextEntry, projectInputSchema } from "@/core/project/project";

describe("projectContextEntry", () => {
  it("proje adını ve açıklamasını yapay zekâ bağlamına çevirir", () => {
    expect(projectContextEntry({ name: "Yeni şube", description: "  İzmir'de 2. şube, 6 ay içinde  " })).toEqual({
      question: "Bu plan hangi projenin parçası?",
      answer: "Yeni şube: İzmir'de 2. şube, 6 ay içinde",
    });
  });

  it("açıklama yoksa yalnızca proje adı gider", () => {
    expect(projectContextEntry({ name: "Bütçe 2027", description: "" }).answer).toBe("Bütçe 2027");
  });
});

describe("projectInputSchema", () => {
  it("boş profil seçimi null olur", () => {
    const parsed = projectInputSchema.parse({ name: " Proje ", description: "", profileId: "" });
    expect(parsed).toEqual({ name: "Proje", description: "", profileId: null });
  });

  it("geçersiz profil kimliğini reddeder", () => {
    expect(projectInputSchema.safeParse({ name: "Proje", description: "", profileId: "x' or 1=1" }).success).toBe(false);
  });
});
