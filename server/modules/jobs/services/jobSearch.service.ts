/**
 * Job Search Service
 * ----------------------------------------------------------------------
 * The heaviest read path lives here so its query optimization
 * (indexes, sort columns, pagination, edition bias) doesn't bloat the
 * CRUD service.
 *
 * Phase 0.5: same scope guard as the other services — null scope only
 * until Phase 1 lands the tenantId column. Tenant-aware search filters
 * (e.g. "only this tenant's branded board" vs "techscoop.io legacy")
 * fold in at that point.
 */

import * as jobsRepo from "../repositories/jobs.repository";
import { assertTenantSupported } from "../tenant.guard";
import { PublicListInput, RequesterContext, TenantScope, UnauthorizedError } from "../types";

const EDIT_ROLES = new Set(["admin", "editor", "senior_editor"]);

// ------------------------------------------------------------
// Title suggestions — used by the editor's autocomplete + the search
// page's quick-pick list. Blends DB-distinct hits with a curated list
// of common tech roles so an empty DB still produces useful results.
// ------------------------------------------------------------

const COMMON_TITLES = [
  "Software Engineer", "Senior Software Engineer", "Staff Software Engineer",
  "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "DevOps Engineer", "Data Engineer", "Data Scientist", "Data Analyst",
  "Machine Learning Engineer", "AI Engineer", "Cloud Engineer",
  "Product Manager", "Senior Product Manager", "Product Designer",
  "UI/UX Designer", "UX Researcher", "Graphic Designer",
  "Marketing Manager", "Digital Marketing Specialist", "Content Manager",
  "Sales Manager", "Business Development Manager", "Account Manager",
  "Project Manager", "Program Manager", "Scrum Master",
  "QA Engineer", "Test Engineer", "Automation Engineer",
  "Mobile Developer", "iOS Developer", "Android Developer",
  "CTO", "VP of Engineering", "Engineering Manager",
  "Head of Product", "Head of Design", "Head of Marketing",
  "Financial Analyst", "Operations Manager", "HR Manager",
  "Customer Success Manager", "Technical Support Engineer",
  "Solutions Architect", "Security Engineer", "Cybersecurity Analyst",
  "Blockchain Developer", "Web3 Developer",
];

const COMMON_SKILLS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
  "React", "Vue.js", "Angular", "Next.js", "Node.js", "Express", "Django", "Flask", "Spring Boot",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
  "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "Data Science", "AI",
  "Product Management", "Agile", "Scrum", "Project Management", "JIRA",
  "Figma", "Adobe XD", "UI/UX Design", "Sketch",
  "Sales", "Marketing", "SEO", "Content Writing", "Social Media",
  "Financial Analysis", "Accounting", "Excel", "Power BI", "Tableau",
  "Blockchain", "Web3", "Solidity", "Smart Contracts",
  "iOS", "Android", "React Native", "Flutter",
  "DevOps", "Linux", "Networking", "Cybersecurity",
  "GraphQL", "REST API", "Microservices", "System Design",
  "Arabic", "English", "Communication", "Leadership", "Team Management",
];

export class JobSearchService {
  async listPublic(scope: TenantScope, input: PublicListInput) {
    assertTenantSupported(scope);

    const { page, limit, ...rest } = input;
    const offset = (page - 1) * limit;

    const results = await jobsRepo.listPublic(
      {
        search: rest.search,
        status: rest.status,
        roleType: rest.roleType,
        seniority: rest.seniority,
        isRemote: rest.isRemote,
        location: rest.location,
        countryId: rest.countryId,
        cityId: rest.cityId,
        department: rest.department,
        companyId: rest.companyId,
        salaryMin: rest.salaryMin,
        salaryMax: rest.salaryMax,
        datePosted: rest.datePosted,
        editionCountryId: rest.editionCountryId,
        sortBy: rest.sortBy,
        sortOrder: rest.sortOrder,
      },
      scope,
    );

    const total = results.length;
    const items = results.slice(offset, offset + limit);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listAdmin(scope: TenantScope, input: PublicListInput, requester: RequesterContext) {
    assertTenantSupported(scope);
    if (!EDIT_ROLES.has(requester.role)) throw new UnauthorizedError("Unauthorized");

    const { page, limit, ...rest } = input;
    const offset = (page - 1) * limit;

    const { items, total } = await jobsRepo.listAdmin(
      {
        search: rest.search,
        status: rest.status,
        employmentType: rest.employmentType,
        roleType: rest.roleType,
        seniority: rest.seniority,
        isRemote: rest.isRemote,
        sortBy: rest.sortBy,
        sortOrder: rest.sortOrder,
      },
      limit,
      offset,
      scope,
    );

    return {
      items: items.map((item) => ({ ...item, status: item.statusSlug || "draft" })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async exportList(
    scope: TenantScope,
    input: PublicListInput & { limit: number },
    requester: RequesterContext,
  ) {
    assertTenantSupported(scope);
    if (!EDIT_ROLES.has(requester.role)) throw new UnauthorizedError("Unauthorized");

    const results = await jobsRepo.exportAll(
      {
        search: input.search,
        status: input.status,
        employmentType: input.employmentType,
        roleType: input.roleType,
        seniority: input.seniority,
        isRemote: input.isRemote,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
      },
      10000,
      scope,
    );

    return {
      items: results.map((job: any) => ({
        ...job,
        company: { name: job.companyName },
        employmentType: job.roleType,
        experienceLevel: job.seniority,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.salaryCurrency,
      })),
    };
  }

  async suggestTitles(scope: TenantScope, query: string): Promise<string[]> {
    assertTenantSupported(scope);

    const dbTitles = await jobsRepo.distinctTitlesMatching(query, 10);
    const q = query.toLowerCase();
    const matchingCommon = COMMON_TITLES.filter((t) => t.toLowerCase().includes(q)).slice(0, 5);

    const merged = Array.from(new Set([...dbTitles, ...matchingCommon]));
    return merged.slice(0, 10);
  }

  async suggestSkills(scope: TenantScope, query?: string) {
    assertTenantSupported(scope);

    const sample = (await jobsRepo.allSkillsSample(5000)) as Array<{ skills: unknown }>;
    const skillCounts = new Map<string, number>();
    for (const row of sample) {
      const jobSkills = row.skills as string[] | null;
      if (Array.isArray(jobSkills)) {
        for (const skill of jobSkills) {
          if (typeof skill === "string" && skill.trim()) {
            const normalized = skill.trim();
            skillCounts.set(normalized, (skillCounts.get(normalized) || 0) + 1);
          }
        }
      }
    }

    let skills = Array.from(skillCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    if (query) {
      const q = query.toLowerCase();
      skills = skills.filter((s) => s.name.toLowerCase().includes(q));
      const existingNames = new Set(skills.map((s) => s.name.toLowerCase()));
      const matchingCommon = COMMON_SKILLS.filter(
        (s) => s.toLowerCase().includes(q) && !existingNames.has(s.toLowerCase()),
      ).map((s) => ({ name: s, count: 0 }));
      skills = [...skills, ...matchingCommon];
    }

    return skills.slice(0, 20);
  }

  // ------------------------------------------------------------
  // Dropdowns — countries / cities for location selectors. These
  // aren't tenant-scoped today (the catalog is shared) but the surface
  // lives here so admin pages don't reach into the schema directly.
  // ------------------------------------------------------------

  async listCountries() {
    return jobsRepo.activeCountries();
  }

  async listCities(countryId: number) {
    return jobsRepo.activeCitiesByCountry(countryId);
  }
}

export const jobSearchService = new JobSearchService();
