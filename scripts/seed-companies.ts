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
  // Two unrelated companies in this archive are called Masdar. The Abu Dhabi
  // one belongs to the energy coverage; the Saudi one is a building materials
  // distributor and appears throughout the Big 5 Construct Saudi reporting.
  // Articles must name the second in full so the mentions do not collapse
  // onto the wrong profile.
  { name: "Masdar", slug: "masdar", country: "United Arab Emirates", location: "Abu Dhabi, United Arab Emirates",
    website: "https://masdar.ae", industry: "Renewable Energy",
    description: "Abu Dhabi Future Energy Company, a renewable energy developer and investor active in solar, wind, battery storage and green hydrogen across more than forty countries. Unrelated to the Saudi building materials company of the same name." },
  { name: "Masdar Building Materials", slug: "masdar-building-materials", country: "Saudi Arabia", location: "Dammam, Saudi Arabia",
    website: "https://www.masdarbm.com", industry: "Building Materials",
    description: "A Saudi building and construction materials distributor founded in 1971 and part of the Al-Muhaidib Group, supplying steel, timber, insulation, plumbing, electrical products, tools, hardware and chemicals through a branch network across the Kingdom. Unrelated to the Abu Dhabi renewable energy developer of the same name." },
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

  // ---------------------------------------------------------------------
  // Construction, materials and building services. Added with the Big 5
  // Construct Saudi package, where these organisations recur across many
  // articles. Identity facts only, same as above.
  // ---------------------------------------------------------------------
  { name: "Local Content and Government Procurement Authority", slug: "local-content-and-government-procurement-authority", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://lcgpa.gov.sa", industry: "Government", description:
    "The Saudi authority that sets local content requirements in government procurement, operates the local content certification scheme and maintains the mandatory list of nationally produced goods that public buyers must source inside the Kingdom." },
  { name: "Saudi Building Code Center", slug: "saudi-building-code-center", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://sbc.gov.sa", industry: "Government", description:
    "The body responsible for developing, publishing and maintaining the Saudi Building Code, and for the technical requirements that construction work in the Kingdom must meet to be permitted and certified." },
  { name: "Saudi Standards, Metrology and Quality Organization", slug: "saudi-standards-metrology-and-quality-organization", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.saso.gov.sa", industry: "Government", description:
    "SASO, the Kingdom's national standards body, which issues Saudi standards, runs conformity assessment requirements for regulated products and operates the SABER product registration platform." },
  { name: "General Authority for Statistics", slug: "general-authority-for-statistics", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.stats.gov.sa", industry: "Government", description:
    "GASTAT, the Saudi government's statistics agency, which publishes the Kingdom's national accounts, labour market, price and sector statistics." },
  { name: "Ministry of Municipalities and Housing", slug: "ministry-of-municipalities-and-housing", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://momah.gov.sa", industry: "Government", description:
    "The Saudi ministry responsible for municipal services, urban planning, building permits and the housing programme, and the parent of the Kingdom's building code and construction regulation bodies." },
  { name: "Technical and Vocational Training Corporation", slug: "technical-and-vocational-training-corporation", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://tvtc.gov.sa", industry: "Education & Training", description:
    "TVTC, the Saudi government body running the Kingdom's technical colleges and vocational training institutes, including the trades that supply the construction sector." },
  { name: "Royal Commission for Jubail and Yanbu", slug: "royal-commission-for-jubail-and-yanbu", country: "Saudi Arabia", location: "Jubail, Saudi Arabia",
    website: "https://www.rcjy.gov.sa", industry: "Industrial Development", description:
    "The authority that develops and administers Saudi Arabia's industrial cities at Jubail on the Gulf and Yanbu on the Red Sea, including their infrastructure, utilities and land allocation." },
  { name: "Saudi Water Authority", slug: "saudi-water-authority", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://swa.gov.sa", industry: "Water", description:
    "The Saudi regulator and planner for the water sector, covering desalination, transmission, distribution and wastewater across the Kingdom." },
  { name: "General Authority of Civil Aviation", slug: "general-authority-of-civil-aviation", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://gaca.gov.sa", industry: "Aviation", description:
    "GACA, the Saudi civil aviation regulator, responsible for airspace, airport licensing and the Kingdom's aviation strategy." },
  { name: "National Centre for Privatisation & PPP", slug: "national-centre-for-privatisation-and-ppp", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.ncp.gov.sa", industry: "Government", description:
    "The Saudi body that structures and supports privatisation and public-private partnership transactions across government sectors." },
  { name: "Etimad", slug: "etimad", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://etimad.sa", industry: "Government", description:
    "The Saudi government's digital platform for public procurement and financial transactions, through which state tenders are advertised, bid and awarded." },
  { name: "Fahes", slug: "fahes", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: null, industry: "Testing & Certification", description:
    "A Saudi conformity assessment body providing product testing, inspection and certification services used to meet the Kingdom's import and market access requirements." },
  { name: "King Saud University", slug: "king-saud-university", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.ksu.edu.sa", industry: "Education & Research", description:
    "A public research university in Riyadh, the oldest in Saudi Arabia, with engineering and architecture faculties active in the Kingdom's building research." },

  { name: "Al-Muhaidib Group", slug: "al-muhaidib-group", country: "Saudi Arabia", location: "Dammam, Saudi Arabia",
    website: "https://muhaidib.com", industry: "Diversified Holding", description:
    "A Saudi family business group founded in 1946, with holdings spanning building materials distribution, food, retail, real estate and financial investments." },
  { name: "Kronospan", slug: "kronospan", country: null, location: null,
    website: "https://www.kronospan.com", industry: "Wood Products", description:
    "A manufacturer of wood-based panels and engineered boards, including particleboard, MDF and laminate flooring, supplying construction and furniture markets internationally." },
  { name: "Construction Products Holding Company", slug: "construction-products-holding-company", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.cpc.com.sa", industry: "Building Materials", description:
    "CPC, a Saudi building materials group backed by the Public Investment Fund, whose subsidiaries manufacture products used across the Kingdom's construction supply chain." },
  { name: "Al Yamamah Steel Industries", slug: "al-yamamah-steel-industries", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.alyamamahsteel.com.sa", industry: "Steel", description:
    "A Saudi steel manufacturer listed on the Saudi Exchange, producing steel pipes, structural sections, towers and related products for construction, energy and infrastructure projects." },
  { name: "Arkaz", slug: "arkaz", country: "Saudi Arabia", location: "Saudi Arabia",
    website: null, industry: "Construction Chemicals", description:
    "A Saudi producer of construction chemicals, supplying concrete admixtures and related products to the Kingdom's construction market." },
  { name: "Master Builders Solutions", slug: "master-builders-solutions", country: "Germany", location: "Mannheim, Germany",
    website: "https://www.master-builders-solutions.com", industry: "Construction Chemicals", description:
    "A construction chemicals business supplying concrete admixtures, underground construction products and building systems to contractors and producers worldwide." },
  { name: "W. R. Grace", slug: "w-r-grace", country: "United States", location: "Columbia, Maryland, United States",
    website: "https://grace.com", industry: "Specialty Chemicals", description:
    "A US specialty chemicals and materials company producing catalysts, silicas and engineered materials for refining, chemical processing and industrial applications." },
  { name: "Construction Material Chemical Industries", slug: "construction-material-chemical-industries", country: "Saudi Arabia", location: "Saudi Arabia",
    website: null, industry: "Construction Chemicals", description:
    "A Saudi manufacturer of construction chemicals, including admixtures, waterproofing products and surface treatments for the Kingdom's building market." },
  { name: "Specialized Industrial Casting Company", slug: "specialized-industrial-casting-company", country: "Saudi Arabia", location: "Sudair, Saudi Arabia",
    website: null, industry: "Metals", description:
    "SICAST, a Saudi foundry producing industrial castings at Sudair City for Industry and Business for use in infrastructure, water and industrial equipment." },
  { name: "Arabian Vermiculite Industries", slug: "arabian-vermiculite-industries", country: "Saudi Arabia", location: "Dammam, Saudi Arabia",
    website: null, industry: "Building Materials", description:
    "A Saudi manufacturer of vermiculite-based insulation and passive fire protection materials for construction and industrial use." },
  { name: "Arabian Tile Company", slug: "arabian-tile-company", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: null, industry: "Building Materials", description:
    "Aratile, a Saudi manufacturer of ceramic and porcelain tiles supplying the Kingdom's construction and fit-out market." },
  { name: "Red Sea International", slug: "red-sea-international", country: "Saudi Arabia", location: "Dammam, Saudi Arabia",
    website: "https://www.redseainternational.com", industry: "Modular Construction", description:
    "A Saudi company listed on the Saudi Exchange that manufactures modular and prefabricated buildings and provides accommodation and facilities services for industrial and project sites." },
  { name: "Kimmco-Isover", slug: "kimmco-isover", country: "Kuwait", location: "Kuwait", 
    website: "https://www.kimmco-isover.com", industry: "Insulation", description:
    "A Gulf manufacturer of glass wool and stone wool insulation for thermal, acoustic and fire protection applications, part of the Saint-Gobain group." },
  { name: "NAFFCO", slug: "naffco", country: "United Arab Emirates", location: "Dubai, United Arab Emirates",
    website: "https://www.naffco.com", industry: "Fire Safety", description:
    "National Fire Fighting Manufacturing Company, a Dubai-based manufacturer of firefighting equipment, fire protection systems, alarms and emergency vehicles." },
  { name: "Hira Industries", slug: "hira-industries", country: "United Arab Emirates", location: "Dubai, United Arab Emirates",
    website: "https://www.hiraindustries.com", industry: "Building Products", description:
    "A UAE manufacturer of insulation, ducting and mechanical support products for the region's HVAC and building services market." },
  { name: "Walraven Group", slug: "walraven-group", country: "Netherlands", location: "Mijdrecht, Netherlands",
    website: "https://www.walraven.com", industry: "Building Products", description:
    "A Dutch manufacturer of pipe support, fixing and fire-stopping systems for mechanical and plumbing installations." },
  { name: "Leminar Global", slug: "leminar-global", country: "United Arab Emirates", location: "Dubai, United Arab Emirates",
    website: "https://www.leminar.net", industry: "HVAC Distribution", description:
    "A Gulf distributor of HVAC, plumbing and fire protection products, part of the Al-Futtaim group." },
  { name: "Rubber World Industries", slug: "rubber-world-industries", country: "United Arab Emirates", location: "Ajman, United Arab Emirates",
    website: "https://www.rubberworldind.com", industry: "Insulation", description:
    "A UAE manufacturer of closed-cell elastomeric insulation for HVAC and plumbing systems, sold in the region under the Gulf O Flex brand." },
  { name: "Johnson Controls Arabia", slug: "johnson-controls-arabia", country: "Saudi Arabia", location: "Jeddah, Saudi Arabia",
    website: "https://www.johnsoncontrols.com", industry: "Building Systems", description:
    "A Saudi joint venture manufacturing and servicing air conditioning, chillers and building control systems for the Kingdom's construction market." },
  { name: "Eurovent Certita Certification", slug: "eurovent-certita-certification", country: "France", location: "Paris, France",
    website: "https://www.eurovent-certification.com", industry: "Testing & Certification", description:
    "An independent European certification body that verifies the declared performance of heating, ventilation, air conditioning and refrigeration products through third-party testing." },
  { name: "Eurovent Middle East", slug: "eurovent-middle-east", country: "United Arab Emirates", location: "Dubai, United Arab Emirates",
    website: "https://eurovent.me", industry: "Industry Association", description:
    "The regional association for the heating, ventilation, air conditioning and refrigeration industry in the Middle East, representing manufacturers on standards, certification and efficiency policy." },
  { name: "Haier", slug: "haier", country: "China", location: "Qingdao, China",
    website: "https://www.haier.com", industry: "Appliances & HVAC", description:
    "A Chinese manufacturer of home appliances and air conditioning equipment, selling through manufacturing and distribution operations worldwide." },
  { name: "Danfoss", slug: "danfoss", country: "Denmark", location: "Nordborg, Denmark",
    website: "https://www.danfoss.com", industry: "Industrial Equipment", description:
    "A Danish engineering company making components and controls for cooling, heating, hydraulics and power conversion, including valves, drives and heat exchangers." },
  { name: "Energy Recovery", slug: "energy-recovery", country: "United States", location: "San Leandro, California, United States",
    website: "https://www.energyrecovery.com", industry: "Industrial Equipment", description:
    "A US manufacturer of pressure exchanger energy recovery devices used to cut the power consumption of seawater desalination plants and industrial fluid flows." },

  { name: "Al-Futtaim Engineering Company", slug: "al-futtaim-engineering-company", country: "United Arab Emirates", location: "Dubai, United Arab Emirates",
    website: "https://www.alfuttaimengineering.com", industry: "Engineering & Facilities Management", description:
    "The engineering arm of the Al-Futtaim group, providing mechanical, electrical and plumbing contracting, building systems and integrated facilities management across the Gulf." },
  { name: "Prime Middle East Trading Company", slug: "prime-middle-east-trading-company", country: null, location: null,
    website: null, industry: "HVAC & Refrigeration", description:
    "A Middle East distributor of refrigerants and air conditioning products, trading as PRIMECO." },
  { name: "Keller", slug: "keller", country: "United Kingdom", location: "London, United Kingdom",
    website: "https://www.keller.com", industry: "Ground Engineering", description:
    "A London-listed geotechnical contractor specialising in ground improvement, foundations and earth retention for construction projects worldwide." },
  { name: "Mace", slug: "mace", country: "United Kingdom", location: "London, United Kingdom",
    website: "https://www.macegroup.com", industry: "Construction Consultancy", description:
    "A British construction and consultancy group providing programme and project management, cost consultancy and delivery services on large development programmes." },
  { name: "Parsons Corporation", slug: "parsons-corporation", country: "United States", location: "Chantilly, Virginia, United States",
    website: "https://www.parsons.com", industry: "Engineering & Construction", description:
    "A US engineering and technology firm working in infrastructure, transport and defence, with a long-standing presence on Middle East infrastructure programmes." },
  { name: "Webuild", slug: "webuild", country: "Italy", location: "Milan, Italy",
    website: "https://www.webuildgroup.com", industry: "Engineering & Construction", description:
    "An Italian construction group delivering large civil infrastructure, water, rail and hydropower projects internationally." },
  { name: "Nesma & Partners", slug: "nesma-and-partners", country: "Saudi Arabia", location: "Al Khobar, Saudi Arabia",
    website: "https://www.nesmapartners.com", industry: "Engineering & Construction", description:
    "A Saudi contractor delivering industrial, infrastructure and building projects across the Kingdom." },
  { name: "Saudi Binladin Group", slug: "saudi-binladin-group", country: "Saudi Arabia", location: "Jeddah, Saudi Arabia",
    website: null, industry: "Engineering & Construction", description:
    "One of Saudi Arabia's largest construction groups, with a long record on the Kingdom's major building, infrastructure and holy sites projects." },
  { name: "Kabbani Construction Group", slug: "kabbani-construction-group", country: "Saudi Arabia", location: "Jeddah, Saudi Arabia",
    website: "https://www.kabbani.com", industry: "Construction Equipment", description:
    "A Saudi group supplying construction equipment, formwork, scaffolding and related services to contractors in the Kingdom and the wider region." },
  { name: "Misk City", slug: "misk-city", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: null, industry: "Real Estate Development", description:
    "A mixed-use development in Riyadh being delivered under the Mohammed bin Salman Foundation, combining education, business, residential and cultural uses on a single masterplan." },
  { name: "China Harbour Engineering Company", slug: "china-harbour-engineering-company", country: "China", location: "Beijing, China",
    website: "https://www.chec.bj.cn", industry: "Engineering & Construction", description:
    "A Chinese state-owned marine and infrastructure contractor building ports, dredging works, roads and railways internationally." },
  { name: "China Railway Construction Corporation", slug: "china-railway-construction-corporation", country: "China", location: "Beijing, China",
    website: "https://www.crcc.cn", industry: "Engineering & Construction", description:
    "A Chinese state-owned construction group delivering railway, metro, highway and building projects in China and abroad." },
  { name: "China State Construction Engineering Corporation", slug: "china-state-construction-engineering-corporation", country: "China", location: "Beijing, China",
    website: "https://www.cscec.com", industry: "Engineering & Construction", description:
    "A Chinese state-owned building and infrastructure contractor, among the largest construction groups in the world by revenue." },

  { name: "Komatsu", slug: "komatsu", country: "Japan", location: "Tokyo, Japan",
    website: "https://www.komatsu.jp", industry: "Construction Machinery", description:
    "A Japanese manufacturer of construction, mining and utility equipment, including excavators, loaders and dump trucks." },
  { name: "Danieli", slug: "danieli", country: "Italy", location: "Buttrio, Italy",
    website: "https://www.danieli.com", industry: "Industrial Equipment", description:
    "An Italian supplier of plant and equipment for the metals industry, covering steelmaking, rolling mills and process automation." },
  { name: "Schnell Group", slug: "schnell-group", country: "Italy", location: "Italy",
    website: "https://www.schnell.it", industry: "Industrial Equipment", description:
    "An Italian manufacturer of machinery for processing steel reinforcement, including bending, cutting and mesh production lines for the construction industry." },
  { name: "Progress Maschinen & Automation", slug: "progress-maschinen-and-automation", country: "Italy", location: "Brixen, Italy",
    website: "https://www.progress-m.com", industry: "Industrial Equipment", description:
    "An Italian manufacturer of machinery for reinforcement processing and precast concrete production, part of the Progress Group." },
  { name: "Topwerk", slug: "topwerk", country: "Germany", location: "Germany",
    website: "https://www.topwerk.com", industry: "Industrial Equipment", description:
    "A German group of concrete products machinery brands, supplying plant for concrete block, paver, pipe and precast element production." },
  { name: "KEMROC", slug: "kemroc", country: "Germany", location: "Germany",
    website: "https://www.kemroc.de", industry: "Construction Machinery", description:
    "A German manufacturer of hydraulic cutter and milling attachments for excavators, used in rock excavation, trenching and demolition." },
  { name: "Brickeye", slug: "brickeye", country: "Canada", location: "Toronto, Canada",
    website: "https://www.brickeye.com", industry: "Construction Technology", description:
    "A construction technology company making connected sensors and monitoring systems for concrete curing, water damage prevention and site conditions." },

  { name: "HUMAIN", slug: "humain", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://humain.ai", industry: "Artificial Intelligence", description:
    "A Saudi artificial intelligence company owned by the Public Investment Fund, building data centre capacity, models and AI services in the Kingdom." },
  { name: "DataVolt", slug: "datavolt", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.datavolt.com", industry: "Data Centres", description:
    "A Saudi developer and operator of data centre capacity, with projects aimed at the Kingdom's digital infrastructure programme." },
  { name: "Alat", slug: "alat", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: "https://www.alat.com", industry: "Industrial Manufacturing", description:
    "A Public Investment Fund company established to build electronics and advanced industrial manufacturing in Saudi Arabia through joint ventures with international manufacturers." },
  { name: "NVIDIA", slug: "nvidia", country: "United States", location: "Santa Clara, California, United States",
    website: "https://www.nvidia.com", industry: "Semiconductors", description:
    "A US semiconductor company designing graphics and accelerated computing processors, and the software platforms used to run artificial intelligence workloads on them." },
  { name: "Microsoft", slug: "microsoft", country: "United States", location: "Redmond, Washington, United States",
    website: "https://www.microsoft.com", industry: "Software & Cloud", description:
    "A US software and cloud computing company, whose Azure business operates data centre regions and cloud services worldwide." },
  { name: "Amazon", slug: "amazon", country: "United States", location: "Seattle, Washington, United States",
    website: "https://www.amazon.com", industry: "Technology & Retail", description:
    "A US technology and retail company whose Amazon Web Services division is a global provider of cloud infrastructure." },
  { name: "SoftBank Group", slug: "softbank-group", country: "Japan", location: "Tokyo, Japan",
    website: "https://group.softbank", industry: "Investment", description:
    "A Japanese investment and telecommunications group holding stakes in technology and semiconductor companies worldwide." },
  { name: "ZTT", slug: "ztt", country: "China", location: "Nantong, China",
    website: "https://www.ztt.cn", industry: "Cables & Wire", description:
    "A Chinese manufacturer of power and optical cables, conductors and related transmission products." },
  { name: "Baoshan Iron and Steel", slug: "baoshan-iron-and-steel", country: "China", location: "Shanghai, China",
    website: "https://www.baosteel.com", industry: "Steel", description:
    "A Chinese steel producer listed in Shanghai and part of the China Baowu group, making flat steel products for the automotive, appliance and construction sectors." },
  { name: "London Metal Exchange", slug: "london-metal-exchange", country: "United Kingdom", location: "London, United Kingdom",
    website: "https://www.lme.com", industry: "Commodity Exchange", description:
    "The metals futures and options exchange whose settlement prices are the global reference for aluminium, copper, zinc, nickel, lead and tin." },
  { name: "JLL", slug: "jll", country: "United States", location: "Chicago, Illinois, United States",
    website: "https://www.jll.com", industry: "Real Estate Services", description:
    "Jones Lang LaSalle, a commercial real estate services and investment management firm publishing market research across the sectors it advises on." },
  { name: "Kamco Invest", slug: "kamco-invest", country: "Kuwait", location: "Kuwait City, Kuwait",
    website: "https://www.kamcoinvest.com", industry: "Investment", description:
    "A Kuwait-based investment company providing asset management and investment banking services, and publishing regional market research." },
  { name: "Khalifa A. Algosaibi Investment", slug: "khalifa-a-algosaibi-investment", country: "Saudi Arabia", location: "Al Khobar, Saudi Arabia",
    website: null, industry: "Diversified Holding", description:
    "A Saudi investment group based in the Eastern Province, with holdings across industrial, contracting and services businesses." },
  { name: "International Code Council", slug: "international-code-council", country: "United States", location: "Washington, DC, United States",
    website: "https://www.iccsafe.org", industry: "Standards", description:
    "A US-based body that develops the model building and safety codes used as the basis for construction regulation in many jurisdictions." },
  { name: "Korea Electric Power Corporation", slug: "korea-electric-power-corporation", country: "South Korea", location: "Naju, South Korea",
    website: "https://home.kepco.co.kr", industry: "Utilities", description:
    "KEPCO, South Korea's state-controlled electricity utility, which also develops and operates generation and transmission projects internationally." },
  { name: "Etihad Rail", slug: "etihad-rail", country: "United Arab Emirates", location: "Abu Dhabi, United Arab Emirates",
    website: "https://www.etihadrail.ae", industry: "Rail", description:
    "The UAE's national railway company, operating the freight network across the emirates and developing passenger services." },
  { name: "AD Ports Group", slug: "ad-ports-group", country: "United Arab Emirates", location: "Abu Dhabi, United Arab Emirates",
    website: "https://www.adportsgroup.com", industry: "Ports & Logistics", description:
    "An Abu Dhabi listed ports, economic zones and logistics operator, whose assets include Khalifa Port and the emirate's industrial zones." },
  { name: "ADQ", slug: "adq", country: "United Arab Emirates", location: "Abu Dhabi, United Arab Emirates",
    website: "https://www.adq.ae", industry: "Investment", description:
    "An Abu Dhabi sovereign investor holding stakes in utilities, food and agriculture, healthcare, transport and industrial companies." },
  { name: "KEZAD Group", slug: "kezad-group", country: "United Arab Emirates", location: "Abu Dhabi, United Arab Emirates",
    website: "https://www.kezadgroup.com", industry: "Industrial Development", description:
    "The Abu Dhabi operator of Khalifa Economic Zones, providing industrial land, warehousing and infrastructure to manufacturers and logistics operators." },
  { name: "Abu Dhabi Investment Office", slug: "abu-dhabi-investment-office", country: "United Arab Emirates", location: "Abu Dhabi, United Arab Emirates",
    website: "https://www.investabudhabi.ae", industry: "Government", description:
    "The Abu Dhabi government body that attracts and supports inward investment and administers the emirate's investment incentive programmes." },
  { name: "Emirates Water and Electricity Company", slug: "emirates-water-and-electricity-company", country: "United Arab Emirates", location: "Abu Dhabi, United Arab Emirates",
    website: "https://www.ewec.ae", industry: "Utilities", description:
    "EWEC, the sole procurer of water and electricity in Abu Dhabi, which plans capacity and tenders the emirate's generation and desalination projects." },
  { name: "TA'ZIZ", slug: "taziz", country: "United Arab Emirates", location: "Ruwais, United Arab Emirates",
    website: "https://www.taziz.ae", industry: "Chemicals", description:
    "An ADNOC and ADQ joint venture developing a chemicals production and industrial hub at Ruwais in Abu Dhabi." },
  { name: "SATORP", slug: "satorp", country: "Saudi Arabia", location: "Jubail, Saudi Arabia",
    website: "https://www.satorp.com.sa", industry: "Refining", description:
    "Saudi Aramco Total Refining and Petrochemical Company, a full-conversion refinery at Jubail owned by Saudi Aramco and TotalEnergies." },
  { name: "Badeel", slug: "badeel", country: "Saudi Arabia", location: "Riyadh, Saudi Arabia",
    website: null, industry: "Renewable Energy", description:
    "The Public Investment Fund company that invests in and develops renewable power generation projects in Saudi Arabia." },
  { name: "SAPCO", slug: "sapco", country: "Saudi Arabia", location: "Dhahran, Saudi Arabia",
    website: null, industry: "Power", description:
    "Saudi Aramco Power Company, the Aramco subsidiary that holds and develops the group's power generation interests, including renewable projects." },
  { name: "PT Freeport Indonesia", slug: "pt-freeport-indonesia", country: "Indonesia", location: "Jakarta, Indonesia",
    website: "https://ptfi.co.id", industry: "Mining", description:
    "The Indonesian copper and gold miner operating the Grasberg district in Papua, majority-owned by the Indonesian state with Freeport-McMoRan as a partner." },
  { name: "Mordor Intelligence", slug: "mordor-intelligence", country: "India", location: "Hyderabad, India",
    website: "https://www.mordorintelligence.com", industry: "Market Research", description:
    "A market research firm publishing sizing and forecast reports across industrial, construction and technology sectors." },
];

/** How many profiles a fully seeded database holds. The boot check reads this
 *  to decide whether a deploy has brought new ones. */
export const COMPANY_PROFILE_COUNT = PROFILES.length;

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
