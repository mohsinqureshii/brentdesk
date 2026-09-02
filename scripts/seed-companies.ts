/**
 * Company profiles for the entity graph behind the editorial archive.
 *
 * Restricted to stable, non-controversial identity facts: what the company
 * is, where it is based, what it does, and its own website. No employee
 * counts, revenues, valuations, funding or leadership — those move, and an
 * unverifiable number in a profile is as bad as one in an article.
 *
 * Idempotent on slug. Run: DATABASE_URL=... pnpm tsx scripts/seed-companies.ts
 */

import { type MySql2Database } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { companies, countries } from "../drizzle/schema";
import { toDbDate } from "../server/_core/dbValues";

export type CompanyDb = MySql2Database<Record<string, never>>;

interface Profile {
  name: string; slug: string; country: string | null; location: string | null;
  website: string | null; industry: string; description: string;
}

const PROFILES: Profile[] = [
  { name: "Saudi Aramco", slug: "saudi-aramco", country: "Saudi Arabia", location: "Dhahran, Saudi Arabia",
    website: "https://www.aramco.com", industry: "Oil & Gas",
    description: "Saudi Arabian Oil Company, the state-controlled oil and gas producer listed on the Saudi Exchange. It operates the Kingdom's upstream production, an expanding gas business, and refining and petrochemical assets in Saudi Arabia and internationally." },
  { name: "Ma'aden", slug: "maaden", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.maaden.com.sa", industry: "Mining & Metals",
    description: "Saudi Arabian Mining Company, the Kingdom's state-backed mining group. Its operations span phosphate, aluminium, gold and base metals, with major industrial assets at Ras Al-Khair." },
  { name: "SABIC", slug: "sabic", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.sabic.com", industry: "Chemicals",
    description: "Saudi Basic Industries Corporation, a diversified chemicals producer majority-owned by Saudi Aramco and listed on the Saudi Exchange. It manufactures petrochemicals, polymers, industrial gases and fertilisers." },
  { name: "Public Investment Fund", slug: "public-investment-fund", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.pif.gov.sa", industry: "Sovereign Wealth Fund",
    description: "Saudi Arabia's sovereign wealth fund and the principal financial vehicle behind Vision 2030. It owns or anchors many of the Kingdom's giga projects and industrial companies." },
  { name: "ROSHN", slug: "roshn", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.roshn.sa", industry: "Real Estate Development",
    description: "A Saudi real estate developer owned by the Public Investment Fund, building large master-planned residential communities across the Kingdom." },
  { name: "Diriyah Company", slug: "diriyah-company", country: "Saudi Arabia", location: "Diriyah, Saudi Arabia",
    website: "https://www.diriyah.sa", industry: "Real Estate Development",
    description: "The Public Investment Fund company developing Diriyah, the historic settlement north-west of central Riyadh, as a mixed-use cultural, residential and hospitality district." },
  { name: "New Murabba", slug: "new-murabba", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.newmurabba.com", industry: "Real Estate Development",
    description: "The Public Investment Fund development company behind New Murabba, a large mixed-use downtown district under development in north-west Riyadh." },
  { name: "NEOM", slug: "neom", country: "Saudi Arabia", location: "Tabuk Province, Saudi Arabia",
    website: "https://www.neom.com", industry: "Urban Development",
    description: "A Public Investment Fund development in north-west Saudi Arabia comprising several regions and industrial ventures, including energy, port and logistics projects on the Red Sea." },
  { name: "Saudi Electricity Company", slug: "saudi-electricity-company", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.se.com.sa", industry: "Utilities",
    description: "The Kingdom's principal electricity transmission and distribution utility, listed on the Saudi Exchange." },
  { name: "Saudi Arabia Railways", slug: "saudi-arabia-railways", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.sar.com.sa", industry: "Rail",
    description: "The national railway operator, running passenger services and freight corridors linking Saudi mines, industrial cities and ports." },
  { name: "ASMO", slug: "asmo", country: "Saudi Arabia", location: "Dhahran, Saudi Arabia",
    website: null, industry: "Logistics",
    description: "A procurement and logistics joint venture established by Saudi Aramco and DHL Supply Chain to serve industrial and energy supply chains in Saudi Arabia." },
  { name: "DHL", slug: "dhl", country: "Germany", location: "Bonn, Germany",
    website: "https://www.dhl.com", industry: "Logistics",
    description: "The logistics division of Deutsche Post DHL Group, operating express, freight forwarding and contract logistics businesses worldwide." },
  { name: "ExxonMobil", slug: "exxonmobil", country: "United States", location: "Spring, Texas, United States",
    website: "https://corporate.exxonmobil.com", industry: "Oil & Gas",
    description: "Exxon Mobil Corporation, a US-listed integrated oil, gas and chemicals company with upstream, refining and petrochemical operations worldwide." },
  { name: "Samref", slug: "samref", country: "Saudi Arabia", location: "Yanbu, Saudi Arabia",
    website: "https://www.samref.com.sa", industry: "Refining",
    description: "Saudi Aramco Mobil Refinery Company, an export refinery at Yanbu on the Red Sea owned in equal shares by Saudi Aramco and a wholly owned ExxonMobil subsidiary." },
  { name: "Saipem", slug: "saipem", country: "Italy", location: "Milan, Italy",
    website: "https://www.saipem.com", industry: "Engineering & Construction",
    description: "An Italian engineering and construction contractor serving the energy and infrastructure sectors, with offshore and onshore project execution and a fleet of construction vessels." },
  { name: "ADNOC", slug: "adnoc", country: "United Arab Emirates", location: "Abu Dhabi, United Arab Emirates",
    website: "https://www.adnoc.ae", industry: "Oil & Gas",
    description: "Abu Dhabi National Oil Company, the emirate's state energy group, with upstream oil and gas production, refining, petrochemicals and a portfolio of listed subsidiaries." },
  { name: "DP World", slug: "dp-world", country: "United Arab Emirates", location: "Dubai, United Arab Emirates",
    website: "https://www.dpworld.com", industry: "Ports & Logistics",
    description: "A Dubai-based ports and logistics operator running container terminals, economic zones and supply chain businesses across a global network anchored at Jebel Ali." },
  { name: "QatarEnergy", slug: "qatarenergy", country: "Qatar", location: "Doha, Qatar",
    website: "https://www.qatarenergy.qa", industry: "Oil & Gas",
    description: "Qatar's state energy company, operator of the North Field and one of the world's largest liquefied natural gas producers." },
  { name: "Lucid", slug: "lucid", country: "United States", location: "Newark, California, United States",
    website: "https://lucidmotors.com", industry: "Automotive Manufacturing",
    description: "Lucid Group, a US-listed electric vehicle manufacturer majority-backed by Saudi Arabia's Public Investment Fund, with vehicle assembly operations in the United States and Saudi Arabia." },
  { name: "Ceer", slug: "ceer", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.ceermotors.com", industry: "Automotive Manufacturing",
    description: "Saudi Arabia's first domestic electric vehicle brand, a joint venture between the Public Investment Fund and Foxconn." },
  { name: "ACWA Power", slug: "acwa-power", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.acwapower.com", industry: "Power & Water",
    description: "A Saudi developer, investor and operator of power generation and desalinated water plants, listed on the Saudi Exchange, with a large renewables portfolio across the Middle East, Africa and Central Asia." },
  { name: "MODON", slug: "modon", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://modon.gov.sa", industry: "Industrial Development",
    description: "The Saudi Authority for Industrial Cities and Technology Zones, which develops and operates industrial cities and their utilities and infrastructure across the Kingdom." },
  { name: "Mawani", slug: "mawani", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://mawani.gov.sa", industry: "Ports",
    description: "The Saudi Ports Authority, the regulator and landlord for the Kingdom's commercial ports, including Jeddah Islamic Port and King Abdulaziz Port in Dammam." },
  // Recurring across the archive and previously unlinked. Same restraint as
  // above: identity facts only, nothing that moves.
  { name: "Saudi Power Procurement Company", slug: "saudi-power-procurement-company", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.sppc.sa", industry: "Power",
    description: "The Kingdom's sole buyer of electricity, which runs Saudi Arabia's competitive procurement rounds for generation capacity and signs the resulting power purchase agreements." },
  { name: "Masdar", slug: "masdar", country: "United Arab Emirates", location: "Abu Dhabi, United Arab Emirates",
    website: "https://masdar.ae", industry: "Renewable Energy",
    description: "Abu Dhabi Future Energy Company, a renewable energy developer and investor active in solar, wind, battery storage and green hydrogen across more than forty countries." },
  { name: "EGA", slug: "emirates-global-aluminium", country: "United Arab Emirates", location: "Dubai, United Arab Emirates",
    website: "https://www.ega.ae", industry: "Metals",
    description: "Emirates Global Aluminium, the UAE's aluminium producer, operating smelters at Jebel Ali and Al Taweelah alongside upstream bauxite and alumina assets." },
  { name: "Matarat Holding", slug: "matarat-holding", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://matarat.gov.sa", industry: "Aviation",
    description: "The Saudi state holding company for the Kingdom's airports, responsible for their operation, development and privatisation programme." },
  { name: "King Salman Energy Park", slug: "king-salman-energy-park", country: "Saudi Arabia", location: "Eastern Province, Saudi Arabia",
    website: "https://www.spark.sa", industry: "Industrial Development",
    description: "An industrial city between Dammam and Al-Ahsa, known as SPARK, developed to host energy sector manufacturing, fabrication and logistics operations." },
  { name: "Alfanar", slug: "alfanar", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.alfanar.com", industry: "Electrical Equipment",
    description: "A Saudi manufacturer and contractor producing electrical equipment and building systems, with engineering and renewable energy businesses in the Kingdom and abroad." },
  { name: "Schneider Electric", slug: "schneider-electric", country: "France", location: "Rueil-Malmaison, France",
    website: "https://www.se.com", industry: "Electrical Equipment",
    description: "A French multinational making electrical distribution, industrial automation and energy management equipment and software." },
  { name: "Siemens", slug: "siemens", country: "Germany", location: "Munich, Germany",
    website: "https://www.siemens.com", industry: "Industrial Technology",
    description: "A German industrial technology group spanning factory and process automation, rail systems, building technology and industrial software." },
  { name: "Caterpillar", slug: "caterpillar", country: "United States", location: "Irving, Texas, United States",
    website: "https://www.caterpillar.com", industry: "Heavy Equipment",
    description: "A US manufacturer of construction and mining equipment, engines and industrial power systems, sold through a global independent dealer network." },
  { name: "TotalEnergies", slug: "totalenergies", country: "France", location: "Courbevoie, France",
    website: "https://totalenergies.com", industry: "Oil & Gas",
    description: "A French energy company with oil and gas production, refining and petrochemicals, alongside an expanding electricity and renewables business." },
  { name: "SLB", slug: "slb", country: "United States", location: "Houston, Texas, United States",
    website: "https://www.slb.com", industry: "Oilfield Services",
    description: "An oilfield services company, formerly Schlumberger, supplying drilling, reservoir and production technology and services to operators worldwide." },
  { name: "CMA CGM", slug: "cma-cgm", country: "France", location: "Marseille, France",
    website: "https://www.cmacgm-group.com", industry: "Shipping & Logistics",
    description: "A French container shipping and logistics group operating liner services, terminals and freight forwarding across a global network." },
  { name: "Saudi Contractors Authority", slug: "saudi-contractors-authority", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://sca.sa", industry: "Construction",
    description: "The body that registers, classifies and represents contracting firms operating in Saudi Arabia, and publishes data on the Kingdom's contracting market." },
  { name: "Ministry of Industry and Mineral Resources", slug: "ministry-of-industry-and-mineral-resources", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://mim.gov.sa", industry: "Government",
    description: "The Saudi ministry responsible for industrial policy and the mining sector, which issues industrial licences and mineral exploration and mining licences." },
  { name: "Technip Energies", slug: "technip-energies", country: "France", location: "Nanterre, France",
    website: "https://www.ten.com", industry: "Engineering & Construction",
    description: "An engineering and technology company for the energy sector, with a large position in liquefied natural gas plant design and delivery." },
  { name: "Freeport-McMoRan", slug: "freeport-mcmoran", country: "United States", location: "Phoenix, Arizona, United States",
    website: "https://www.fcx.com", industry: "Mining",
    description: "A US mining company producing copper, gold and molybdenum, whose assets include the Grasberg district in Indonesia and operations in the Americas." },
  { name: "Alba", slug: "alba", country: "Bahrain", location: "Askar, Bahrain",
    website: "https://www.albasmelter.com", industry: "Metals",
    description: "Aluminium Bahrain, one of the largest single-site aluminium smelters in the world and a central part of Bahrain's industrial base." },
];

/** Insert or refresh the company profiles. Idempotent on slug. */
export async function seedCompanies(db: CompanyDb, statusId: number): Promise<void> {
  let added = 0, updated = 0;
  for (const p of PROFILES) {
    const [countryRow] = p.country
      ? await db.select({ id: countries.id }).from(countries).where(eq(countries.name, p.country)).limit(1)
      : [undefined];

    const values = {
      name: p.name, slug: p.slug, description: p.description, website: p.website,
      location: p.location, industry: p.industry, countryId: countryRow?.id ?? null,
      statusId, isVerified: 1, publishedAt: toDbDate(new Date()),
    };

    const [existing] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, p.slug)).limit(1);
    if (existing) { await db.update(companies).set(values as any).where(eq(companies.id, existing.id)); updated++; }
    else { await db.insert(companies).values(values as any); added++; }
  }
  console.log(`[seed] companies: ${added} added, ${updated} updated`);
}
