# BrentDesk — Editorial Archive: Final Report

The archive spans **2025-09-24 to 2026-09-02**.

## Totals

| Metric | Value |
|---|---|
| Original commissions | 100 |
| Additional articles (Sep-Nov 2025 window) | 15 |
| Total written, QA-clean and ingested | 115 |
| Confidence A | 42 |
| Confidence B | 73 |
| Confidence C published | 0 |
| Replaced commissions | 6 |
| Fabricated facts / quotes / authors / publication dates | 0 |
| In-prose internal cross-links | 83 |
| Average categories per article | 2.6 |
| Company profiles | 40 |
| Articles requiring image review | 115 |

Bylines: {'Jakson Gudawela': 47, 'BrentDesk Staff': 27, 'Mo': 41}

Geography: {'Indonesia': 1, 'SA': 77, 'KW': 2, 'UAE': 11, 'US': 3, 'QA': 3, 'Global': 12, 'OM': 3, 'BH': 1, 'IN': 1, 'CN': 1}

Event dates by month: {'2025-09': 1, '2025-10': 6, '2025-11': 8, '2025-12': 7, '2026-01': 12, '2026-02': 12, '2026-03': 7, '2026-04': 14, '2026-05': 8, '2026-06': 5, '2026-07': 10, '2026-08': 21, '2026-09': 4}

## Verified on a fresh database

Schema provisioned, seed adds 3 bylines and 40 company profiles, ingest
creates 115 articles with 181 company links, 299 category links, 83
related-article edges and 543 tag links. Homepage, category pages, sitemap,
RSS and sampled article pages all return 200. No occurrence of the previous
brand in served HTML.

## Editorial review items

1. **"Saudi Energy" as the renamed Saudi Electricity Company** appears in
   several articles on two trade sources with no primary company page.
   Highest priority to re-verify. No company profile was created for it
   precisely because the name is unconfirmed.
2. **Day-level date precision.** A number of eventDates are month-accurate
   with a chosen day. No article's prose asserts a day it cannot support.
3. **Grade B articles** rest on multi-source corroboration without an
   openable primary page.
4. **Images.** Every article carries `imageReviewRequired` and renders the
   neutral category fallback.

## QA table

| # | Event Date | Headline | Categories | Geo | Author | Words | Conf | Best Source | 2nd | Links | Image | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 112 | 2025-09-24 | Freeport Declares Force Majeure at Grasberg as Copper Hits a 15- | mining · metals | Indonesia | Jakson Gudawela | 681 | B | Freeport-McMoRan | 9 | 0 | review | Published |
| 102 | 2025-10-01 | Bahri Orders Six Bulk Carriers From IMI in Saudi Arabia's First  | manufacturing · supply-chain · logistics | SA | Jakson Gudawela | 592 | A | Bahri | 5 | 0 | review | Published |
| 110 | 2025-10-07 | Kuwait Oil Company Places $2.21bn of Submersible Pump Contracts  | oil-gas · energy | KW | BrentDesk Staff | 578 | B | TradeArabia | 4 | 0 | review | Published |
| 109 | 2025-10-10 | EWEC Awards the 1.5 GW Khazna Solar Plant to ENGIE and Masdar | renewables · energy · manufacturing | UAE | Mo | 626 | A | Masdar | 4 | 0 | review | Published |
| 101 | 2025-10-26 | Qiddiya Awards SAR 5.25bn Performing Arts Centre Contract to Nes | construction | SA | Mo | 536 | B | AGBI | 4 | 0 | review | Published |
| 104 | 2025-10-28 | Mawani Leases Ras Al-Khair Port Land to China's ZTT for a SAR 37 | manufacturing · ports · logistics · supply-chain | SA | BrentDesk Staff | 551 | B | Saudi Press Agency | 4 | 0 | review | Published |
| 113 | 2025-10-29 | Data Centre Engines Lift Caterpillar's Backlog to $39.8bn as Tar | machinery · manufacturing · data-centers · industrial-technology | US | BrentDesk Staff | 609 | A | Caterpillar | 6 | 0 | review | Published |
| 108 | 2025-11-02 | QatarEnergy Awards Samsung C&T a 4.1 Million-Tonne Carbon Captur | oil-gas · energy | QA | Jakson Gudawela | 648 | A | Qatar News Agency | 5 | 0 | review | Published |
| 103 | 2025-11-04 | Aramco's Third-Quarter Profit Slips to $26.9bn as It Raises What | energy · oil-gas | SA | Jakson Gudawela | 634 | A | Aramco | 4 | 0 | review | Published |
| 107 | 2025-11-05 | TA'ZIZ Awards a $1.99bn EPC Contract for the UAE's First Large-S | chemicals · manufacturing | UAE | BrentDesk Staff | 635 | A | ADNOC | 4 | 0 | review | Published |
| 115 | 2025-11-10 | US and China Suspend Port Fees for a Year, but the Shipbuilding  | ports · logistics | Global | Mo | 859 | A | Office of the United Sta | 10 | 0 | review | Published |
| 111 | 2025-11-17 | Oman Arab Bank Puts $200m Into the Sohar Polysilicon Plant as Om | manufacturing · renewables · energy · supply-chain | OM | Jakson Gudawela | 603 | B | Muscat Daily | 4 | 0 | review | Published |
| 105 | 2025-11-18 | Ma'aden, MP Materials and the Pentagon Agree to Build a Rare Ear | mining · oil-gas · energy | SA | Jakson Gudawela | 677 | A | MP Materials | 5 | 0 | review | Published |
| 106 | 2025-11-18 | US and Saudi Arabia Declare Civil Nuclear Negotiations Complete, | power · energy | SA | Mo | 638 | A | US Department of Energy | 3 | 0 | review | Published |
| 114 | 2025-11-19 | The Netherlands Suspends Its Nexperia Order After a Chip Halt St | industrial-technology · manufacturing · supply-chain · logistics | Global | Jakson Gudawela | 807 | B | Nexperia | 8 | 0 | review | Published |
| 052 | 2025-12-01 | Saudi Solar Moves Into Gigawatt-Block Construction as $8.2bn Fin | renewables · energy · construction | SA | BrentDesk Staff | 684 | A | ACWA Power | 5 | 2 | review | Published |
| 006 | 2025-12-08 | Jeddah Central Signs Global Hotel Brands as Its Landmark Buildin | construction | SA | Jakson Gudawela | 593 | B | Jeddah Central Developme | 4 | 0 | review | Published |
| 014 | 2025-12-08 | Aramco and ExxonMobil to Study Samref Refinery Upgrade and New Y | energy · oil-gas · chemicals · manufacturing | SA | Jakson Gudawela | 464 | A | Aramco | 3 | 0 | review | Published |
| 041 | 2025-12-16 | Aramco-DHL Venture ASMO Takes Over Five-Million-Square-Metre Pip | logistics · oil-gas · energy · warehousing | SA | Jakson Gudawela | 544 | A | ASMO | 5 | 2 | review | Published |
| 062 | 2025-12-17 | Saudi Arabia Nears Award of Abha Airport's New Terminal Concessi | aviation · transportation · ports · logistics | SA | BrentDesk Staff | 658 | B | General Authority of Civ | 6 | 0 | review | Published |
| 007 | 2025-12-19 | Saudi Arabia's 2034 World Cup Stadium Programme Is Being Reprice | construction | SA | Mo | 924 | B | TheStadiumBusiness | 5 | 0 | review | Published |
| 019 | 2025-12-24 | Arabian Pipes Approves SAR 30m Riyadh Plant to Make Drill Pipe C | manufacturing · metals · mining · supply-chain | SA | BrentDesk Staff | 546 | B | Argaam | 4 | 0 | review | Published |
| 084 | 2026-01-06 | Alba Sets a Production Record for 2025 as Bahrain Weighs Replaci | metals · mining · oil-gas · energy | BH | Jakson Gudawela | 795 | A | Aluminium Bahrain | 5 | 0 | review | Published |
| 097 | 2026-01-06 | PepsiCo Moves Siemens and NVIDIA Digital Twins Into Its US Plant | manufacturing | US | Jakson Gudawela | 647 | B | PepsiCo | 5 | 0 | review | Published |
| 051 | 2026-01-08 | Saudi Arabia Names Bidders for 5.3 GW Round Seven as It Lines Up | renewables · energy · supply-chain · logistics | SA | Mo | 876 | B | Enerdata | 5 | 2 | review | Published |
| 053 | 2026-01-08 | Saudi Wind Procurement Widens as 2.2 GW of Madinah Projects Go O | renewables · energy · supply-chain · logistics | SA | BrentDesk Staff | 556 | B | Saudi Ministry of Energy | 4 | 1 | review | Published |
| 066 | 2026-01-12 | Riyadh Awards $2.75bn Metro Extension to Diriyah as Stations Sta | rail · transportation | SA | Mo | 892 | B | Royal Commission for Riy | 6 | 0 | review | Published |
| 034 | 2026-01-13 | Ma'aden Adds 7.8 Million Ounces to Its Saudi Gold Resources | mining · metals | SA | BrentDesk Staff | 536 | A | Ma'aden | 3 | 1 | review | Published |
| 047 | 2026-01-13 | Saudi Arabia Railways Moved a Record 30 Million Tonnes of Freigh | rail · transportation · mining · chemicals | SA | Mo | 641 | A | Saudi Press Agency | 4 | 0 | review | Published |
| 022 | 2026-01-14 | Saudi Arabia's Car Plants Reach the Year They Have to Start Work | manufacturing | SA | Jakson Gudawela | 802 | A | Saudi Press Agency | 7 | 0 | review | Published |
| 032 | 2026-01-14 | Ma'aden Sets Out $110bn of Spending Across Eight Megaprojects | mining · metals | SA | Jakson Gudawela | 675 | A | Semafor | 5 | 2 | review | Published |
| 093 | 2026-01-20 | Industrial Robot Installations Hold Above 500,000 a Year as Chin | robotics · industrial-technology · manufacturing · automation | Global | Jakson Gudawela | 590 | B | International Federation | 4 | 0 | review | Published |
| 003 | 2026-01-26 | New Murabba Appoints Parsons as Mukaab Superstructure Award Wait | engineering · construction · supply-chain · logistics | SA | Jakson Gudawela | 645 | B | Parsons Corporation | 4 | 0 | review | Published |
| 031 | 2026-01-28 | Saudi Arabia Counts $26.6bn of Mining Agreements as Its Minerals | mining | SA | Mo | 873 | A | Ministry of Industry and | 7 | 2 | review | Published |
| 028 | 2026-02-09 | MODON Puts SAR 3bn Into Sudair as Industrial Cities Take On the  | manufacturing | SA | Mo | 663 | B | Saudi Press Agency | 4 | 0 | review | Published |
| 068 | 2026-02-09 | Saudi Arabia Lifts Eastern Province Desalination Capacity to 3 M | water · infrastructure | SA | Jakson Gudawela | 748 | B | Saudi Water Authority | 5 | 0 | review | Published |
| 072 | 2026-02-09 | Abu Dhabi's Non-Oil Economy Sets a Record, and Manufacturing Is  | manufacturing | UAE | Mo | 849 | A | Statistics Centre - Abu  | 6 | 0 | review | Published |
| 079 | 2026-02-09 | Qatar Signs More Long-Term LNG Contracts as North Field Start-Up | oil-gas · energy | QA | Mo | 799 | A | JERA | 4 | 2 | review | Published |
| 017 | 2026-02-11 | Aramco's iktva Programme Reaches 70% Local Content and Targets 7 | supply-chain · logistics · manufacturing | SA | Jakson Gudawela | 551 | A | Aramco | 5 | 0 | review | Published |
| 057 | 2026-02-18 | NEOM's Green Hydrogen Plant Nears Completion With Its Entire Out | energy · renewables · manufacturing | SA | Mo | 863 | B | NEOM Green Hydrogen Comp | 3 | 0 | review | Published |
| 005 | 2026-02-19 | ROSHN Brings Private Developers Into Sedra in Deals Worth More T | real-estate | SA | BrentDesk Staff | 545 | B | ROSHN Group | 4 | 0 | review | Published |
| 069 | 2026-02-19 | Jubail's $500m Industrial Wastewater Plant Shows What Saudi Indu | utilities · water · infrastructure · manufacturing | SA | Jakson Gudawela | 906 | B | Saudi Exchange | 5 | 0 | review | Published |
| 080 | 2026-02-25 | Technip Energies Joint Venture Wins Qatar's North Field West Ons | epc · construction · oil-gas · energy | QA | Jakson Gudawela | 783 | A | Technip Energies | 5 | 1 | review | Published |
| 011 | 2026-02-26 | Aramco's Tanajib Gas Plant Begins Operations, Processing Offshor | oil-gas · energy · manufacturing | SA | Jakson Gudawela | 622 | A | Aramco | 4 | 0 | review | Published |
| 012 | 2026-02-26 | Aramco's Marjan Increment Adds 300,000 Barrels a Day of Offshore | oil-gas · energy | SA | Jakson Gudawela | 642 | B | Aramco | 5 | 0 | review | Published |
| 013 | 2026-02-26 | Saudi Arabia's Gas Expansion Enters Its Commissioning Phase | oil-gas · energy | SA | Mo | 927 | B | Aramco | 5 | 0 | review | Published |
| 029 | 2026-03-01 | Saudi Arabia's Mandatory Local Content List Widens to More Than  | supply-chain · logistics | SA | Jakson Gudawela | 701 | B | Global Trade Alert | 5 | 3 | review | Published |
| 063 | 2026-03-01 | Saudi Arabia Turns Its Regional Airports Into a Construction Pip | aviation · transportation · construction | SA | Mo | 872 | B | MEED | 7 | 0 | review | Published |
| 037 | 2026-03-05 | Ma'aden's Record Aluminium Year Frames a Doubling It Has Yet to  | metals · mining · oil-gas · energy | SA | Jakson Gudawela | 590 | B | Arab News | 3 | 3 | review | Published |
| 056 | 2026-03-10 | Saudi Energy Puts 380 kV Substations Out to Bid as Renewable Pla | power · energy · renewables | SA | Mo | 675 | B | SaudiGulf Projects | 5 | 1 | review | Published |
| 067 | 2026-03-15 | Saudi Water Programme Moves Inland as Pipelines and Sewage Plant | water · infrastructure · power · energy | SA | BrentDesk Staff | 804 | B | Sharakat | 6 | 0 | review | Published |
| 044 | 2026-03-24 | Mawani Adds Five Shipping Services as Gulf Disruption Redraws Sa | ports · logistics | SA | Jakson Gudawela | 640 | A | Saudi Press Agency | 5 | 0 | review | Published |
| 096 | 2026-03-24 | Predictive Maintenance Moves From Alert to Work Order as Augury  | industrial-technology · manufacturing · industrial-ai | Global | BrentDesk Staff | 760 | B | Augury | 6 | 1 | review | Published |
| 075 | 2026-04-08 | Jafza Adds Warehouse Space at Jebel Ali as the Port Nears Its Ca | ports · logistics · warehousing | UAE | Jakson Gudawela | 785 | A | DP World | 6 | 0 | review | Published |
| 094 | 2026-04-09 | Volvo CE Starts Serial Production of Electric Haulers as Machine | heavy-equipment · manufacturing · construction | Global | Jakson Gudawela | 688 | B | Volvo Construction Equip | 6 | 1 | review | Published |
| 001 | 2026-04-15 | PIF's New Five-Year Strategy Turns Saudi Construction Toward Del | construction | SA | Mo | 923 | A | Public Investment Fund | 7 | 0 | review | Published |
| 016 | 2026-04-15 | Saipem Wins $400m of Further Saudi Offshore Work as Aramco Susta | oil-gas · energy · water · infrastructure | SA | BrentDesk Staff | 573 | A | Saipem | 5 | 0 | review | Published |
| 042 | 2026-04-15 | Saudi Arabia's Industrial Logistics Network Begins to Join Up | logistics · rail · transportation · supply-chain | SA | Mo | 876 | B | Saudi Press Agency | 5 | 1 | review | Published |
| 008 | 2026-04-16 | Expo 2030 Riyadh Awards Two More Infrastructure Packages to Al Y | infrastructure | SA | BrentDesk Staff | 540 | A | Saudi Press Agency | 5 | 0 | review | Published |
| 055 | 2026-04-16 | ACWA Power and Saudi Energy Sign SAR 11.5bn PPA for 2.3 GW Rabig | power · energy · oil-gas | SA | BrentDesk Staff | 539 | A | ACWA Power | 4 | 3 | review | REPLACED |
| 059 | 2026-04-16 | Saudi Industry Is Buying Decarbonisation Options Rather Than Aba | energy · renewables | SA | Jakson Gudawela | 820 | B | ACWA Power | 4 | 4 | review | Published |
| 087 | 2026-04-16 | Brussels Clears Germany's EUR 3.8bn Industrial Power Scheme as E | manufacturing · chemicals | Global | Jakson Gudawela | 758 | B | European Commission | 7 | 0 | review | Published |
| 046 | 2026-04-21 | Dammam's Container Terminals Get $1.8 Billion as Rail Extends th | ports · logistics · rail · transportation | SA | Jakson Gudawela | 674 | B | Saudi Press Agency | 5 | 1 | review | Published |
| 015 | 2026-04-24 | Saudi Arabia Commits Half of Amiral's Output to Domestic Industr | chemicals · manufacturing · oil-gas · energy | SA | Mo | 818 | B | Saudi Press Agency | 5 | 1 | review | Published |
| 004 | 2026-04-26 | Diriyah Awards $490m Contract to Build Saudi Arabia's Museum of  | construction | SA | BrentDesk Staff | 652 | A | Diriyah Company | 6 | 0 | review | Published |
| 095 | 2026-04-28 | Aramco Puts AI Into Refinery Planning Across Its Global Network  | industrial-ai · industrial-technology · oil-gas · energy | SA | Jakson Gudawela | 649 | A | Emerson | 5 | 1 | review | Published |
| 021 | 2026-04-30 | Saudi Arabia's Factory Count Passes 13,600 as Industrial Policy  | manufacturing | SA | Mo | 788 | B | General Authority for St | 6 | 0 | review | Published |
| 076 | 2026-05-04 | UAE Industrial Exports Reach AED262bn as Advanced Manufacturing  | manufacturing | UAE | Jakson Gudawela | 843 | A | Emirates News Agency (WA | 8 | 0 | review | Published |
| 073 | 2026-05-05 | ADNOC Commits AED200bn of New Project Awards as TA'ZIZ Locks In  | oil-gas · energy · chemicals · manufacturing | UAE | Jakson Gudawela | 813 | A | ADNOC | 5 | 1 | review | Published |
| 086 | 2026-05-07 | Siemens Delivers First Dahod-Built Locomotive as India's Infrast | infrastructure · rail · transportation | IN | Mo | 704 | B | Siemens Mobility | 6 | 0 | review | Published |
| 026 | 2026-05-11 | Schneider Electric to Nearly Triple Its Saudi Production Lines b | manufacturing | SA | Jakson Gudawela | 681 | B | Schneider Electric | 4 | 0 | review | Published |
| 049 | 2026-05-12 | ASMO Starts Building Its First Purpose-Built Hub as Aramco's Pro | supply-chain · logistics | SA | Jakson Gudawela | 603 | B | AGBI | 4 | 3 | review | REPLACED |
| 036 | 2026-05-21 | Ras Al-Khair Becomes the Anchor of Saudi Arabia's Metals Industr | metals · mining | SA | Jakson Gudawela | 833 | B | Saudi Press Agency | 5 | 0 | review | Published |
| 099 | 2026-05-21 | ADNOC Puts a Heavy-Duty Inspection Robot Into a Gas Plant as Ind | robotics · industrial-technology · oil-gas · energy | UAE | Jakson Gudawela | 880 | B | ADNOC | 7 | 0 | review | Published |
| 071 | 2026-05-23 | UAE Project Awards Cool in Early 2026 as a Larger Pipeline Lines | construction · rail · transportation | UAE | Mo | 848 | B | Abu Dhabi Media Office | 5 | 2 | review | Published |
| 083 | 2026-06-01 | Kuwait Dissolves KIPIC Into KNPC, Putting 1.4 Million Barrels a  | oil-gas · energy | KW | BrentDesk Staff | 736 | B | Kuwait Times | 5 | 2 | review | REPLACED |
| 035 | 2026-06-09 | Saudi Arabia Qualifies 24 Bidders for Its Tenth Mineral Explorat | mining · metals | SA | BrentDesk Staff | 549 | B | Arab News | 4 | 1 | review | REPLACED |
| 081 | 2026-06-09 | Oman Signs $7.5bn of New Duqm Projects as the Zone's Industrial  | infrastructure · oil-gas · energy | OM | Mo | 744 | A | Government of Oman | 5 | 0 | review | Published |
| 082 | 2026-06-09 | Acme Adds $4.2bn to Its Duqm Hydrogen Plan While Oman's Programm | renewables · energy | OM | Jakson Gudawela | 801 | B | Hydrom | 5 | 0 | review | Published |
| 030 | 2026-06-24 | Saudi Industry Has Localized the Easy Components. The Hard Ones  | manufacturing · supply-chain · logistics | SA | Mo | 861 | B | Saudi Press Agency | 6 | 1 | review | Published |
| 088 | 2026-07-01 | US Factory Construction Falls to $175bn a Year as Chip Investmen | manufacturing · construction | US | Mo | 637 | B | US Census Bureau | 6 | 0 | review | Published |
| 077 | 2026-07-06 | Abu Dhabi Studies a $1bn Korean Industrial Zone as Its Factory P | manufacturing | UAE | BrentDesk Staff | 789 | B | Abu Dhabi Media Office | 8 | 0 | review | Published |
| 061 | 2026-07-13 | Saudi Arabia Opens 900km of Road in Six Months as Infrastructure | infrastructure · water | SA | Mo | 936 | B | Roads General Authority | 6 | 1 | review | Published |
| 038 | 2026-07-14 | Al Yamamah Orders a SAR 270m Billet Plant From Danieli as Saudi  | metals · mining · manufacturing · construction | SA | BrentDesk Staff | 686 | B | SteelOrbis | 5 | 0 | review | Published |
| 048 | 2026-07-14 | Mawani Signs Seven Logistics-Centre Contracts Worth Nearly SAR 1 | warehousing · logistics | SA | BrentDesk Staff | 575 | B | Saudi Press Agency | 4 | 1 | review | Published |
| 064 | 2026-07-14 | King Salman Airport Awards $213m Terminal 6 Substructure Package | construction · ports · logistics · aviation | SA | BrentDesk Staff | 598 | B | MEED | 6 | 0 | review | Published |
| 027 | 2026-07-23 | Saudi Factory Automation Moves From Showcase to Shop Floor | automation · industrial-technology · manufacturing · robotics | SA | Jakson Gudawela | 847 | B | Aramco | 7 | 0 | review | Published |
| 039 | 2026-07-28 | Saudi Arabia Localizes Desalination Energy Recovery Devices in F | water · infrastructure · manufacturing | SA | BrentDesk Staff | 655 | A | Saudi Water Authority | 5 | 1 | review | REPLACED |
| 070 | 2026-07-30 | Saudi Arabia Is Borrowing to Protect Capital Spending, and Ratio | infrastructure | SA | Mo | 908 | B | Saudi Ministry of Financ | 5 | 0 | review | Published |
| 090 | 2026-07-31 | Cement's Carbon Capture Projects Move Into Construction as Deman | manufacturing · construction | Global | Jakson Gudawela | 715 | B | Heidelberg Materials UK | 8 | 0 | review | Published |
| 074 | 2026-08-01 | ADNOC Shifts Its Crude Pricing to Platts Dubai, Changing What Mu | oil-gas · energy | UAE | Mo | 752 | B | Zawya | 4 | 4 | review | REPLACED |
| 024 | 2026-08-03 | Ceer Signs Localisation Deals Worth SAR 9.2 Billion as It Builds | supply-chain · logistics | SA | BrentDesk Staff | 711 | A | Saudi Press Agency | 6 | 1 | review | Published |
| 023 | 2026-08-04 | Lucid Pushes Full Saudi Production Into 2027 as It Resets Spendi | manufacturing | SA | Jakson Gudawela | 749 | A | Lucid Group | 6 | 0 | review | Published |
| 002 | 2026-08-05 | Riyadh Keeps Building as Offices Stay Full and Housing Cools | real-estate · construction | SA | Mo | 880 | B | CBRE | 5 | 0 | review | Published |
| 043 | 2026-08-05 | Riyadh's Industrial Space Runs Near Full as the Manufacturing Ba | warehousing · logistics · manufacturing | SA | BrentDesk Staff | 588 | B | JLL via Arabian Business | 4 | 0 | review | Published |
| 009 | 2026-08-11 | Saudi Contracting Register Passes 140,000 Firms as Foreign Entra | construction | SA | Jakson Gudawela | 834 | B | Arab News | 5 | 0 | review | Published |
| 098 | 2026-08-11 | Industrial Ransomware Is Stopping Production Without Ever Reachi | automation · industrial-technology · manufacturing | Global | Jakson Gudawela | 926 | A | Dragos | 7 | 0 | review | Published |
| 010 | 2026-08-17 | Saudi Project Awards Get Bigger and Fewer as Spending Rotates In | construction | SA | Mo | 839 | A | Arab News | 5 | 1 | review | Published |
| 018 | 2026-08-18 | Ampo Arabia Wins Its Largest Order as Saudi Oilfield Suppliers E | manufacturing · supply-chain · logistics | SA | Jakson Gudawela | 626 | B | TradeArabia | 6 | 0 | review | Published |
| 033 | 2026-08-18 | Aramco and Ma'aden Sign Shareholders' Agreement for Copper-Focus | mining · metals | SA | Jakson Gudawela | 692 | A | Aramco | 5 | 3 | review | Published |
| 065 | 2026-08-18 | Urban Lines Now Carry Nearly All of Saudi Arabia's 83 Million Ra | rail · transportation | SA | Mo | 810 | B | Arab News | 8 | 2 | review | Published |
| 085 | 2026-08-18 | China's Industrial Growth Leans on Exports and Overseas Plants a | manufacturing | CN | Mo | 795 | B | National Bureau of Stati | 7 | 0 | review | Published |
| 040 | 2026-08-19 | Minerals Are Becoming the Link Between Saudi Arabia's Energy and | mining · metals | SA | Mo | 1028 | B | Aramco | 7 | 3 | review | Published |
| 078 | 2026-08-19 | Abu Dhabi Plans to Double Its Generating Fleet as Data Halls Ris | data-centers · industrial-technology | UAE | Mo | 900 | B | The National | 6 | 1 | review | Published |
| 054 | 2026-08-20 | Saudi Arabia Contracts 8 GWh of Battery Storage in SAR 4.35bn Ro | power · energy | SA | BrentDesk Staff | 605 | B | Energy-Storage.news | 4 | 3 | review | Published |
| 060 | 2026-08-20 | Saudi Arabia Is Contracting Gas and Renewables at the Same Time, | power · energy · oil-gas · renewables | SA | Mo | 922 | B | Saudi Ministry of Energy | 5 | 3 | review | Published |
| 045 | 2026-08-25 | RSGT and CMA CGM Commit $434 Million to a Fourth Container Termi | ports · logistics | SA | BrentDesk Staff | 571 | A | CMA CGM Group | 5 | 1 | review | Published |
| 089 | 2026-08-25 | Global Steel Output Slips Through 2026 as Construction Demand Sh | metals · mining · construction | Global | Jakson Gudawela | 596 | B | World Steel Association | 5 | 0 | review | Published |
| 091 | 2026-08-28 | Copper Hits Record Prices as Smelter Failures Overwhelm a Foreca | metals · mining · power · energy | Global | Mo | 1021 | B | International Copper Stu | 7 | 0 | review | Published |
| 058 | 2026-08-31 | Saudi Data Centre Build-Out Puts a New Kind of Load on a Grid De | data-centers · industrial-technology · power · energy | SA | Mo | 836 | B | DataVolt | 4 | 3 | review | Published |
| 092 | 2026-08-31 | Data Centre Construction Runs Into the Limits of the Industrial  | data-centers · industrial-technology · supply-chain · logistics | Global | Jakson Gudawela | 805 | B | International Energy Age | 6 | 1 | review | Published |
| 020 | 2026-09-01 | How Saudi Arabia Is Building an Oil and Gas Supply Chain of Its  | supply-chain · logistics · oil-gas · energy | SA | Mo | 1019 | B | Aramco | 8 | 2 | review | Published |
| 025 | 2026-09-01 | Saudi Arabia Targets More Than 300,000 Vehicles a Year by 2030.  | manufacturing | SA | Mo | 936 | B | Ministry of Industry and | 7 | 1 | review | Published |
| 050 | 2026-09-01 | Saudi Arabia's Logistics Map Is Shifting West | logistics · rail · transportation | SA | Mo | 1119 | B | Business Today | 7 | 2 | review | Published |
| 100 | 2026-09-02 | The Physical Economy Has Become a Technology Market | industrial-technology · robotics · industrial-ai · automation | Global | Mo | 1489 | A | NVIDIA | 10 | 4 | review | Published |

## Replaced commissions

- **055** — was: _Saudi Arabia's Electricity Grid Faces a New Era of Industrial Demand_
  Reason: No verifiable primary or independently corroborated data could be obtained on Saudi industrial load growth, peak demand or factory electrification for the period, and the available material would have duplicated the data centre commission. Replaced with the Rabigh 2 expansion power purchase agreement, a same-period, same-sector development documented by the developer, the Saudi Exchange filing coverage and multiple independent trade reports.
- **049** — was: _Supply Chain Localization Creates New Opportunities for Saudi Manufacturers_
  Reason: No Saudi supplier-qualification programme, procurement contract award or distribution-localization transaction from December 2025 to September 2026 could be corroborated across independent sources within the research available for this batch; the only well-documented material pointed toward industrial policy, which commissions 026, 029 and 030 already cover. Replaced with ASMO's Spark groundbreaking and the build-out of its shared procurement and distribution network, which is documented across multiple independent sources and covers the same procurement, supplier-access and distribution mechanics from the logistics side.
- **083** — was: _Kuwait Moves Ahead With a New Generation of Energy Infrastructure_
  Reason: No single well-corroborated development in the archive period supported the working headline as its own story. The strongest verifiable Kuwait energy-industry development in the window is the Supreme Petroleum Council's dissolution of KIPIC into KNPC, confirmed by Kuwaiti state-linked media and multiple independent trade sources, so that became the story. Kuwait's power and water procurement programme, including the Az-Zour North Phase 2 and 3 signing and the Al-Khiran Phase 1 bids, is carried as context inside the piece.
- **035** — was: _Saudi Arabia Looks to Build More Mining Equipment at Home_
  Reason: No named, verifiable examples of mining-equipment manufacturing being localised in the Kingdom could be corroborated across independent sources for the period; the available material was vendor marketing and market-research summaries rather than announced projects. Replaced with the tenth mineral exploration licensing round, which is documented by the Ministry of Industry and Mineral Resources and corroborated by Arab News, Argaam and Zawya Projects.
- **039** — was: _Saudi Arabia Seeks More Local Production of Critical Industrial Materials_
  Reason: No in-window development on refractory products or comparable industrial materials could be corroborated beyond vendor marketing and market-research pages; replaced with the Saudi Water Authority and Energy Recovery localization of desalination pressure exchangers, which is documented by the authority, the manufacturer's own investor release and regional press.
- **074** — was: _Murban Strengthens Abu Dhabi's Position in Global Energy Markets_
  Reason: Research contradicted the commissioned framing: ADNOC is moving its official selling price benchmark away from Murban futures to Platts Dubai from 1 November 2026. The article was rewritten around that verified development and what Murban's physical position means for refiners, keeping the same subject and period.
