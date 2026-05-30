import "dotenv/config";
import mongoose from "mongoose";
import { CONNECT_DB } from "@server/config/mongodb";
import { SeeWrite } from "@server/models/writing/SeeWrite";
import { createLesson } from "@server/services/seeWriteService";

/**
 * Seed 60 SeeWrite lessons: 20 topics × 3 levels.
 * Each lesson has its own unique title, image, description and word pool —
 * the three levels within a topic are distinct scenes, not the same scene reused.
 *
 * Goes through the real admin flow (seeWriteService.createLesson):
 *   - upserts Vocabulary entries
 *   - triggers ensureEnriched in background (Vocaxis → AI fallback → Dictionary API for audio)
 *
 * Idempotent: skip if a lesson with the same title already exists (unless FORCE=1).
 *
 * Usage:
 *   pnpm dlx @babel/node src/commands/seedSeeWrite.js
 *   FORCE=1 pnpm dlx @babel/node src/commands/seedSeeWrite.js
 */

const FORCE = process.env.FORCE === "1";

const WC = {
  beginner: { min: 30, max: 80 },
  intermediate: { min: 50, max: 150 },
  advanced: { min: 80, max: 200 },
};

const LESSONS = [
  // ─── 1. personal_communication ───
  {
    topic: "personal_communication",
    level: "beginner",
    title: "A Mother Reading to Her Child",
    image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800",
    description: "A mother holds her child on her lap and reads a picture book at home.",
    requiredWords: ["book", "mother", "child", "story"],
    distractorWords: ["helicopter", "harbor", "vineyard", "telescope", "factory", "lantern"],
  },
  {
    topic: "personal_communication",
    level: "intermediate",
    title: "Friends Catching Up at a Café",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800",
    description: "Two friends sit at a small café table, laughing and sharing news after a long time apart.",
    requiredWords: ["friends", "laughter", "conversation", "coffee", "reunion"],
    distractorWords: ["warehouse", "courthouse", "submarine", "harvest", "telescope", "scaffold", "vineyard"],
  },
  {
    topic: "personal_communication",
    level: "advanced",
    title: "Business Networking Reception",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800",
    description: "Well-dressed professionals exchange business cards and small talk under chandeliers in a hotel ballroom.",
    requiredWords: ["handshake", "networking", "mingling", "attire", "exchange", "conversation"],
    distractorWords: ["locomotive", "vineyard", "smelter", "observatory", "marsh", "submarine", "scaffolding", "harbor"],
  },

  // ─── 2. everyday_life ───
  {
    topic: "everyday_life",
    level: "beginner",
    title: "Morning Coffee on the Balcony",
    image: "https://images.unsplash.com/photo-1495197359483-d092478c170a?w=800",
    description: "A steaming cup of coffee sits on a small balcony table as the sun rises over the city.",
    requiredWords: ["coffee", "sunrise", "balcony", "cup"],
    distractorWords: ["rocket", "submarine", "factory", "parade", "telescope", "racetrack"],
  },
  {
    topic: "everyday_life",
    level: "intermediate",
    title: "Weekend Grocery Shopping",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    description: "A shopper pushes a cart down the aisle, picking out fresh vegetables for the week.",
    requiredWords: ["cart", "vegetables", "aisle", "shopper", "produce"],
    distractorWords: ["cinema", "racetrack", "garage", "lighthouse", "brickwork", "submarine", "vineyard"],
  },
  {
    topic: "everyday_life",
    level: "advanced",
    title: "Late-Night Reading in a Studio Apartment",
    image: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800",
    description: "A solitary reader sits in an armchair beside a lamp, paperback in hand, late into a quiet night.",
    requiredWords: ["lamplight", "paperback", "solitude", "armchair", "midnight", "stillness"],
    distractorWords: ["stadium", "harbor", "observatory", "courthouse", "smelter", "vineyard", "marsh", "locomotive"],
  },

  // ─── 3. transportation_travel ───
  {
    topic: "transportation_travel",
    level: "beginner",
    title: "Bicycle Resting by a Lake",
    image: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800",
    description: "A bicycle leans against a tree near the calm shore of a lake on a sunny afternoon.",
    requiredWords: ["bicycle", "lake", "tree", "shore"],
    distractorWords: ["spaceship", "submarine", "microscope", "factory", "drumkit", "ladder"],
  },
  {
    topic: "transportation_travel",
    level: "intermediate",
    title: "Boarding a Domestic Flight",
    image: "https://images.unsplash.com/photo-1542296332-2e4473faf563?w=800",
    description: "Passengers wheel suitcases down a jetway as they prepare to board a short-haul aircraft.",
    requiredWords: ["gate", "suitcase", "passenger", "jetway", "terminal"],
    distractorWords: ["blacksmith", "vineyard", "courtroom", "telescope", "hammock", "scaffolding", "observatory"],
  },
  {
    topic: "transportation_travel",
    level: "advanced",
    title: "Overnight Train Through Snowy Mountains",
    image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800",
    description: "A long train winds through mountain passes at dusk, its windows glowing in the icy landscape.",
    requiredWords: ["locomotive", "carriage", "compartment", "conductor", "scenery", "twilight"],
    distractorWords: ["refinery", "courthouse", "observatory", "brickwork", "lantern", "harbor", "vineyard", "scaffolding"],
  },

  // ─── 4. school_education ───
  {
    topic: "school_education",
    level: "beginner",
    title: "First Day at Kindergarten",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
    description: "Small children with colorful backpacks line up in front of their new kindergarten classroom.",
    requiredWords: ["backpack", "teacher", "classroom", "children"],
    distractorWords: ["hammock", "submarine", "refinery", "vineyard", "observatory", "telescope"],
  },
  {
    topic: "school_education",
    level: "intermediate",
    title: "Group Study in the University Library",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800",
    description: "Students sit around a long library table with laptops and textbooks, deep in discussion before an exam.",
    requiredWords: ["students", "textbooks", "laptop", "library", "discussion"],
    distractorWords: ["warehouse", "racetrack", "smelter", "harbor", "scaffolding", "vineyard", "hammock"],
  },
  {
    topic: "school_education",
    level: "advanced",
    title: "Doctoral Thesis Defense",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800",
    description: "A young scholar stands at a podium presenting slides to a panel of senior academics in a formal hall.",
    requiredWords: ["candidate", "committee", "podium", "slideshow", "scholarship", "examiners"],
    distractorWords: ["locomotive", "fairground", "smelter", "harbor", "marsh", "lighthouse", "scaffolding", "vineyard"],
  },

  // ─── 5. work_business ───
  {
    topic: "work_business",
    level: "beginner",
    title: "Tidy Desk in a Small Office",
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800",
    description: "A clean wooden desk holds a laptop, a notebook and a pen near a small potted plant.",
    requiredWords: ["desk", "laptop", "notebook", "pen"],
    distractorWords: ["rocket", "harbor", "vineyard", "drumkit", "parade", "snowman"],
  },
  {
    topic: "work_business",
    level: "intermediate",
    title: "Team Brainstorming Session",
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800",
    description: "Colleagues stand around a whiteboard covered in sticky notes, sketching ideas with markers.",
    requiredWords: ["whiteboard", "marker", "colleagues", "ideas", "meeting"],
    distractorWords: ["warehouse", "lighthouse", "observatory", "smelter", "vineyard", "scaffold", "racetrack"],
  },
  {
    topic: "work_business",
    level: "advanced",
    title: "Boardroom Strategy Presentation",
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800",
    description: "Executives sit at a long polished table as a presenter walks them through quarterly projections.",
    requiredWords: ["executives", "projection", "strategy", "quarterly", "stakeholders", "boardroom"],
    distractorWords: ["racetrack", "marsh", "refinery", "vineyard", "sawmill", "locomotive", "harbor", "lantern"],
  },

  // ─── 6. public_services ───
  {
    topic: "public_services",
    level: "beginner",
    title: "Mailing a Letter at the Post Office",
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
    description: "A customer hands an envelope across the counter to a clerk wearing a uniform.",
    requiredWords: ["counter", "envelope", "stamp", "clerk"],
    distractorWords: ["rocket", "factory", "racetrack", "vineyard", "harbor", "telescope"],
  },
  {
    topic: "public_services",
    level: "intermediate",
    title: "Waiting Room at the DMV",
    image: "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800",
    description: "People sit on rows of plastic chairs holding numbered tickets while a screen calls the next applicant.",
    requiredWords: ["ticket", "queue", "paperwork", "applicant", "signage"],
    distractorWords: ["warehouse", "vineyard", "racetrack", "hammock", "brickwork", "scaffolding", "lantern"],
  },
  {
    topic: "public_services",
    level: "advanced",
    title: "Citizen Services Consultation Desk",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800",
    description: "A government officer reviews documents with a citizen at a help desk, going over eligibility and forms.",
    requiredWords: ["bureaucracy", "documentation", "eligibility", "processing", "identification", "consultation"],
    distractorWords: ["refinery", "locomotive", "vineyard", "observatory", "marsh", "harbor", "lighthouse", "sawmill"],
  },

  // ─── 7. health_medicine ───
  {
    topic: "health_medicine",
    level: "beginner",
    title: "Doctor Checking a Child's Throat",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800",
    description: "A friendly doctor with a stethoscope leans down and looks into a small child's throat with a smile.",
    requiredWords: ["doctor", "child", "stethoscope", "smile"],
    distractorWords: ["rocket", "parade", "vineyard", "harbor", "racetrack", "scaffolding"],
  },
  {
    topic: "health_medicine",
    level: "intermediate",
    title: "Pharmacist Reading a Prescription",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800",
    description: "A pharmacist behind a counter studies a prescription, shelves of medication lined up behind her.",
    requiredWords: ["pharmacist", "prescription", "medication", "shelves", "counter"],
    distractorWords: ["warehouse", "racetrack", "observatory", "smelter", "vineyard", "scaffolding", "harbor"],
  },
  {
    topic: "health_medicine",
    level: "advanced",
    title: "Surgical Team Preparing for Operation",
    image: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800",
    description: "Masked surgeons in sterile gowns gather around an operating table, with monitors and instruments laid out.",
    requiredWords: ["surgeon", "sterile", "scalpel", "monitors", "gowns", "operation"],
    distractorWords: ["locomotive", "vineyard", "refinery", "harbor", "observatory", "lighthouse", "brickwork", "sawmill"],
  },

  // ─── 8. shopping_money ───
  {
    topic: "shopping_money",
    level: "beginner",
    title: "Buying Apples at a Fruit Stand",
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800",
    description: "A customer picks fresh apples from a wooden basket at an outdoor fruit stand.",
    requiredWords: ["apples", "fruit", "vendor", "basket"],
    distractorWords: ["spaceship", "vineyard", "observatory", "harbor", "drumkit", "scaffolding"],
  },
  {
    topic: "shopping_money",
    level: "intermediate",
    title: "Bargaining at a Night Market",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
    description: "Shoppers haggle with vendors at brightly lit stalls in a crowded Asian night market.",
    requiredWords: ["stall", "lanterns", "bargain", "crowd", "vendor"],
    distractorWords: ["warehouse", "refinery", "hammock", "vineyard", "scaffolding", "racetrack", "sawmill"],
  },
  {
    topic: "shopping_money",
    level: "advanced",
    title: "Luxury Boutique on a Fashionable Avenue",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
    description: "Mannequins in designer outfits stand in the window of an exclusive boutique with polished signage.",
    requiredWords: ["boutique", "mannequin", "signage", "exclusivity", "clientele", "couture"],
    distractorWords: ["marsh", "locomotive", "refinery", "brickwork", "harbor", "lighthouse", "observatory", "sawmill"],
  },

  // ─── 9. food_drink ───
  {
    topic: "food_drink",
    level: "beginner",
    title: "A Bowl of Phở on the Table",
    image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800",
    description: "A steaming bowl of beef phở sits on a wooden table beside chopsticks and a plate of fresh herbs.",
    requiredWords: ["noodles", "broth", "beef", "herbs"],
    distractorWords: ["airplane", "library", "hammer", "snowman", "telescope", "bicycle"],
  },
  {
    topic: "food_drink",
    level: "intermediate",
    title: "Cozy Café Workspace",
    image: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800",
    description: "A laptop, a ceramic cup of espresso and a pastry share a small wooden table in a warm urban café.",
    requiredWords: ["laptop", "espresso", "barista", "pastry", "ceramic"],
    distractorWords: ["courtroom", "harbor", "racetrack", "vineyard", "lantern", "sawmill", "observatory"],
  },
  {
    topic: "food_drink",
    level: "advanced",
    title: "Plating at a Michelin-Star Restaurant",
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800",
    description: "A chef carefully arranges micro-garnish on a delicate dish in the immaculate kitchen of a fine-dining restaurant.",
    requiredWords: ["garnish", "plating", "sommelier", "truffle", "ambience", "gastronomy"],
    distractorWords: ["warehouse", "submarine", "observatory", "sawmill", "brickwork", "harbor", "scaffolding", "lantern"],
  },

  // ─── 10. entertainment_leisure ───
  {
    topic: "entertainment_leisure",
    level: "beginner",
    title: "Children at a Summer Carnival",
    image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800",
    description: "Happy children hold balloons and ride a colorful carousel under string lights at a summer carnival.",
    requiredWords: ["children", "rides", "balloons", "laughter"],
    distractorWords: ["warehouse", "refinery", "observatory", "vineyard", "scaffolding", "brickwork"],
  },
  {
    topic: "entertainment_leisure",
    level: "intermediate",
    title: "Outdoor Concert at Sunset",
    image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800",
    description: "A musician on stage plays guitar to a cheering crowd as colored lights wash across the audience at dusk.",
    requiredWords: ["stage", "audience", "microphone", "lights", "sunset"],
    distractorWords: ["courtroom", "lighthouse", "vineyard", "sawmill", "racetrack", "observatory", "harbor"],
  },
  {
    topic: "entertainment_leisure",
    level: "advanced",
    title: "Opera House on Premiere Night",
    image: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800",
    description: "Crystal chandeliers light a packed opera house as an orchestra tunes below the velvet curtain on opening night.",
    requiredWords: ["chandelier", "orchestra", "soprano", "curtain", "ovation", "premiere"],
    distractorWords: ["refinery", "racetrack", "marsh", "brickwork", "harbor", "lighthouse", "observatory", "sawmill"],
  },

  // ─── 11. nature_environment ───
  {
    topic: "nature_environment",
    level: "beginner",
    title: "Flowers in a Spring Garden",
    image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800",
    description: "Colorful flowers bloom in a small backyard garden while a butterfly rests on a petal in the sunlight.",
    requiredWords: ["flowers", "garden", "sunlight", "butterfly"],
    distractorWords: ["skyscraper", "racetrack", "scaffolding", "factory", "drumkit", "refinery"],
  },
  {
    topic: "nature_environment",
    level: "intermediate",
    title: "Hiking Trail Through Pine Forest",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",
    description: "A narrow trail winds between tall pine trees as a hiker with a backpack moves through morning light.",
    requiredWords: ["trail", "pine", "hiker", "backpack", "ridge"],
    distractorWords: ["warehouse", "lighthouse", "racetrack", "observatory", "vineyard", "scaffolding", "lantern"],
  },
  {
    topic: "nature_environment",
    level: "advanced",
    title: "Glacier Melting Into a Turquoise Bay",
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800",
    description: "A massive glacier breaks into chunks of ice along a turquoise polar bay, with steep crevasses visible.",
    requiredWords: ["glacier", "crevasse", "fjord", "meltwater", "iceberg", "expanse"],
    distractorWords: ["refinery", "locomotive", "vineyard", "brickwork", "harbor", "racetrack", "sawmill", "scaffolding"],
  },

  // ─── 12. science_technology ───
  {
    topic: "science_technology",
    level: "beginner",
    title: "Robot Toy on a Desk",
    image: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=800",
    description: "A small toy robot with blinking lights stands on a wooden desk beside a notebook and a coffee mug.",
    requiredWords: ["robot", "desk", "lights", "wires"],
    distractorWords: ["vineyard", "harbor", "racetrack", "scaffolding", "parade", "snowman"],
  },
  {
    topic: "science_technology",
    level: "intermediate",
    title: "Coder Debugging at Night",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
    description: "A developer focuses on a glowing monitor full of code, a mug of coffee at hand, surrounded by night-time stillness.",
    requiredWords: ["monitor", "keyboard", "syntax", "debugging", "screens"],
    distractorWords: ["warehouse", "marsh", "racetrack", "observatory", "scaffolding", "vineyard", "lantern"],
  },
  {
    topic: "science_technology",
    level: "advanced",
    title: "Gene-Editing Laboratory",
    image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800",
    description: "A researcher in protective gear works with a micropipette under sterile lights surrounded by lab equipment.",
    requiredWords: ["micropipette", "centrifuge", "genome", "researcher", "biosafety", "sequencer"],
    distractorWords: ["refinery", "vineyard", "marsh", "lighthouse", "observatory", "brickwork", "sawmill", "harbor"],
  },

  // ─── 13. culture_society ───
  {
    topic: "culture_society",
    level: "beginner",
    title: "Children in Traditional Áo Dài",
    image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800",
    description: "Vietnamese children wear bright áo dài and pose for a photo in front of a flowered backdrop.",
    requiredWords: ["aodai", "children", "smile", "tradition"],
    distractorWords: ["warehouse", "observatory", "vineyard", "refinery", "scaffolding", "harbor"],
  },
  {
    topic: "culture_society",
    level: "intermediate",
    title: "Lunar New Year Street Parade",
    image: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=800",
    description: "A long red-and-gold dragon dances through a crowded street as drummers play and lanterns sway overhead.",
    requiredWords: ["dragon", "parade", "drums", "lanterns", "performers"],
    distractorWords: ["marsh", "refinery", "sawmill", "racetrack", "vineyard", "lighthouse", "scaffolding"],
  },
  {
    topic: "culture_society",
    level: "advanced",
    title: "Indigenous Ceremony in the Highlands",
    image: "https://images.unsplash.com/photo-1531986362435-16b427eb9c26?w=800",
    description: "Elders in traditional regalia perform a ritual around a fire as drumming echoes through highland mist.",
    requiredWords: ["ceremony", "elders", "ritual", "drumming", "ancestral", "regalia"],
    distractorWords: ["refinery", "racetrack", "observatory", "brickwork", "harbor", "lighthouse", "sawmill", "vineyard"],
  },

  // ─── 14. government_politics ───
  {
    topic: "government_politics",
    level: "beginner",
    title: "National Flag on a Public Building",
    image: "https://images.unsplash.com/photo-1551801841-ecad875d3a86?w=800",
    description: "A national flag waves on a tall pole in front of a white government building with stone columns.",
    requiredWords: ["flag", "building", "columns", "sky"],
    distractorWords: ["vineyard", "racetrack", "refinery", "scaffolding", "snowman", "drumkit"],
  },
  {
    topic: "government_politics",
    level: "intermediate",
    title: "Press Conference at the Capitol",
    image: "https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=800",
    description: "An official speaks from a wooden podium with a row of microphones, flanked by national flags and reporters.",
    requiredWords: ["podium", "microphones", "reporters", "official", "briefing"],
    distractorWords: ["warehouse", "racetrack", "marsh", "observatory", "vineyard", "scaffolding", "sawmill"],
  },
  {
    topic: "government_politics",
    level: "advanced",
    title: "Parliamentary Debate in Session",
    image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800",
    description: "Members of parliament sit in tiered benches inside an ornate chamber as a speaker addresses the floor.",
    requiredWords: ["parliament", "debate", "chamber", "speaker", "legislators", "deliberation"],
    distractorWords: ["refinery", "vineyard", "marsh", "brickwork", "lighthouse", "observatory", "sawmill", "harbor"],
  },

  // ─── 15. history_geography ───
  {
    topic: "history_geography",
    level: "beginner",
    title: "Old Temple in the Countryside",
    image: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800",
    description: "A small stone temple with a tiled roof stands surrounded by green fields and old trees.",
    requiredWords: ["temple", "countryside", "stone", "gate"],
    distractorWords: ["spaceship", "refinery", "racetrack", "scaffolding", "parade", "drumkit"],
  },
  {
    topic: "history_geography",
    level: "intermediate",
    title: "Cobblestone Street in a Medieval Town",
    image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800",
    description: "A narrow cobblestone alley winds between timbered houses, an old archway framing a fountain in the distance.",
    requiredWords: ["cobblestone", "alley", "archway", "timber", "fountain"],
    distractorWords: ["warehouse", "racetrack", "refinery", "observatory", "scaffolding", "vineyard", "smelter"],
  },
  {
    topic: "history_geography",
    level: "advanced",
    title: "Ruins of an Ancient Roman Forum",
    image: "https://images.unsplash.com/photo-1525874684015-58379d421a52?w=800",
    description: "Broken marble columns and weathered inscriptions stand in scattered rows among the ruins of an ancient forum.",
    requiredWords: ["ruins", "colonnade", "masonry", "antiquity", "inscription", "marble"],
    distractorWords: ["refinery", "locomotive", "vineyard", "brickwork", "harbor", "racetrack", "sawmill", "observatory"],
  },

  // ─── 16. sports_fitness ───
  {
    topic: "sports_fitness",
    level: "beginner",
    title: "Boy Kicking a Football in the Park",
    image: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800",
    description: "A boy in a red shirt kicks a football across grass toward a makeshift goal in a sunny park.",
    requiredWords: ["boy", "football", "park", "goal"],
    distractorWords: ["spaceship", "refinery", "observatory", "vineyard", "snowman", "lantern"],
  },
  {
    topic: "sports_fitness",
    level: "intermediate",
    title: "Yoga Class on the Beach",
    image: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800",
    description: "A row of students hold a balance pose on yoga mats on the sand as an instructor guides them at sunrise.",
    requiredWords: ["yoga", "instructor", "beach", "mat", "posture"],
    distractorWords: ["warehouse", "refinery", "racetrack", "scaffolding", "lantern", "vineyard", "sawmill"],
  },
  {
    topic: "sports_fitness",
    level: "advanced",
    title: "Marathon Runners Approaching the Finish Line",
    image: "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800",
    description: "Exhausted runners push forward through cheering spectators along the final stretch of a city marathon.",
    requiredWords: ["marathon", "endurance", "sprint", "spectators", "exhaustion", "finishline"],
    distractorWords: ["refinery", "vineyard", "brickwork", "observatory", "lighthouse", "sawmill", "harbor", "scaffolding"],
  },

  // ─── 17. arts_literature ───
  {
    topic: "arts_literature",
    level: "beginner",
    title: "Child Painting With Watercolors",
    image: "https://images.unsplash.com/photo-1607453998774-d533f65dac99?w=800",
    description: "A small child sits at a table with a brush and a palette of watercolors, painting on a sheet of paper.",
    requiredWords: ["child", "brush", "paint", "paper"],
    distractorWords: ["spaceship", "refinery", "vineyard", "scaffolding", "drumkit", "lantern"],
  },
  {
    topic: "arts_literature",
    level: "intermediate",
    title: "Art Student Sketching a Statue",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800",
    description: "An art student stands at an easel in a gallery, sketching a marble statue in charcoal under soft lighting.",
    requiredWords: ["easel", "sketchbook", "charcoal", "statue", "gallery"],
    distractorWords: ["warehouse", "marsh", "racetrack", "observatory", "scaffolding", "sawmill", "vineyard"],
  },
  {
    topic: "arts_literature",
    level: "advanced",
    title: "Renaissance Gallery in a Grand Museum",
    image: "https://images.unsplash.com/photo-1545987796-200677ee1011?w=800",
    description: "Visitors admire gilded Renaissance oil paintings hung along a vaulted gallery with a polished marble floor.",
    requiredWords: ["renaissance", "masterpiece", "oilpainting", "curator", "gilded", "baroque"],
    distractorWords: ["refinery", "vineyard", "marsh", "brickwork", "lighthouse", "observatory", "sawmill", "harbor"],
  },

  // ─── 18. religion_spirituality ───
  {
    topic: "religion_spirituality",
    level: "beginner",
    title: "Candles Lit at a Small Shrine",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800",
    description: "A row of small candles burns softly in front of a quiet roadside shrine decorated with fresh flowers.",
    requiredWords: ["candles", "shrine", "flowers", "peaceful"],
    distractorWords: ["spaceship", "refinery", "vineyard", "scaffolding", "drumkit", "racetrack"],
  },
  {
    topic: "religion_spirituality",
    level: "intermediate",
    title: "Monks Walking in Morning Mist",
    image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800",
    description: "A line of monks in saffron robes walks slowly along a path through cool morning mist beside a monastery wall.",
    requiredWords: ["monks", "robes", "mist", "monastery", "silence"],
    distractorWords: ["warehouse", "marsh", "racetrack", "observatory", "scaffolding", "sawmill", "vineyard"],
  },
  {
    topic: "religion_spirituality",
    level: "advanced",
    title: "Pilgrimage to a Sacred Mountain Summit",
    image: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800",
    description: "Devotees climb toward a remote temple at a mountain summit, prayer flags fluttering in the high wind.",
    requiredWords: ["pilgrimage", "summit", "devotees", "sanctuary", "ascension", "prayerflags"],
    distractorWords: ["refinery", "vineyard", "marsh", "brickwork", "lighthouse", "observatory", "sawmill", "harbor"],
  },

  // ─── 19. law_justice ───
  {
    topic: "law_justice",
    level: "beginner",
    title: "Police Officer Directing Traffic",
    image: "https://images.unsplash.com/photo-1453873531674-2151bcd01707?w=800",
    description: "A police officer in uniform stands in the middle of a busy intersection, signaling cars with a raised hand.",
    requiredWords: ["officer", "traffic", "uniform", "hand"],
    distractorWords: ["spaceship", "refinery", "vineyard", "scaffolding", "drumkit", "snowman"],
  },
  {
    topic: "law_justice",
    level: "intermediate",
    title: "Lawyer Reviewing Documents in Office",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800",
    description: "A lawyer in glasses sits at a wooden desk reading through stacks of legal files, a briefcase open beside her.",
    requiredWords: ["lawyer", "documents", "desk", "briefcase", "files"],
    distractorWords: ["warehouse", "marsh", "racetrack", "observatory", "scaffolding", "sawmill", "vineyard"],
  },
  {
    topic: "law_justice",
    level: "advanced",
    title: "Supreme Court Hearing in Session",
    image: "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=800",
    description: "Robed justices sit on a high bench above an advocate at a wooden lectern in a paneled courtroom.",
    requiredWords: ["justices", "gavel", "advocate", "jurisprudence", "robes", "deliberation"],
    distractorWords: ["refinery", "vineyard", "marsh", "brickwork", "lighthouse", "observatory", "sawmill", "harbor"],
  },

  // ─── 20. philosophy_ethics ───
  {
    topic: "philosophy_ethics",
    level: "beginner",
    title: "Old Man Thinking on a Park Bench",
    image: "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=800",
    description: "An elderly man with a cane sits alone on a park bench, looking thoughtfully into the distance.",
    requiredWords: ["man", "bench", "thinking", "park"],
    distractorWords: ["spaceship", "refinery", "vineyard", "scaffolding", "drumkit", "snowman"],
  },
  {
    topic: "philosophy_ethics",
    level: "intermediate",
    title: "Discussion at a Bookshop Reading",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800",
    description: "A small audience sits between bookshelves listening to an author discuss ideas, hands raised in question.",
    requiredWords: ["bookshop", "attendees", "speaker", "dialogue", "audience"],
    distractorWords: ["warehouse", "marsh", "racetrack", "observatory", "scaffolding", "sawmill", "vineyard"],
  },
  {
    topic: "philosophy_ethics",
    level: "advanced",
    title: "Symposium in a University Auditorium",
    image: "https://images.unsplash.com/photo-1576267423445-b2e0074d68a4?w=800",
    description: "Scholars take turns at a lectern in a packed auditorium, exchanging arguments on a published treatise.",
    requiredWords: ["symposium", "scholars", "lectern", "treatise", "discourse", "auditorium"],
    distractorWords: ["refinery", "vineyard", "marsh", "brickwork", "lighthouse", "observatory", "sawmill", "harbor"],
  },
];

function buildBody(entry) {
  const wc = WC[entry.level];
  return {
    title: entry.title,
    level: entry.level,
    topic: entry.topic,
    description: entry.description,
    image: entry.image,
    requiredWords: entry.requiredWords,
    distractorWords: entry.distractorWords,
    minWordCount: wc.min,
    maxWordCount: wc.max,
  };
}

async function run() {
  await CONNECT_DB();
  console.log(
    `Mode: ${FORCE ? "FORCE (allow duplicate titles)" : "DEDUPE by title"}`,
  );
  console.log(`Planning ${LESSONS.length} lessons.\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of LESSONS) {
    try {
      if (!FORCE) {
        const exists = await SeeWrite.exists({ title: entry.title });
        if (exists) {
          skipped++;
          console.log(`SKIP  [${entry.level}] ${entry.title}`);
          continue;
        }
      }
      const lesson = await createLesson(buildBody(entry));
      created++;
      console.log(`OK    [${entry.level}] ${entry.title} → ${lesson.id}`);
    } catch (err) {
      failed++;
      console.error(`FAIL  ${entry.title}: ${err.message}`);
    }
  }

  console.log(
    `\nSummary: created=${created}, skipped=${skipped}, failed=${failed}`,
  );
  // Give background enrichments a chance to finish before disconnecting.
  console.log("Waiting 15s for background Vocabulary enrichments...");
  await new Promise((r) => setTimeout(r, 15000));
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
