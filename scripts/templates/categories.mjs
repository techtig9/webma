// 30 categories, matching the requested list exactly. Each has real,
// category-specific vocabulary (not generic filler) and 3-4 variant
// profiles with genuinely different brand names, headline wording, and
// framing per variant — not the same sentence with a brand name swapped in.
const NAMES = {
  m: ["Jordan Lee", "Priya Shah", "Marcus Webb", "Alina Novak", "Theo Kwan", "Sofia Reyes", "Owen Clarke", "Nadia Farouk"],
};
let nameIdx = 0;
function reviewer() {
  const n = NAMES.m[nameIdx % NAMES.m.length];
  nameIdx++;
  return n;
}

export const CATEGORIES = [
  {
    category: "SaaS", industry: "saas", extraPage: "Pricing",
    vocab: [
      { title: "Workflow automation", body: "Cut repetitive work out of your team's day." },
      { title: "Real-time analytics", body: "Know what's working before your competitors do." },
      { title: "Team workspaces", body: "Give every team its own space without losing shared context." },
      { title: "API access", body: "Build on top of the platform, not around it." },
      { title: "Role-based permissions", body: "Control exactly who can see and change what." },
      { title: "Audit logs", body: "Every change tracked, every rollback one click away." },
      { title: "Custom integrations", body: "Connect the tools your team already relies on." },
      { title: "Enterprise-grade security", body: "SOC 2 Type II, SSO, and encryption at rest." },
    ],
    variants: [
      { brand: "Northstar", headline: "Run your whole operation from one clean dashboard.", sub: "Northstar replaces the spreadsheet, the sticky notes, and the six browser tabs your team juggles today." },
      { brand: "Fluxpoint", headline: "Ship faster without the thirteen-tool stack.", sub: "Fluxpoint gives fast-moving teams one place to plan, build, and ship." },
      { brand: "Basecamp Labs", headline: "The workspace that scales with you, not against you.", sub: "From your first ten customers to your first ten thousand, Basecamp Labs doesn't need to be replaced." },
      { brand: "Circuitry", headline: "Software your team actually enjoys using.", sub: "Circuitry is built for the people doing the work, not just the people buying the tool." },
    ],
  },
  {
    category: "Startup", industry: "startup", extraPage: "Pricing",
    vocab: [
      { title: "Fast onboarding", body: "New customers see value in their first five minutes." },
      { title: "Usage-based pricing", body: "Pay for what you use, scale as you grow." },
      { title: "Built-in collaboration", body: "Invite your whole team, no seat limits on the free tier." },
      { title: "Mobile-first", body: "A native experience on every device your team uses." },
      { title: "Open API", body: "Extend the product however your workflow needs." },
      { title: "24/7 support", body: "A real person, not a bot, within the hour." },
    ],
    variants: [
      { brand: "Launchpad", headline: "Ship your product before your competitors finish their roadmap meeting.", sub: "Launchpad gives your team one place to plan, build, and ship." },
      { brand: "Ember", headline: "Built by founders who were tired of the alternatives.", sub: "Ember is the tool we wished existed at our last three companies." },
      { brand: "Voyage", headline: "From idea to launch in weeks, not quarters.", sub: "Voyage strips away everything that isn't directly getting you to your first customer." },
      { brand: "Kindling", headline: "For the team of five that acts like fifty.", sub: "Kindling is built for the earliest, scrappiest stage of a company." },
    ],
  },
  {
    category: "Business", industry: "consulting", extraPage: "Services",
    vocab: [
      { title: "Strategy", body: "Market analysis, competitive positioning, and growth planning." },
      { title: "Operations", body: "Process redesign that actually survives contact with reality." },
      { title: "Change management", body: "Getting your team aligned behind the plan, not just informed of it." },
      { title: "Financial planning", body: "Budgets and forecasts leadership can actually trust." },
      { title: "Market entry", body: "Structured playbooks for entering a new region or segment." },
      { title: "Risk assessment", body: "Identify what could go wrong before it does." },
    ],
    variants: [
      { brand: "Meridian Consulting", headline: "Clarity for complex decisions.", sub: "Meridian helps mid-market leadership teams cut through noise and commit to a plan." },
      { brand: "Ashcroft & Partners", headline: "Decisions your board will actually stand behind.", sub: "Ashcroft brings rigor to the calls that are too important to get wrong." },
      { brand: "Vantage Group", headline: "The outside perspective your team is too close to see.", sub: "Vantage pairs senior operators with your leadership team, not just a slide deck." },
      { brand: "Kellerman Advisory", headline: "The plan gets written with you, not for you.", sub: "Kellerman embeds with leadership until the strategy is actually theirs." },
    ],
  },
  {
    category: "Agency", industry: "creative agency", extraPage: "Work",
    vocab: [
      { title: "Brand identity", body: "Full rebrand systems, from logo to voice." },
      { title: "Product design", body: "End-to-end UX for apps people actually enjoy using." },
      { title: "Campaign strategy", body: "Launch campaigns across print, digital, and social." },
      { title: "Web design", body: "Conversion-focused marketing sites built to last." },
      { title: "Motion & video", body: "Brand films, product demos, and social content." },
      { title: "Packaging", body: "Shelf-ready design systems for physical products." },
    ],
    variants: [
      { brand: "Northlight Studio", headline: "We build brands people actually remember.", sub: "Northlight partners with ambitious founders to design identities, products, and campaigns that don't blend in." },
      { brand: "Halo Creative", headline: "Design that does more than look good.", sub: "Halo ties every creative decision back to a business outcome." },
      { brand: "Foundry & Co", headline: "Small studio, senior team, no handoffs.", sub: "The people who pitch your project are the people who ship it." },
      { brand: "Cast Iron Studio", headline: "Bold work for brands that refuse to play it safe.", sub: "Cast Iron takes on a handful of clients at a time, on purpose." },
    ],
  },
  {
    category: "Portfolio", industry: "design", extraPage: "About",
    vocab: [
      { title: "Product design", body: "Onboarding, dashboards, and end-to-end flows." },
      { title: "Design systems", body: "Component libraries adopted across whole product teams." },
      { title: "Mobile apps", body: "0 to 1 design for iOS and Android products." },
      { title: "Brand & identity", body: "Logo, type, and visual systems." },
      { title: "UX research", body: "User interviews and usability testing that actually change roadmaps." },
    ],
    variants: [
      { brand: "Ava Cole", headline: "I design software that feels obvious in hindsight.", sub: "Freelance product design for startups and design teams who want a second, senior set of eyes." },
      { brand: "Kai Osei", headline: "Interfaces that get out of the user's way.", sub: "Ten years designing for early-stage startups, most recently as a founding designer at two YC companies." },
      { brand: "Mira Studio", headline: "Design work, not design theater.", sub: "Mira Studio ships fast, tests with real users, and iterates in public." },
      { brand: "Field Design Co", headline: "A portfolio of shipped work, not concepts.", sub: "Every project here went live — nothing is a mockup." },
    ],
  },
  {
    category: "Personal", industry: "personal brand", extraPage: "About",
    vocab: [
      { title: "Writing", body: "Essays and long-form pieces on the craft." },
      { title: "Speaking", body: "Available for conferences, podcasts, and panels." },
      { title: "Consulting", body: "Limited one-on-one advisory slots each quarter." },
      { title: "Newsletter", body: "A monthly note to a few thousand thoughtful readers." },
    ],
    variants: [
      { brand: "Jordan Ellis", headline: "Thinking in public, one essay at a time.", sub: "Notes on building, writing, and the occasional bad decision that worked out." },
      { brand: "Sam Okafor", headline: "Fifteen years in, still figuring it out.", sub: "A personal site for talks, writing, and the projects worth mentioning." },
      { brand: "Priya Malhotra", headline: "Building in public, mistakes included.", sub: "A running log of what's working, what isn't, and what changed my mind this year." },
    ],
  },
  {
    category: "Restaurant", industry: "restaurant", extraPage: "Menu",
    vocab: [
      { title: "Wood-fired trout", body: "Brown butter, capers, charred lemon.", price: "$28" },
      { title: "Charred sourdough", body: "Cultured butter, sea salt, rosemary oil.", price: "$9" },
      { title: "Roasted squash", body: "Whipped feta, pepitas, chili honey.", price: "$16" },
      { title: "Dry-aged ribeye", body: "Bone marrow butter, market greens.", price: "$46" },
      { title: "House pappardelle", body: "Braised short rib ragu, pecorino.", price: "$24" },
      { title: "Olive oil cake", body: "Citrus, mascarpone, toasted almond.", price: "$11" },
    ],
    variants: [
      { brand: "Ember & Oak", headline: "Dinner worth planning your week around.", sub: "A wood-fired kitchen serving seasonal plates built around whatever's best at the market." },
      { brand: "Salt & Vine", headline: "Simple ingredients, taken seriously.", sub: "A neighborhood table for people who care where dinner comes from." },
      { brand: "The Copper Pot", headline: "Comfort food, uncompromised.", sub: "Family recipes, updated for a Tuesday night out." },
      { brand: "Marrow", headline: "A short menu, done exactly right.", sub: "Marrow changes eight dishes a week — nothing sits on the menu out of habit." },
    ],
  },
  {
    category: "Hotel", industry: "hospitality", extraPage: "Rooms",
    vocab: [
      { title: "Deluxe King", body: "480 sqft, city view, walk-in shower.", price: "$220/night" },
      { title: "Garden Suite", body: "620 sqft, private terrace, soaking tub.", price: "$340/night" },
      { title: "Standard Queen", body: "320 sqft, courtyard view.", price: "$165/night" },
      { title: "Penthouse", body: "980 sqft, full kitchen, rooftop access.", price: "$620/night" },
    ],
    variants: [
      { brand: "The Marlowe", headline: "A quiet corner of the city, done right.", sub: "The Marlowe is 42 rooms, a rooftop bar, and no detail left to chance." },
      { brand: "Harbor House Inn", headline: "Wake up two minutes from the water.", sub: "A boutique inn built for people who'd rather explore than sightsee." },
      { brand: "Birchwood Lodge", headline: "Mountain air, hotel comfort.", sub: "Birchwood pairs alpine views with a bed you won't want to leave." },
      { brand: "The Ellery", headline: "A hotel that feels like someone's apartment, if they had great taste.", sub: "Twenty-two rooms, one concierge, no corporate feel." },
    ],
  },
  {
    category: "Travel", industry: "travel", extraPage: "Destinations",
    vocab: [
      { title: "Northern Portugal, 8 days", body: "Porto, the Douro Valley, and the Atlantic coast.", price: "from $2,400" },
      { title: "Japan in Spring, 11 days", body: "Tokyo, Kyoto, and the Nakasendo trail.", price: "from $3,800" },
      { title: "Peru Highlands, 9 days", body: "Cusco, the Sacred Valley, and Machu Picchu.", price: "from $2,950" },
      { title: "Morocco Overland, 10 days", body: "Marrakech, the Atlas Mountains, and the Sahara.", price: "from $2,600" },
    ],
    variants: [
      { brand: "Wanderlust Tours", headline: "Travel with people you'll actually want to eat dinner with.", sub: "Small-group trips built around real local access — no giant tour buses." },
      { brand: "Farflung Collective", headline: "The trip you'd plan yourself, if you had the time.", sub: "Farflung handles the logistics; you handle showing up." },
      { brand: "Compass & Co", headline: "Slow travel, done properly.", sub: "Fewer stops, more time in each one." },
      { brand: "Meridian Journeys", headline: "Trips planned by people who've actually been there.", sub: "Every itinerary is built and tested by a Meridian guide first." },
    ],
  },
  {
    category: "Education", industry: "education", extraPage: "Courses",
    vocab: [
      { title: "Intro to UX Design, 6 weeks", body: "From research to a portfolio-ready case study.", price: "$650" },
      { title: "Data Analysis with Python, 8 weeks", body: "Real datasets, real stakeholders, real deadlines.", price: "$780" },
      { title: "Product Management 101, 5 weeks", body: "Ship a feature spec from problem to roadmap.", price: "$540" },
      { title: "Copywriting for Startups, 4 weeks", body: "Write landing pages that actually convert.", price: "$390" },
    ],
    variants: [
      { brand: "Campus Academy", headline: "Learn the skill, not just the theory.", sub: "Small, instructor-led cohorts built around real projects, not another unfinished video course." },
      { brand: "Foundry School", headline: "Taught by people who still do the job.", sub: "Every instructor at Foundry works in the field they teach." },
      { brand: "Northbridge Learning", headline: "Cohorts small enough that you'll actually get feedback.", sub: "Eighteen students, one instructor, real accountability." },
      { brand: "Anvil Academy", headline: "Skills you can put on a resume in six weeks.", sub: "Anvil is built for career-changers who don't have a year to spare." },
    ],
  },
  {
    category: "Healthcare", industry: "healthcare", extraPage: "Services",
    vocab: [
      { title: "Annual physicals", body: "Thorough checkups with same-week scheduling." },
      { title: "Chronic care management", body: "Ongoing support for diabetes, hypertension, and more." },
      { title: "Pediatric care", body: "From newborn checkups through adolescence." },
      { title: "Same-day sick visits", body: "Reserved slots held open every weekday." },
      { title: "Lab & diagnostics", body: "On-site bloodwork with results in 24–48 hours." },
      { title: "Telehealth", body: "Virtual visits for follow-ups and minor concerns." },
    ],
    variants: [
      { brand: "Wellpoint Family Clinic", headline: "Family medicine that actually has time for you.", sub: "Wellpoint keeps panel sizes small so every visit gets a full 30 minutes." },
      { brand: "Riverside Health Partners", headline: "Primary care, without the three-week wait.", sub: "Riverside holds same-week appointments open for exactly this reason." },
      { brand: "Clearview Medical", headline: "Care that follows you, not just your chart.", sub: "One care team, coordinated, from your first visit onward." },
      { brand: "Harborview Clinic", headline: "The doctor's office that returns your calls.", sub: "Harborview built its whole practice around actually being reachable." },
    ],
  },
  {
    category: "Fitness", industry: "fitness", extraPage: "Classes",
    vocab: [
      { title: "Strength Fundamentals", body: "Mon/Wed/Fri, 6:00am & 5:30pm — squat, press, pull." },
      { title: "Conditioning", body: "Tue/Thu, 6:00am & 6:00pm — high-intensity intervals." },
      { title: "Open Gym", body: "Daily, 10:00am – 8:00pm — self-directed training." },
      { title: "Mobility & Recovery", body: "Sat, 9:00am — guided mobility work." },
    ],
    variants: [
      { brand: "Forge Fitness", headline: "Train like the plan actually matters.", sub: "Forge runs coached strength and conditioning classes — real programming, real coaching." },
      { brand: "Iron & Oak Gym", headline: "No mirrors, no ego, just work.", sub: "A gym built for people who want to get stronger, not seen." },
      { brand: "Pulse Studio", headline: "Forty-five minutes, every time, no wasted reps.", sub: "Pulse classes are programmed by coaches, not algorithms." },
      { brand: "Anchor Athletics", headline: "Strength training for people who aren't twenty-five anymore.", sub: "Anchor programs around real joints and real schedules." },
    ],
  },
  {
    category: "Real Estate", industry: "real estate", extraPage: "Listings",
    vocab: [
      { title: "142 Birchwood Ave", body: "4 bed · 3 bath · 2,400 sqft — updated kitchen, private yard.", price: "$875,000" },
      { title: "88 Harbor View Loft", body: "2 bed · 2 bath · 1,300 sqft — floor-to-ceiling windows.", price: "$612,000" },
      { title: "27 Meridian Court", body: "5 bed · 4 bath · 3,600 sqft — corner lot, finished basement.", price: "$1,240,000" },
      { title: "9 Willow Lane", body: "3 bed · 2 bath · 1,850 sqft — move-in ready, quiet street.", price: "$540,000" },
    ],
    variants: [
      { brand: "Skyline Realty", headline: "Find a place that actually fits your life.", sub: "Skyline represents buyers and sellers across the metro's most sought-after neighborhoods." },
      { brand: "Cornerstone Properties", headline: "Real estate, without the sales pitch.", sub: "Cornerstone agents get paid the same either way — so the advice is actually straight." },
      { brand: "Bluffview Realty Group", headline: "Local knowledge, twenty years deep.", sub: "Bluffview has closed more listings in this metro than any other independent brokerage." },
      { brand: "Amber Hill Properties", headline: "Buying or selling, one agent through the whole thing.", sub: "Amber Hill never hands you off partway through." },
    ],
  },
  {
    category: "Finance", industry: "financial services", extraPage: "Services",
    vocab: [
      { title: "Retirement planning", body: "Model your timeline, not just your balance." },
      { title: "Tax strategy", body: "Proactive planning, not just April filing." },
      { title: "Investment management", body: "Portfolios built around your actual risk tolerance." },
      { title: "Estate planning", body: "Coordinated with your attorney, not separate from it." },
      { title: "Business advisory", body: "Cash flow and growth planning for owners." },
    ],
    variants: [
      { brand: "Ledger & Stone", headline: "Financial advice that fits on one page.", sub: "Ledger & Stone builds plans clients actually understand and follow." },
      { brand: "Cascade Wealth Partners", headline: "Planning for the decade, not the quarter.", sub: "Cascade is built for people who want a plan, not a stock tip." },
      { brand: "Anchor Financial Group", headline: "A second opinion on the decisions that matter.", sub: "Fee-only advice, no products to sell you." },
      { brand: "Birchgate Capital", headline: "Wealth planning that starts with your actual goals.", sub: "Birchgate builds the plan around your life, not a model portfolio." },
    ],
  },
  {
    category: "Legal", industry: "legal services", extraPage: "Services",
    vocab: [
      { title: "Corporate law", body: "Formation, contracts, and governance." },
      { title: "Litigation", body: "Civil disputes handled with a trial-ready posture." },
      { title: "Estate planning", body: "Wills, trusts, and succession planning." },
      { title: "Contract review", body: "Clear terms before you sign anything." },
      { title: "Employment law", body: "Policy review and workplace dispute resolution." },
      { title: "Real estate law", body: "Closings, leases, and title review." },
    ],
    variants: [
      { brand: "Whitfield & Cross", headline: "Straight answers before you're in trouble, not after.", sub: "Whitfield & Cross specializes in the contracts and disputes that actually come up for growing businesses." },
      { brand: "Sterling Law Group", headline: "Counsel that picks up the phone.", sub: "Sterling keeps caseloads small enough that clients actually reach their attorney." },
      { brand: "Harlow Legal", headline: "Plain-language advice, not legal jargon.", sub: "Harlow explains every option in terms you can actually act on." },
      { brand: "Prescott & Marsh", headline: "Litigation counsel that prepares for trial from day one.", sub: "Prescott & Marsh never negotiates from a position they haven't fully built." },
    ],
  },
  {
    category: "Technology", industry: "technology", extraPage: "Services",
    vocab: [
      { title: "Custom software", body: "Built for your process, not a generic template." },
      { title: "Cloud infrastructure", body: "Scalable systems that don't page you at 3am." },
      { title: "Systems integration", body: "Connect the tools you already run." },
      { title: "IT consulting", body: "A technology roadmap tied to real business goals." },
      { title: "Cybersecurity audits", body: "Find the gaps before someone else does." },
    ],
    variants: [
      { brand: "Vector Technologies", headline: "Engineering that ships, not just plans.", sub: "Vector builds and maintains the systems mid-market companies actually run on." },
      { brand: "Latticework", headline: "Infrastructure that scales quietly.", sub: "Latticework's clients notice their systems only when they don't have to think about them." },
      { brand: "Beacon IT Partners", headline: "The IT team you don't have to manage yourself.", sub: "Beacon acts as your technology department, not just a vendor." },
      { brand: "Ampfield Systems", headline: "Software that fits how your team already works.", sub: "Ampfield builds around your process instead of asking you to change it." },
    ],
  },
  {
    category: "Ecommerce", industry: "retail", extraPage: "Shop",
    vocab: [
      { title: "The Everyday Tee", body: "Heavyweight organic cotton, boxy fit.", price: "$48" },
      { title: "Field Jacket", body: "Waxed cotton canvas, brass hardware.", price: "$228" },
      { title: "Wide-Leg Trouser", body: "Mid-weight wool blend, drapes clean.", price: "$138" },
      { title: "Merino Crewneck", body: "Fine-gauge merino, naturally odor-resistant.", price: "$118" },
      { title: "Canvas Tote", body: "Heavyweight canvas, leather straps.", price: "$58" },
    ],
    variants: [
      { brand: "Loomwear", headline: "Clothes built to be worn for a decade, not a season.", sub: "A small number of essentials from natural fibers, produced in limited runs." },
      { brand: "Northfield Goods", headline: "Well-made basics, honestly priced.", sub: "No middleman markup — just the materials and the craft." },
      { brand: "Harbor Supply Co", headline: "Fewer things, made better.", sub: "A tight, seasonal collection instead of a thousand SKUs." },
      { brand: "Fernway Goods", headline: "Everyday objects, actually built to last.", sub: "Fernway sources materials first, then designs around what they can do." },
    ],
  },
  {
    category: "Fashion", industry: "fashion", extraPage: "Collection",
    vocab: [
      { title: "Tailored Blazer", body: "Structured shoulder, Italian wool.", price: "$340" },
      { title: "Silk Slip Dress", body: "Bias-cut, hand-finished hem.", price: "$260" },
      { title: "Leather Ankle Boot", body: "Full-grain leather, stacked heel.", price: "$310" },
      { title: "Cashmere Scarf", body: "Two-ply cashmere, hand-rolled edge.", price: "$140" },
    ],
    variants: [
      { brand: "Maison Verre", headline: "Considered pieces, not seasonal noise.", sub: "Maison Verre designs a small collection twice a year — nothing rushed, nothing disposable." },
      { brand: "Rowe Atelier", headline: "Tailoring for a body that actually moves.", sub: "Rowe cuts every piece to be worn, not just photographed." },
      { brand: "Solstice Studio", headline: "Color and cut, without the trend cycle.", sub: "Solstice designs for a decade of wear, not a season of likes." },
    ],
  },
  {
    category: "Beauty", industry: "beauty", extraPage: "Services",
    vocab: [
      { title: "Signature facial", body: "60 minutes, tailored to your skin.", price: "$120" },
      { title: "Balayage & color", body: "Hand-painted color, gloss finish.", price: "$210" },
      { title: "Precision haircut", body: "Consultation included.", price: "$85" },
      { title: "Gel manicure", body: "Two-week wear, no chips.", price: "$45" },
      { title: "Brow shaping & tint", body: "Wax or thread, your choice.", price: "$35" },
    ],
    variants: [
      { brand: "Willow & Co Salon", headline: "An hour that's actually about you.", sub: "Willow & Co keeps appointments unhurried, on purpose." },
      { brand: "Studio Lumen", headline: "Skincare that starts with a real consultation.", sub: "Studio Lumen builds every treatment around your skin, not a menu item." },
      { brand: "The Powder Room", headline: "Beauty, without the upsell.", sub: "Honest recommendations from people who actually use the products." },
    ],
  },
  {
    category: "Photography", industry: "photography", extraPage: "Portfolio",
    vocab: [
      { title: "Wedding coverage", body: "Full-day, two shooters, online gallery." },
      { title: "Portrait sessions", body: "Studio or on-location, 60-90 minutes." },
      { title: "Brand photography", body: "Product and lifestyle shoots for growing brands." },
      { title: "Event coverage", body: "Corporate events, launches, and conferences." },
    ],
    variants: [
      { brand: "Lena Marsh Photography", headline: "Photos you'll actually want to print.", sub: "Documentary-style coverage that doesn't feel staged." },
      { brand: "Silver Frame Studio", headline: "Light, composition, and nothing forced.", sub: "A decade shooting weddings and portraits across the coast." },
      { brand: "Field & Focus", headline: "Real moments, not posed ones.", sub: "Field & Focus specializes in coverage that looks like it wasn't planned — even though it was." },
    ],
  },
  {
    category: "Architecture", industry: "architecture", extraPage: "Work",
    vocab: [
      { title: "Residential design", body: "New builds and full-home renovations." },
      { title: "Commercial projects", body: "Retail, office, and mixed-use developments." },
      { title: "Interior architecture", body: "Space planning integrated from the ground up." },
      { title: "Sustainable design", body: "Passive-house and net-zero project experience." },
    ],
    variants: [
      { brand: "Holt Architecture", headline: "Buildings that respond to how people actually live.", sub: "Holt designs from the inside out — function first, form following closely behind." },
      { brand: "Greystone Studio", headline: "Modern forms, grounded materials.", sub: "Greystone's work reads as calm, not loud." },
      { brand: "Linea Design Office", headline: "Light, proportion, and restraint.", sub: "Linea's projects favor a few right decisions over a hundred small ones." },
    ],
  },
  {
    category: "Construction", industry: "construction", extraPage: "Services",
    vocab: [
      { title: "General contracting", body: "Full project management, single point of contact." },
      { title: "Custom home builds", body: "Ground-up construction, on schedule." },
      { title: "Renovations", body: "Kitchens, additions, and whole-home remodels." },
      { title: "Commercial buildouts", body: "Tenant improvements and ground-up commercial." },
    ],
    variants: [
      { brand: "Ironclad Builders", headline: "Built right, on the schedule we gave you.", sub: "Ironclad has never missed a completion date by more than a week." },
      { brand: "Redwood Construction Co", headline: "One contractor, zero excuses.", sub: "Redwood manages every trade so you don't have to." },
      { brand: "Granite State Builders", headline: "Craftsmanship that outlasts the warranty.", sub: "Three generations building in this county." },
    ],
  },
  {
    category: "Consulting", industry: "consulting", extraPage: "Services",
    vocab: [
      { title: "Operational efficiency", body: "Find the bottlenecks costing you the most." },
      { title: "Growth strategy", body: "A realistic plan for the next 18 months." },
      { title: "Organizational design", body: "Structure that matches how the company actually works." },
      { title: "Interim leadership", body: "Senior operators, embedded, on a defined term." },
    ],
    variants: [
      { brand: "Alden Advisory", headline: "The plan you'll actually execute.", sub: "Alden builds strategy with the team that has to run it, not around them." },
      { brand: "Greenline Consulting", headline: "Fewer slides, more results.", sub: "Greenline measures success in what changed, not what was presented." },
      { brand: "Keystone Partners", headline: "An outside view your team can trust.", sub: "Keystone pairs deep industry experience with zero internal politics." },
      { brand: "Bellcrest Advisory", headline: "Consulting that ends with your team able to run it alone.", sub: "Bellcrest measures success by how little you need them next year." },
    ],
  },
  {
    category: "Freelancer", industry: "freelance", extraPage: "Work",
    vocab: [
      { title: "Web development", body: "Fast, accessible sites built to last." },
      { title: "Copywriting", body: "Landing pages and email that actually convert." },
      { title: "Brand strategy", body: "Positioning that makes the rest of marketing easier." },
      { title: "Consulting sprints", body: "One-week focused engagements on a specific problem." },
    ],
    variants: [
      { brand: "Devon Marsh", headline: "Freelance developer, ex-agency, direct with you.", sub: "No account manager between us — just the work." },
      { brand: "Riley Chen", headline: "I write words that make people click.", sub: "Freelance copywriting for startups who need their landing page to actually work." },
      { brand: "Noor Aziz", headline: "Strategy and execution, from one person.", sub: "Independent consultant for brands that need senior thinking without agency overhead." },
    ],
  },
  {
    category: "Creative", industry: "creative", extraPage: "Work",
    vocab: [
      { title: "Art direction", body: "Visual systems for campaigns and launches." },
      { title: "Illustration", body: "Custom illustration for editorial and brand work." },
      { title: "Motion design", body: "Animation for product, brand, and social." },
      { title: "Set design", body: "Physical and styled sets for photo and video." },
    ],
    variants: [
      { brand: "Paper Moon Studio", headline: "Ideas, made physical.", sub: "Paper Moon works across illustration, set design, and art direction." },
      { brand: "Static Collective", headline: "A small group of people who make things well.", sub: "Static takes on projects across disciplines, on purpose." },
      { brand: "Glasswing Creative", headline: "Craft first, trend second.", sub: "Glasswing's work is built to hold up past this year's aesthetic." },
    ],
  },
  {
    category: "Landing Page", industry: "product launch", extraPage: "Pricing",
    vocab: [
      { title: "One clear promise", body: "A single, sharp value proposition above the fold." },
      { title: "Social proof", body: "Real numbers, real logos, real quotes." },
      { title: "Simple pricing", body: "No confusing tiers, no hidden fees." },
      { title: "Fast load times", body: "Every second of delay costs conversions." },
    ],
    variants: [
      { brand: "Orbit", headline: "The waitlist that actually converts.", sub: "Join 4,000+ people getting early access to Orbit." },
      { brand: "Pulseline", headline: "One page. One decision. Zero friction.", sub: "Everything a visitor needs to say yes, nothing they don't." },
      { brand: "Beacon Launch", headline: "Ship your launch page in an afternoon.", sub: "Built for the announcement, not the whole website." },
    ],
  },
  {
    category: "Events", industry: "events", extraPage: "Schedule",
    vocab: [
      { title: "Opening keynote", body: "9:00am — main stage." },
      { title: "Workshop track", body: "11:00am–3:00pm — hands-on sessions." },
      { title: "Networking reception", body: "6:00pm — rooftop terrace." },
      { title: "Closing panel", body: "4:00pm — main stage." },
    ],
    variants: [
      { brand: "Summit Conference", headline: "Three days, one focused conversation.", sub: "Summit brings 800 operators together for talks that actually change how they work." },
      { brand: "Gather Festival", headline: "A weekend built around real connection.", sub: "Fewer sessions, more time to actually talk to people." },
      { brand: "The Assembly", headline: "The event people plan their year around.", sub: "The Assembly has sold out five years running." },
    ],
  },
  {
    category: "Blog", industry: "publishing", extraPage: "Archive",
    vocab: [
      { title: "On slow growth", body: "Why the compounding path beats the shortcut." },
      { title: "Notes from the field", body: "What actually happened this quarter." },
      { title: "A framework for decisions", body: "The four questions worth asking first." },
      { title: "Reading list", body: "What's been worth the time lately." },
    ],
    variants: [
      { brand: "The Long Game", headline: "Writing on building things that last.", sub: "Essays on strategy, craft, and the slow parts nobody posts about." },
      { brand: "Field Notes", headline: "Observations from actually doing the work.", sub: "Less advice, more what happened and why." },
      { brand: "Marginalia", headline: "Ideas worth sitting with.", sub: "A weekly essay on the questions everyone skips past." },
    ],
  },
  {
    category: "News", industry: "media", extraPage: "Sections",
    vocab: [
      { title: "Local coverage", body: "Reporting on the stories national outlets skip." },
      { title: "Investigations", body: "Long-form reporting, months in the making." },
      { title: "Daily briefing", body: "The five things worth knowing this morning." },
      { title: "Opinion", body: "Perspective from writers who know the beat." },
    ],
    variants: [
      { brand: "The Daily Ledger", headline: "Local news, actually reported.", sub: "The Daily Ledger covers this city like a beat, not a headline generator." },
      { brand: "Harbor Post", headline: "Reporting worth paying for.", sub: "Independent, subscriber-funded, no algorithm deciding what you see." },
      { brand: "The Current", headline: "What's actually happening, explained clearly.", sub: "The Current cuts through the noise with reporting, not takes." },
    ],
  },
  {
    category: "Community", industry: "community", extraPage: "Events",
    vocab: [
      { title: "Weekly meetups", body: "Every Thursday, open to all members." },
      { title: "Mentorship program", body: "Paired mentorship across experience levels." },
      { title: "Member directory", body: "Find and connect with people in your field." },
      { title: "Resource library", body: "Guides, templates, and recordings from past sessions." },
    ],
    variants: [
      { brand: "The Guild", headline: "A community for people who take the craft seriously.", sub: "The Guild is 2,000 members deep, and still invite-only for a reason." },
      { brand: "Basecamp Circle", headline: "Find your people, not just your feed.", sub: "Real conversations, not another group chat that goes quiet." },
      { brand: "The Roundtable", headline: "Peers who'll actually tell you the truth.", sub: "A small, curated group meeting monthly, in person and online." },
    ],
  },
];
